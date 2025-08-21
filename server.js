require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// AI-powered document parsing endpoint
app.post('/api/parse-with-ai', upload.single('document'), async (req, res) => {
  try {
    if (!req.file && !req.body.content) {
      return res.status(400).json({ error: 'No document provided' });
    }

    let content = req.body.content;
    
    if (req.file) {
      // Extract text from uploaded file
      content = await extractTextFromFile(req.file);
    }

    // Parse with AI using Groq
    const aiParsedContent = await parseContentWithAI(content);
    
    res.json({
      success: true,
      data: aiParsedContent,
      source: 'ai'
    });

  } catch (error) {
    console.error('AI parsing failed:', error);
    
    // Fallback to rule-based parsing
    try {
      const fallbackContent = await parseContentWithRules(content || req.body.content || '');
      res.json({
        success: true,
        data: fallbackContent,
        source: 'fallback',
        warning: 'AI parsing failed, using rule-based fallback'
      });
    } catch (fallbackError) {
      console.error('Fallback parsing also failed:', fallbackError);
      res.status(500).json({ 
        error: 'Both AI and fallback parsing failed',
        details: fallbackError.message 
      });
    }
  }
});

// URL fetching endpoint (server-side to avoid CORS)
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Handle Google Docs URLs
    let fetchUrl = url;
    if (url.includes('docs.google.com') && url.includes('/edit')) {
      // Convert Google Docs edit URL to export URL
      const docId = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (docId) {
        fetchUrl = `https://docs.google.com/document/d/${docId[1]}/export?format=txt`;
      }
    }

    const fetchedContent = await fetchDocumentFromUrl(fetchUrl);
    res.json({
      success: true,
      data: fetchedContent
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch document from URL. For Google Docs, make sure the document is publicly accessible.',
      details: error.message 
    });
  }
});

/**
 * Parse content using Groq AI with llama-3.1-70b-versatile model
 */
async function parseContentWithAI(content) {
  const prompt = `
You are a professional content parser specialized in converting documents to HTML with Space-O Technologies blog format.

Parse the following document and convert it to structured HTML with these requirements:

1. IMPORTANT - Identify main sections/headings and convert them to H2 tags with proper IDs:
   <h2 id="section-name">Section Title</h2>
   
2. ALWAYS generate Table of Contents (TOC) using ONLY H2 headings:
   <div class="blog_index_cover">
     <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
     <ol class="blog_index">
       <li><a href="#section-name">Section Title</a></li>
     </ol>
   </div>

3. Create Key Takeaways section if relevant:
   <ul class="kta-list">
     <p>Key Takeaways</p>
     <li>Takeaway point</li>
   </ul>

4. Convert bullet points to Space-O format:
   <ul class="bullet-new-box">
     <li>Bullet point</li>
   </ul>

5. Convert numbered lists to:
   <ol class="listing-bx">
     <li><h3>Step Title</h3><p>Description</p></li>
   </ol>

6. Use H3 for sub-sections within H2 sections
7. Generate IDs for all H2 tags using lowercase, hyphens, no special characters
8. Preserve any tables, links, and formatting

Document content:
${content}

Return only clean, valid HTML following the Space-O Technologies format.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama-3.1-70b-versatile',
    temperature: 0.1,
    max_tokens: 4000
  });

  const htmlContent = completion.choices[0]?.message?.content;
  
  if (!htmlContent) {
    throw new Error('AI did not return valid content');
  }

  return {
    html: htmlContent.trim(),
    structure: analyzeHTMLStructure(htmlContent),
    metadata: {
      model: 'llama-3.1-70b-versatile',
      tokens: completion.usage?.total_tokens || 0,
      processingTime: Date.now()
    }
  };
}

/**
 * Rule-based parsing fallback
 */
async function parseContentWithRules(content) {
  // Basic rule-based parsing logic
  let html = '';
  const lines = content.split('\n').filter(line => line.trim());
  const structure = {
    headings: [],
    paragraphs: [],
    lists: []
  };

  let inList = false;
  let currentListType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    // Detect headings
    if (isHeading(line)) {
      if (inList) {
        html += closeList(currentListType);
        inList = false;
      }
      
      const level = getHeadingLevel(line);
      const text = cleanHeadingText(line);
      const id = generateId(text);
      
      html += `<h${level} id="${id}">${text}</h${level}>\n`;
      structure.headings.push({ level, text, id });
    }
    
    // Detect lists
    else if (isListItem(line)) {
      const listType = getListType(line);
      const itemText = cleanListItem(line);
      
      if (!inList || currentListType !== listType) {
        if (inList) html += closeList(currentListType);
        html += openList(listType);
        inList = true;
        currentListType = listType;
      }
      
      html += `  <li>${itemText}</li>\n`;
    }
    
    // Regular paragraphs
    else {
      if (inList) {
        html += closeList(currentListType);
        inList = false;
      }
      html += `<p>${line}</p>\n`;
      structure.paragraphs.push({ text: line });
    }
  }

  if (inList) {
    html += closeList(currentListType);
  }

  // Generate TOC from H2 headings only
  const h2Headings = structure.headings.filter(h => h.level === 2);
  if (h2Headings.length > 0) {
    const toc = generateTableOfContents(h2Headings);
    html = toc + '\n' + html;
  }

  return {
    html: html,
    structure: structure,
    metadata: {
      source: 'rule-based',
      processingTime: Date.now()
    }
  };
}

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(file) {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  switch (fileExtension) {
    case '.txt':
      return file.buffer.toString('utf8');
    
    case '.md':
      return file.buffer.toString('utf8');
    
    case '.docx':
      const mammoth = require('mammoth');
      // Use convertToHtml to preserve table structure instead of extractRawText
      const result = await mammoth.convertToHtml({ buffer: file.buffer });
      
      // Convert HTML to plain text but preserve table structure using markdown-like format
      const htmlContent = result.value;
      
      // Parse HTML and convert tables to markdown format that our parser can handle
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Convert HTML tables to pipe-separated format
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        let tableMarkdown = '\n';
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
          tableMarkdown += '| ' + cellTexts.join(' | ') + ' |\n';
          
          // Add separator after header row
          if (index === 0 && rows.length > 1) {
            const separator = '|' + cellTexts.map(() => ' --- ').join('|') + '|\n';
            tableMarkdown += separator;
          }
        });
        
        // Replace the table element with markdown text
        table.outerHTML = tableMarkdown;
      });
      
      // Extract final text content
      return document.body.textContent || document.textContent || '';
    
    case '.html':
      return file.buffer.toString('utf8');
    
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

/**
 * Fetch document from URL
 */
async function fetchDocumentFromUrl(url) {
  const https = require('https');
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          content: data,
          contentType: res.headers['content-type'] || 'text/plain',
          url: url
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Helper functions for rule-based parsing
function isHeading(line) {
  // Check for various heading patterns
  const patterns = [
    // All caps (traditional heading style)
    line.length > 3 && line === line.toUpperCase() && /^[A-Z\s\d\-\.,!?]+$/.test(line),
    
    // Numbered headings (1. Introduction, 2.1 Overview, etc.)
    /^\d+(\.\d+)*\.?\s+[A-Z][^.]*$/.test(line),
    
    // Questions as headings
    line.endsWith('?') && line.length > 10 && line.charAt(0) === line.charAt(0).toUpperCase(),
    
    // Title case headings (starts with capital, reasonable length)
    /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*(\s+[a-z]+)*[^.]*$/.test(line) && line.length > 5 && line.length < 100,
    
    // Mixed case but structured headings
    /^[A-Z][^.]*[^.]$/.test(line) && line.split(' ').length >= 2 && line.split(' ').length <= 15,
    
    // Headings with colons
    /^[A-Z][^:]*:$/.test(line)
  ];
  
  return patterns.some(pattern => pattern);
}

function getHeadingLevel(line) {
  // Main numbered sections (1. 2. 3.) -> H2 for TOC
  if (line.match(/^\d+\.\s+/)) return 2;
  
  // Sub-sections (1.1, 2.1) -> H3
  if (line.match(/^\d+\.\d+/)) return 3;
  
  // All caps long headings -> H1 (main title)
  if (line.length > 20 && line === line.toUpperCase()) return 1;
  
  // Questions -> H3 (sub-sections)
  if (line.endsWith('?')) return 3;
  
  // Headings with colons (usually section introductions) -> H2
  if (line.endsWith(':')) return 2;
  
  // Default to H2 for TOC inclusion (main sections)
  return 2;
}

function cleanHeadingText(line) {
  return line.replace(/^\d+\.\s+/, '').trim();
}

function isListItem(line) {
  return /^[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line);
}

function getListType(line) {
  return /^\d+\./.test(line) ? 'ordered' : 'unordered';
}

function cleanListItem(line) {
  return line.replace(/^[-•*\d+.]\s+/, '').trim();
}

function openList(type) {
  const className = type === 'ordered' ? 'listing-bx' : 'bullet-new-box';
  const tag = type === 'ordered' ? 'ol' : 'ul';
  return `<${tag} class="${className}">\n`;
}

function closeList(type) {
  const tag = type === 'ordered' ? 'ol' : 'ul';
  return `</${tag}>\n`;
}

function generateId(text) {
  return text.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
    .substring(0, 50)         // Limit length
    .replace(/-$/, '');       // Remove trailing hyphen if present
}

function generateTableOfContents(headings) {
  let toc = `<div class="blog_index_cover">
    <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
    <ol class="blog_index">`;
  
  headings.forEach(heading => {
    toc += `        <li><a href="#${heading.id}">${heading.text}</a></li>\n`;
  });
  
  toc += `    </ol>
</div>`;
  
  return toc;
}

function analyzeHTMLStructure(html) {
  // Basic HTML structure analysis
  const headingMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const listMatches = html.match(/<[uo]l[^>]*>[\s\S]*?<\/[uo]l>/gi) || [];
  
  return {
    headingCount: headingMatches.length,
    h2Count: h2Matches.length,
    listCount: listMatches.length,
    hasTableOfContents: html.includes('blog_index_cover'),
    hasKeyTakeaways: html.includes('kta-list'),
    tocEntries: h2Matches.length // H2 tags that will appear in TOC
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Document to HTML IDE server running on port ${PORT}`);
  console.log(`📝 Frontend: http://localhost:${PORT}`);
  console.log(`🤖 AI Parsing: ${process.env.GROQ_API_KEY ? 'Enabled' : 'Disabled (no API key)'}`);
});

module.exports = app;
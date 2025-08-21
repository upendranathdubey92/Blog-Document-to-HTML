// Vercel Serverless Function for AI-powered document parsing
const Groq = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
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
      const fallbackContent = parseContentWithRules(req.body.content);
      res.json({
        success: true,
        data: fallbackContent,
        source: 'fallback',
        warning: 'AI parsing failed, using rule-based fallback'
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        error: 'Both AI and fallback parsing failed',
        details: fallbackError.message 
      });
    }
  }
}

/**
 * Parse content using Groq AI with llama-3.1-70b-versatile model
 */
async function parseContentWithAI(content) {
  const prompt = `
You are a professional content parser specialized in converting documents to HTML with Space-O Technologies blog format.

CRITICAL FORMATTING RULES:
1. Bold text should be converted to <strong> tags, NOT header tags
2. Only create actual headings (h2, h3, h4) for true section titles
3. Only generate special HTML sections if the user explicitly mentions section names like "KEY TAKEAWAYS", "TABLE OF CONTENTS", "FAQ", "CALL TO ACTION", etc.

Parse the following document and convert it to structured HTML with these requirements:

FORMATTING GUIDELINES:
- Bold text (in documents or **bold**): Convert to <strong>text</strong>, NOT headings
- Italic text: Convert to <em>text</em>
- True headings/section titles: Convert to <h2>, <h3>, <h4> with IDs
- Never use <h1> tags (convert to <h2>)

SPECIAL SECTIONS (only if explicitly mentioned):
1. Table of Contents (if document contains "TABLE OF CONTENTS" or "TOC"):
   <div class="blog_index_cover">
     <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
     <ol class="blog_index">
       <li><a href="#section">Section Title</a></li>
     </ol>
   </div>

2. Key Takeaways (if document contains "KEY TAKEAWAYS"):
   <ul class="kta-list">
     <p>Key Takeaways</p>
     <li>Takeaway point</li>
   </ul>

3. Regular bullet points:
   <ul class="bullet-new-box">
     <li>Bullet point</li>
   </ul>

4. Regular numbered lists:
   <ol class="listing-bx">
     <li><h3>Item Title</h3><p>Description</p></li>
   </ol>

IMPORTANT: 
- Preserve rich text formatting (bold, italic, underline) within paragraphs
- Only create headings for actual section titles, not emphasized text
- Add IDs to headings for navigation
- Preserve tables, links, and other formatting

Document content:
${content}

Return only clean, valid HTML. Preserve bold text as <strong> tags within paragraphs, not as headings.`;

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
function parseContentWithRules(content) {
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
      // Process rich text formatting in paragraphs
      const formattedLine = formatRichText(line);
      html += `<p>${formattedLine}</p>\n`;
      structure.paragraphs.push({ text: line });
    }
  }

  if (inList) {
    html += closeList(currentListType);
  }

  // Generate TOC if headings exist
  if (structure.headings.length > 0) {
    const toc = generateTableOfContents(structure.headings);
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

// Helper functions
function isHeading(line) {
  return line.length > 5 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line) ||
         /^\d+\.\s+[A-Z]/.test(line) ||
         line.endsWith('?') && line.length > 10;
}

function getHeadingLevel(line) {
  if (line.match(/^\d+\.\s+/)) return 2;
  if (line.endsWith('?')) return 3;
  return 1;
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
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
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

/**
 * Format rich text within paragraphs and list items
 */
function formatRichText(text) {
  let formatted = text;
  
  // Convert bold text patterns (but not if they look like headings)
  // Only if the bold text is within a longer sentence/paragraph
  if (formatted.length > 20 && !isLikelyHeading(text)) {
    // Convert **bold** to <strong>bold</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert __bold__ to <strong>bold</strong>
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
  }
  
  // Convert italic text (avoid double asterisks/underscores which are for bold)
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  
  // Convert basic links if they exist
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  return formatted;
}

/**
 * Check if text looks like a heading (to avoid converting bold headings incorrectly)
 */
function isLikelyHeading(text) {
  const cleanText = text.trim();
  
  // Short text that's all caps or title case
  if (cleanText.length < 100 && (
    cleanText === cleanText.toUpperCase() ||
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*[\?:]?$/.test(cleanText)
  )) {
    return true;
  }
  
  // Numbered headings
  if (/^\d+\.\s+[A-Z]/.test(cleanText)) {
    return true;
  }
  
  // Questions (likely headings in FAQ)
  if (cleanText.endsWith('?') && cleanText.length < 80) {
    return true;
  }
  
  return false;
}

function analyzeHTMLStructure(html) {
  const headingMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  const listMatches = html.match(/<[uo]l[^>]*>[\s\S]*?<\/[uo]l>/gi) || [];
  
  return {
    headingCount: headingMatches.length,
    listCount: listMatches.length,
    hasTableOfContents: html.includes('blog_index_cover'),
    hasKeyTakeaways: html.includes('kta-list')
  };
}
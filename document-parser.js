/**
 * Document Parser for Space-O Technologies Blog Format
 * Handles .docx, .txt, .md, .html file processing
 */

class DocumentParser {
    constructor() {
        this.supportedFormats = ['.docx', '.txt', '.md', '.html'];
        this.currentDocument = null;
        this.parsedContent = null;
        this.sectionDetector = new SectionDetector();
    }

    /**
     * Parse uploaded document based on file type
     * @param {File} file - The uploaded file
     * @returns {Promise<Object>} Parsed document data
     */
    async parseDocument(file) {
        if (!this.isValidFormat(file)) {
            throw new Error(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`);
        }

        this.currentDocument = file;
        const fileExtension = this.getFileExtension(file.name);
        
        try {
            switch (fileExtension) {
                case '.txt':
                    return await this.parseTxtFile(file);
                case '.md':
                    return await this.parseMarkdownFile(file);
                case '.html':
                    return await this.parseHtmlFile(file);
                case '.docx':
                    return await this.parseDocxFile(file);
                default:
                    throw new Error('Unsupported file type');
            }
        } catch (error) {
            throw new Error(`Failed to parse ${file.name}: ${error.message}`);
        }
    }

    /**
     * Parse plain text file
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async parseTxtFile(file) {
        const content = await this.readFileAsText(file);
        return {
            type: 'text',
            originalContent: content,
            structure: this.analyzeTextStructure(content),
            html: this.convertTextToHTML(content)
        };
    }

    /**
     * Parse markdown file
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async parseMarkdownFile(file) {
        const content = await this.readFileAsText(file);
        return {
            type: 'markdown',
            originalContent: content,
            structure: this.analyzeMarkdownStructure(content),
            html: this.convertMarkdownToHTML(content)
        };
    }

    /**
     * Parse HTML file
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async parseHtmlFile(file) {
        const content = await this.readFileAsText(file);
        return {
            type: 'html',
            originalContent: content,
            structure: this.analyzeHtmlStructure(content),
            html: this.optimizeHTMLForSpaceO(content)
        };
    }

    /**
     * Parse DOCX file (basic implementation)
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async parseDocxFile(file) {
        // Note: This is a simplified implementation
        // For full DOCX parsing, you'd need libraries like mammoth.js
        const arrayBuffer = await file.arrayBuffer();
        const content = await this.extractTextFromDocx(arrayBuffer);
        
        return {
            type: 'docx',
            originalContent: content,
            structure: this.analyzeTextStructure(content),
            html: this.convertTextToHTML(content)
        };
    }

    /**
     * Analyze text structure to identify headings, lists, paragraphs
     * @param {string} content 
     * @returns {Object}
     */
    analyzeTextStructure(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const structure = {
            headings: [],
            paragraphs: [],
            lists: [],
            tables: [],
            sections: []
        };

        let currentSection = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;

            // Detect headings (ALL CAPS or specific patterns)
            if (this.isHeading(line)) {
                const heading = {
                    level: this.getHeadingLevel(line),
                    text: this.cleanHeadingText(line),
                    line: i
                };
                structure.headings.push(heading);
                
                if (heading.level <= 2) {
                    currentSection = heading.text;
                }
                continue;
            }

            // Detect lists
            if (this.isListItem(line)) {
                const listType = this.getListType(line);
                const existingList = structure.lists.find(list => 
                    Math.abs(list.startLine - i) < 5 && list.type === listType
                );
                
                if (existingList) {
                    existingList.items.push(this.cleanListItem(line));
                    existingList.endLine = i;
                } else {
                    structure.lists.push({
                        type: listType,
                        items: [this.cleanListItem(line)],
                        startLine: i,
                        endLine: i
                    });
                }
                continue;
            }

            // Regular paragraph
            structure.paragraphs.push({
                text: line,
                line: i,
                section: currentSection
            });
        }

        return structure;
    }

    /**
     * Analyze markdown structure
     * @param {string} content 
     * @returns {Object}
     */
    analyzeMarkdownStructure(content) {
        const lines = content.split('\n');
        const structure = {
            headings: [],
            paragraphs: [],
            lists: [],
            tables: [],
            codeBlocks: [],
            links: [],
            images: []
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) continue;

            // Markdown headings (convert H1 to H2)
            if (line.startsWith('#')) {
                let level = (line.match(/^#+/) || [''])[0].length;
                // Convert H1 to H2 (never use H1)
                if (level === 1) level = 2;
                
                structure.headings.push({
                    level: level,
                    text: line.replace(/^#+\s*/, ''),
                    line: i
                });
            }
            
            // Markdown lists
            else if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
                const listType = line.match(/^\d+\./) ? 'ordered' : 'unordered';
                structure.lists.push({
                    type: listType,
                    text: line.replace(/^[-*+\d+.]\s+/, ''),
                    line: i
                });
            }
            
            // Tables
            else if (line.includes('|')) {
                structure.tables.push({
                    content: line,
                    line: i
                });
            }
            
            // Regular paragraph
            else {
                structure.paragraphs.push({
                    text: line,
                    line: i
                });
            }
        }

        return structure;
    }

    /**
     * Convert text content to Space-O formatted HTML with section detection
     * @param {string} content 
     * @returns {string}
     */
    convertTextToHTML(content) {
        const structure = this.analyzeTextStructure(content);
        let html = '';

        // Process content line by line with section detection
        const lines = content.split('\n');
        let inList = false;
        let currentListType = null;
        let currentSection = null;
        let sectionItems = [];
        let tocItems = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                if (inList) {
                    html += this.closeList(currentListType);
                    inList = false;
                    currentListType = null;
                }
                continue;
            }
            
            // Handle <TABLE> blocks from Google Docs
            if (line.includes('<TABLE>')) {
                // Find the end of the table
                let tableContent = [];
                let j = i + 1;
                
                while (j < lines.length && !lines[j].includes('<TABLE END>')) {
                    const tableLine = lines[j].trim();
                    if (tableLine && !tableLine.startsWith('<') && !tableLine.endsWith('>')) {
                        // Google Docs exports tables with tab-separated values
                        // Keep the original line format for proper parsing
                        tableContent.push(tableLine);
                    }
                    j++;
                }
                
                console.log('Table content extracted:', tableContent); // Debug log
                
                if (tableContent.length > 0) {
                    // Close any open list first
                    if (inList) {
                        html += this.closeList(currentListType);
                        inList = false;
                        currentListType = null;
                    }
                    
                    // Process as table using section detector
                    const tableHtml = this.sectionDetector.processTableItems(tableContent);
                    html += tableHtml + '\n';
                }
                
                // Skip processed lines
                i = j;
                continue;
            }
            
            // Skip <TABLE END> tags
            if (line.includes('<TABLE END>') || line.includes('TABLE END')) {
                continue;
            }

            // Handle headings and section detection
            if (this.isHeading(line) || this.sectionDetector.isStartTag(line.toUpperCase()) || this.sectionDetector.isEndTag(line.toUpperCase())) {
                const normalizedLine = line.toUpperCase().trim();
                
                // Check for end tags first
                if (this.sectionDetector.isEndTag(normalizedLine)) {
                    // Process and close current section
                    if (currentSection && sectionItems.length > 0) {
                        // Only add HTML if it's not an ignore section
                        if (currentSection !== 'ignore') {
                            html += this.sectionDetector.processSectionContent(currentSection, '', sectionItems);
                        }
                        sectionItems = [];
                    }
                    currentSection = null;
                    continue; // Skip processing this line further
                }
                
                // Process previous section if any
                if (currentSection && sectionItems.length > 0) {
                    // Only add HTML if it's not an ignore section
                    if (currentSection === 'toc') {
                        // For TOC section, we'll add it later after collecting all headings
                        // Just mark that we need a TOC
                        html += '<!-- TOC_PLACEHOLDER -->';
                    } else if (currentSection !== 'ignore') {
                        html += this.sectionDetector.processSectionContent(currentSection, '', sectionItems);
                    }
                    sectionItems = [];
                }
                
                if (inList) {
                    html += this.closeList(currentListType);
                    inList = false;
                    currentListType = null;
                }
                
                // Check if this is a start tag
                if (this.sectionDetector.isStartTag(normalizedLine)) {
                    const sectionType = this.sectionDetector.getSectionTypeFromTag(normalizedLine);
                    if (sectionType) {
                        currentSection = sectionType;
                        // Don't add the tag to HTML, it's just a marker
                        continue;
                    }
                }
                
                // Regular heading processing
                if (this.isHeading(line)) {
                    const level = this.getHeadingLevel(line);
                    const text = this.cleanHeadingText(line);
                    const id = this.generateId(text);
                    
                    // Check if this is a special section (non-tag format)
                    const sectionType = this.sectionDetector.detectSectionType(text);
                    if (sectionType) {
                        console.log(`🔍 Detected section type: ${sectionType} for heading: "${text}"`);
                    }
                    
                    if (sectionType && !this.sectionDetector.isStartTag(normalizedLine)) {
                        currentSection = sectionType;
                        // Don't add section headers like "FAQ" or "TABLE OF CONTENTS" to TOC or main content
                        // They are just markers for section processing
                        if (sectionType !== 'toc' && sectionType !== 'faq') {
                            html += `<h${level} id="${id}">${text}</h${level}>\n`;
                            tocItems.push({ text: text, id: id, level: level });
                        }
                    } else if (!currentSection) {
                        html += `<h${level} id="${id}">${text}</h${level}>\n`;
                        // Add to TOC items for later TOC generation with proper ID
                        tocItems.push({ text: text, id: id, level: level });
                    }
                    // If we're in a section but it's a regular heading, add to content and TOC
                    else if (currentSection && currentSection !== 'ignore' && currentSection !== 'faq' && currentSection !== 'toc') {
                        html += `<h${level} id="${id}">${text}</h${level}>\n`;
                        tocItems.push({ text: text, id: id, level: level });
                    }
                    // If we're in FAQ section, questions should be processed by FAQ processor, not added to TOC
                    else if (currentSection === 'faq') {
                        // Don't add FAQ questions to main HTML or TOC, let FAQ processor handle them
                        sectionItems.push(text);
                    }
                    // If we're in TOC section, collect items for TOC
                    else if (currentSection === 'toc') {
                        sectionItems.push(text);
                    }
                }
            }
            
            // Handle table rows (lines with | or multiple columns)
            else if (this.isTableRow(line)) {
                if (currentSection) {
                    // Store table row for section processing
                    sectionItems.push(line);
                } else {
                    // Auto-detect table and process it
                    if (inList) {
                        html += this.closeList(currentListType);
                        inList = false;
                        currentListType = null;
                    }
                    
                    // Check if we're starting a new table
                    const tableRows = this.collectTableRows(lines, i);
                    if (tableRows.length > 1) {
                        html += this.sectionDetector.processTableItems(tableRows);
                        // Skip the processed rows
                        i += tableRows.length - 1;
                    } else {
                        // Single row, treat as paragraph
                        html += `<p>${line}</p>\n`;
                    }
                }
            }
            
            // Handle list items
            else if (this.isListItem(line)) {
                const itemText = this.cleanListItem(line);
                
                if (currentSection) {
                    // Store items for section processing
                    sectionItems.push(itemText);
                } else {
                    // Regular list processing
                    const listType = this.getListType(line);
                    
                    if (!inList || currentListType !== listType) {
                        if (inList) {
                            html += this.closeList(currentListType);
                        }
                        html += this.openList(listType);
                        inList = true;
                        currentListType = listType;
                    }
                    
                    html += `  <li>${itemText}</li>\n`;
                }
            }
            
            // Handle regular paragraphs
            else {
                if (currentSection) {
                    // Store content for section processing
                    sectionItems.push(line);
                } else {
                    if (inList) {
                        html += this.closeList(currentListType);
                        inList = false;
                        currentListType = null;
                    }
                    // Process rich text formatting in paragraphs
                    const formattedLine = this.formatRichText(line);
                    html += `<p>${formattedLine}</p>\n`;
                }
            }
        }

        // Process final section if any
        if (currentSection && sectionItems.length > 0) {
            if (currentSection === 'toc') {
                // For TOC section, we'll add it later after collecting all headings
                html += '<!-- TOC_PLACEHOLDER -->';
            } else if (currentSection !== 'ignore') {
                // Only add HTML if it's not an ignore section
                html += this.sectionDetector.processSectionContent(currentSection, '', sectionItems);
            }
        }

        // Close any remaining list
        if (inList) {
            html += this.closeList(currentListType);
        }

        // Replace TOC placeholder with actual TOC if present
        if (html.includes('<!-- TOC_PLACEHOLDER -->') && tocItems.length > 0) {
            const tocHtml = this.sectionDetector.processSectionContent('toc', '', tocItems);
            html = html.replace('<!-- TOC_PLACEHOLDER -->', tocHtml);
        }

        // Enhance TOC with automatic H2 headings if TOC section exists
        if (html.includes('blog_index_cover')) {
            html = this.enhanceTOCWithH2Links(html);
        }

        // Clean up any duplicate or unused HTML elements
        html = this.cleanupHTML(html);

        return html;
    }

    /**
     * Convert markdown to HTML with Space-O styling
     * @param {string} content 
     * @returns {string}
     */
    convertMarkdownToHTML(content) {
        let html = content;

        // Headers (skip H1, convert # to H2)
        html = html.replace(/^### (.*$)/gm, '<h3 id="$1">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 id="$1">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h2 id="$1">$1</h2>'); // Convert H1 to H2

        // Lists
        html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');

        // Bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Paragraphs
        html = html.replace(/^(?!<[h|l|d]).+/gm, '<p>$&</p>');

        return html;
    }

    /**
     * Generate Table of Contents
     * @param {Array} headings 
     * @returns {string}
     */
    generateTableOfContents(headings) {
        if (headings.length === 0) return '';

        let toc = `
<div class="blog_index_cover">
    <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
    <ol class="blog_index">
`;

        headings.forEach((heading, index) => {
            const id = this.generateId(heading.text);
            const indent = '    '.repeat(Math.max(0, heading.level - 1));
            toc += `${indent}<li><a href="#${id}">${heading.text}</a></li>\n`;
        });

        toc += `    </ol>
</div>\n`;

        return toc;
    }

    // Utility functions
    isValidFormat(file) {
        const extension = this.getFileExtension(file.name);
        return this.supportedFormats.includes(extension);
    }

    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    isHeading(line) {
        const text = line.trim();
        
        // Skip very long lines (likely paragraphs, not headings)
        if (text.length > 150) return false;
        
        // Check for bold text formatting (markdown style **text** or HTML <strong>text</strong>)
        // BUT only if it's not part of a sentence (more context around it)
        const hasBoldFormatting = /\*\*(.*?)\*\*/.test(text) || /<strong>(.*?)<\/strong>/i.test(text);
        if (hasBoldFormatting && text.length > 5 && text.length < 100) {
            // Check if this is likely a heading or just bold text in content
            const beforeAfterContext = text.replace(/\*\*.*?\*\*|<strong>.*?<\/strong>/gi, '').trim();
            // If there's additional context (not just bold text), it's likely content, not heading
            if (beforeAfterContext.length > 10) {
                return false; // This is bold text within content, not a heading
            }
            return true; // This is likely a heading
        }
        
        // Check for all caps (likely heading) - but not if it contains many special characters
        if (text.length > 5 && text === text.toUpperCase() && /^[A-Z\s\-:]+$/.test(text)) {
            // Skip if it looks like a sentence (too many words)
            const words = text.split(/\s+/);
            if (words.length <= 8) {
                return true;
            }
        }
        
        // Check for numbered headings (1. Title, 2. Title, etc.)
        if (/^\d+\.\s+[A-Z]/.test(text)) {
            return true;
        }
        
        // Check for question format (for FAQ) - but not too long
        if (text.endsWith('?') && text.length > 10 && text.length < 80) {
            return true;
        }
        
        // Check for Title Case headings (Each Word Capitalized)
        const words = text.split(/\s+/);
        if (words.length >= 2 && words.length <= 10) {
            const titleCaseWords = words.filter(word => 
                word.length > 0 && 
                /^[A-Z]/.test(word) && 
                word.length > 2
            );
            // If most words are title case, likely a heading
            if (titleCaseWords.length >= words.length * 0.6) {
                return true;
            }
        }
        
        // Check for underlined text (common in documents)
        if (text.includes('_') && /^[A-Z]/.test(text)) {
            return true;
        }
        
        // Check for colon-ending headings (Section Title:)
        if (text.endsWith(':') && text.length > 5 && text.length < 80 && /^[A-Z]/.test(text)) {
            return true;
        }
        
        return false;
    }

    getHeadingLevel(line) {
        const text = line.trim();
        
        // Numbered headings - check for different levels
        if (text.match(/^\d+\.\s+/)) {
            // Main numbered sections (1. 2. 3.) = H2
            return 2;
        }
        if (text.match(/^\d+\.\d+\.\s+/)) {
            // Sub-numbered sections (1.1. 1.2.) = H3
            return 3;
        }
        if (text.match(/^\d+\.\d+\.\d+\.\s+/)) {
            // Sub-sub-numbered sections (1.1.1.) = H4
            return 4;
        }
        
        // Bold formatting - only if it's isolated bold text (likely a heading)
        const hasBoldFormatting = /\*\*(.*?)\*\*/.test(text) || /<strong>(.*?)<\/strong>/i.test(text);
        if (hasBoldFormatting) {
            const beforeAfterContext = text.replace(/\*\*.*?\*\*|<strong>.*?<\/strong>/gi, '').trim();
            // Only treat as heading if there's minimal context around the bold text
            if (beforeAfterContext.length <= 5) {
                const cleanText = text.replace(/\*\*|\<\/?strong\>/gi, '');
                const words = cleanText.split(/\s+/);
                if (words.length <= 3) {
                    return 2; // Short bold text = H2
                } else if (words.length <= 6) {
                    return 3; // Medium bold text = H3
                } else {
                    return 4; // Longer bold text = H4
                }
            }
        }
        
        // Questions are typically subsections (H3) - unless we're in FAQ section
        if (text.endsWith('?')) return 3;
        
        // ALL CAPS analysis
        if (text === text.toUpperCase() && /^[A-Z\s\-:]+$/.test(text)) {
            const words = text.split(/\s+/);
            if (words.length <= 3) {
                return 2; // Short ALL CAPS = H2 (main sections)
            } else if (words.length <= 6) {
                return 3; // Medium ALL CAPS = H3 (subsections)
            } else {
                return 4; // Longer ALL CAPS = H4
            }
        }
        
        // Title Case headings analysis
        const words = text.split(/\s+/);
        if (words.length >= 2 && words.length <= 10) {
            const titleCaseWords = words.filter(word => 
                word.length > 0 && 
                /^[A-Z]/.test(word) && 
                word.length > 2
            );
            
            if (titleCaseWords.length >= words.length * 0.6) {
                if (words.length <= 3) {
                    return 2; // Short Title Case = H2 (main sections)
                } else if (words.length <= 6) {
                    return 3; // Medium Title Case = H3 (subsections)
                } else {
                    return 4; // Longer Title Case = H4
                }
            }
        }
        
        // Colon-ending headings
        if (text.endsWith(':')) {
            return 3; // Section labels = H3
        }
        
        // Underlined text
        if (text.includes('_')) {
            return 3; // Underlined = H3
        }
        
        // Default to H2 (never H1)
        return 2;
    }

    cleanHeadingText(line) {
        let cleanText = line.trim();
        
        // Remove numbered prefixes (1. 2. 1.1. etc.)
        cleanText = cleanText.replace(/^\d+(\.\d+)*\.\s+/, '');
        
        // Clean bold formatting - but preserve the bold text
        cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cleanText = cleanText.replace(/<strong>(.*?)<\/strong>/gi, '<strong>$1</strong>');
        
        // Remove underscores (if used for emphasis)
        cleanText = cleanText.replace(/_{2,}/g, '');
        
        // Clean colons at the end
        cleanText = cleanText.replace(/:$/, '');
        
        return cleanText.trim();
    }

    isListItem(line) {
        return /^[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line);
    }

    getListType(line) {
        return /^\d+\./.test(line) ? 'ordered' : 'unordered';
    }

    cleanListItem(line) {
        return line.replace(/^[-•*\d+.]\s+/, '').trim();
    }

    openList(type) {
        const className = type === 'ordered' ? 'listing-bx' : 'bullet-new-box';
        const tag = type === 'ordered' ? 'ol' : 'ul';
        return `<${tag} class="${className}">\n`;
    }

    closeList(type) {
        const tag = type === 'ordered' ? 'ol' : 'ul';
        return `</${tag}>\n`;
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    analyzeHtmlStructure(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        return {
            headings: Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
                level: parseInt(h.tagName.substring(1)),
                text: h.textContent,
                id: h.id
            })),
            paragraphs: Array.from(doc.querySelectorAll('p')).map(p => ({
                text: p.textContent
            })),
            lists: Array.from(doc.querySelectorAll('ul,ol')).map(list => ({
                type: list.tagName.toLowerCase() === 'ul' ? 'unordered' : 'ordered',
                items: Array.from(list.querySelectorAll('li')).map(li => li.textContent)
            }))
        };
    }

    // Basic DOCX extraction (simplified)
    async extractTextFromDocx(arrayBuffer) {
        // This is a very basic implementation
        // For production, use mammoth.js or similar library
        try {
            const text = new TextDecoder().decode(arrayBuffer);
            // Extract readable text (very basic)
            return text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        } catch (error) {
            throw new Error('Unable to extract text from DOCX file. Please try converting to .txt or .md format first.');
        }
    }

    optimizeHTMLForSpaceO(html) {
        // Apply Space-O specific classes and structure
        return html
            .replace(/<ul>/g, '<ul class="bullet-new-box">')
            .replace(/<ol>/g, '<ol class="listing-bx">');
    }

    /**
     * Enhance Table of Contents with automatic heading detection and jump links (H2, H3, H4)
     * @param {string} html - The HTML content
     * @returns {string} - Enhanced HTML with proper TOC links
     */
    enhanceTOCWithH2Links(html) {
        // Find all headings (H2, H3, H4) in the HTML
        const headingRegex = /<h([2-4])([^>]*?)>(.*?)<\/h[2-4]>/gi;
        let match;
        const allHeadings = [];
        let modifiedHtml = html;
        
        // Extract all headings and ensure they have IDs
        while ((match = headingRegex.exec(html)) !== null) {
            const level = parseInt(match[1]);
            const attributes = match[2];
            const headingText = match[3].trim();
            
            // Clean heading text from HTML tags for display
            const cleanText = headingText.replace(/<[^>]*>/g, '');
            
            // Check if heading already has an ID
            const idMatch = attributes.match(/id\s*=\s*["']([^"']+)["']/i);
            let headingId;
            
            if (idMatch) {
                headingId = idMatch[1];
            } else {
                // Generate new ID from heading text (clean version)
                headingId = this.generateId(cleanText);
                // Add ID to the heading in HTML
                const originalHeading = match[0];
                const newHeading = `<h${level} id="${headingId}"${attributes}>${headingText}</h${level}>`;
                modifiedHtml = modifiedHtml.replace(originalHeading, newHeading);
            }
            
            allHeadings.push({
                level: level,
                id: headingId,
                text: cleanText,
                originalMatch: match[0]
            });
        }
        
        // If no headings found, return original HTML
        if (allHeadings.length === 0) {
            return modifiedHtml;
        }
        
        // Find the existing TOC section and update it
        const tocRegex = /<div class="blog_index_cover"[\s\S]*?<ol class="blog_index"[^>]*?>([\s\S]*?)<\/ol>[\s\S]*?<\/div>/i;
        const tocMatch = tocRegex.exec(modifiedHtml);
        
        if (tocMatch) {
            // Generate new TOC content with hierarchical structure
            let newTocItems = '';
            allHeadings.forEach(heading => {
                const indent = '    '.repeat(heading.level - 1); // Indent based on heading level
                const linkClass = heading.level === 2 ? '' : ' class="sub-heading"';
                newTocItems += `${indent}<li><a href="#${heading.id}"${linkClass}>${heading.text}</a></li>\n`;
            });
            
            // Replace the existing TOC content
            const newTocSection = `<div class="blog_index_cover">
    <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
    <ol class="blog_index">
${newTocItems}    </ol>
</div>`;
            
            modifiedHtml = modifiedHtml.replace(tocMatch[0], newTocSection);
        }
        
        return modifiedHtml;
    }

    /**
     * Clean up HTML by removing duplicates and unused elements
     * @param {string} html - The HTML content to clean
     * @returns {string} - Cleaned HTML
     */
    cleanupHTML(html) {
        let cleanedHtml = html;
        
        // 1. Remove duplicate TOC sections (keep only the first one)
        const tocSections = cleanedHtml.match(/<div class="blog_index_cover"[\s\S]*?<\/div>/gi);
        if (tocSections && tocSections.length > 1) {
            // Keep only the first TOC, remove the rest
            for (let i = 1; i < tocSections.length; i++) {
                cleanedHtml = cleanedHtml.replace(tocSections[i], '');
            }
        }
        
        // 2. Remove duplicate headings with same text and level
        const headingRegex = /<h([1-6])([^>]*?)>(.*?)<\/h[1-6]>/gi;
        const seenHeadings = new Set();
        cleanedHtml = cleanedHtml.replace(headingRegex, (match, level, attributes, text) => {
            const headingKey = `h${level}:${text.trim()}`;
            if (seenHeadings.has(headingKey)) {
                return ''; // Remove duplicate heading
            }
            seenHeadings.add(headingKey);
            return match; // Keep first occurrence
        });

        // 3. Remove duplicate FAQ sections (keep only the first one)
        const faqSections = cleanedHtml.match(/<div class="faq_blog"[\s\S]*?<\/div>/gi);
        if (faqSections && faqSections.length > 1) {
            // Keep only the first FAQ section, remove the rest
            for (let i = 1; i < faqSections.length; i++) {
                cleanedHtml = cleanedHtml.replace(faqSections[i], '');
            }
        }
        
        // 4. Remove empty paragraphs and unnecessary whitespace
        cleanedHtml = cleanedHtml
            .replace(/<p>\s*<\/p>/gi, '') // Empty paragraphs
            .replace(/<p>\s+<\/p>/gi, '') // Paragraphs with only whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple consecutive newlines
            .replace(/\n{3,}/g, '\n\n'); // More than 2 consecutive newlines
        
        // 5. Remove empty lists
        cleanedHtml = cleanedHtml
            .replace(/<ul[^>]*?>\s*<\/ul>/gi, '') // Empty unordered lists
            .replace(/<ol[^>]*?>\s*<\/ol>/gi, '') // Empty ordered lists
            .replace(/<ul[^>]*?>\s*\n\s*<\/ul>/gi, '') // Empty lists with newlines
            .replace(/<ol[^>]*?>\s*\n\s*<\/ol>/gi, ''); // Empty ordered lists with newlines
        
        // 6. Clean up list items with only whitespace
        cleanedHtml = cleanedHtml.replace(/<li>\s*<\/li>/gi, '');
        
        // 7. Remove duplicate consecutive spaces
        cleanedHtml = cleanedHtml.replace(/\s{2,}/g, ' ');
        
        // 8. Clean up any stray HTML tags that might be duplicated
        cleanedHtml = cleanedHtml
            .replace(/(<br\s*\/?>){2,}/gi, '<br>') // Multiple consecutive <br> tags
            .replace(/(&nbsp;){2,}/gi, '&nbsp;'); // Multiple consecutive &nbsp;
        
        // 9. Trim leading and trailing whitespace from the entire HTML
        cleanedHtml = cleanedHtml.trim();
        
        return cleanedHtml;
    }

    /**
     * Format rich text within paragraphs and list items
     * @param {string} text 
     * @returns {string}
     */
    formatRichText(text) {
        let formatted = text;
        
        // Always convert bold text patterns within content (not headings)
        // Convert **bold** to <strong>bold</strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert __bold__ to <strong>bold</strong>
        formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Convert italic text (avoid double asterisks/underscores which are for bold)
        formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        formatted = formatted.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
        
        // Convert basic links if they exist
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        return formatted;
    }

    /**
     * Check if text looks like a heading for formatting purposes
     * @param {string} text 
     * @returns {boolean}
     */
    isLikelyHeadingForFormatting(text) {
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

    /**
     * Check if a line represents a table row
     * @param {string} line 
     * @returns {boolean}
     */
    isTableRow(line) {
        // Check for pipe-separated format (most common)
        if (line.includes('|') && line.split('|').length >= 2) {
            return true;
        }
        
        // Check for tab-separated format
        if (line.includes('\t') && line.split('\t').length >= 2) {
            return true;
        }
        
        // Check for multiple spaces (space-separated columns)
        if (/\s{3,}/.test(line) && line.split(/\s{3,}/).length >= 2) {
            return true;
        }
        
        return false;
    }

    /**
     * Collect consecutive table rows starting from current index
     * @param {Array} lines 
     * @param {number} startIndex 
     * @returns {Array}
     */
    collectTableRows(lines, startIndex) {
        const tableRows = [];
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines within table
            if (!line) {
                // If we have some rows and hit an empty line, check next line
                if (tableRows.length > 0) {
                    // Look ahead to see if there's another table row
                    let nextRowIndex = i + 1;
                    while (nextRowIndex < lines.length && !lines[nextRowIndex].trim()) {
                        nextRowIndex++;
                    }
                    
                    if (nextRowIndex < lines.length && this.isTableRow(lines[nextRowIndex])) {
                        continue; // Skip empty line, continue collecting
                    } else {
                        break; // End of table
                    }
                }
                continue;
            }
            
            // If this line is a table row, add it
            if (this.isTableRow(line)) {
                tableRows.push(line);
            } else {
                // Not a table row, stop collecting
                break;
            }
        }
        
        return tableRows;
    }
}

// Export for use in main application
window.DocumentParser = DocumentParser;
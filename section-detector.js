/**
 * Section Detector for Space-O Technologies Blog Format
 * Automatically detects predefined section names and converts to appropriate HTML
 */

class SectionDetector {
    constructor() {
        this.sectionMappings = {
            // Table of Contents triggers
            'TABLE OF CONTENTS': 'toc',
            'TOC': 'toc',
            'CONTENTS': 'toc',
            'INDEX': 'toc',
            '<TABLE-OF-CONTENTS>': 'toc',
            '<TOC>': 'toc',
            
            // Key Takeaways triggers
            'KEY TAKEAWAYS': 'key-takeaways',
            'KEY POINTS': 'key-takeaways',
            'MAIN POINTS': 'key-takeaways',
            'SUMMARY POINTS': 'key-takeaways',
            'HIGHLIGHTS': 'key-takeaways',
            'IMPORTANT POINTS': 'key-takeaways',
            '<KEY-TAKEAWAYS>': 'key-takeaways',
            '<KEY-POINTS>': 'key-takeaways',
            
            // CTA triggers
            'CALL TO ACTION': 'cta',
            'CTA': 'cta',
            'CTA 1': 'cta1',
            'CTA 2': 'cta2',
            'GET STARTED': 'cta',
            'CONTACT US': 'cta',
            'READY TO START': 'cta',
            'WANT TO BUILD': 'cta',
            'NEED HELP': 'cta',
            'GET IN TOUCH': 'cta',
            '<CALL-TO-ACTION>': 'cta',
            '<CTA>': 'cta',
            
            // FAQ triggers
            'FAQ': 'faq',
            'FREQUENTLY ASKED QUESTIONS': 'faq',
            'COMMON QUESTIONS': 'faq',
            'Q&A': 'faq',
            'QUESTIONS': 'faq',
            '<FAQ>': 'faq',
            
            // Step-by-step triggers
            'STEPS': 'steps',
            'STEP BY STEP': 'steps',
            'PROCESS': 'steps',
            'HOW TO': 'steps',
            'TUTORIAL': 'steps',
            'GUIDE': 'steps',
            '<STEPS>': 'steps',
            '<PROCESS>': 'steps',
            
            // Comparison triggers
            'COMPARISON': 'comparison',
            'VS': 'comparison',
            'PROS AND CONS': 'pros-cons',
            'ADVANTAGES AND DISADVANTAGES': 'pros-cons',
            'BENEFITS AND DRAWBACKS': 'pros-cons',
            '<COMPARISON>': 'comparison',
            '<PROS-AND-CONS>': 'pros-cons',
            
            // List triggers
            'BENEFITS': 'bullet-list',
            'FEATURES': 'bullet-list',
            'ADVANTAGES': 'bullet-list',
            'REQUIREMENTS': 'bullet-list',
            'SPECIFICATIONS': 'bullet-list',
            '<BENEFITS>': 'bullet-list',
            '<FEATURES>': 'bullet-list',
            
            // Ignore section - skip completely
            '<IGNORE>': 'ignore',
            
            // Table section
            'TABLE': 'table',
            '[TABLE START]': 'table',
            '<TABLE>': 'table',
            'DATA TABLE': 'table',
            'COMPARISON TABLE': 'table'
        };
        
        this.sectionTemplates = this.initializeSectionTemplates();
    }

    /**
     * Detect section type from heading text - STRICT matching only
     * @param {string} headingText 
     * @returns {string|null}
     */
    detectSectionType(headingText) {
        const normalizedText = headingText.toUpperCase().trim();
        
        // Check for HTML-like tags first
        if (this.isStartTag(normalizedText)) {
            return this.getSectionTypeFromTag(normalizedText);
        }
        
        // ONLY exact matches - no partial matching to avoid false positives
        if (this.sectionMappings[normalizedText]) {
            return this.sectionMappings[normalizedText];
        }
        
        // More restrictive partial matching - only for exact keyword matches
        for (const [keyword, sectionType] of Object.entries(this.sectionMappings)) {
            // Only match if the normalized text is exactly the keyword or starts/ends with it
            if (normalizedText === keyword || 
                normalizedText === keyword + ':' ||
                normalizedText === keyword + '.' ||
                (normalizedText.length <= keyword.length + 5 && normalizedText.includes(keyword))) {
                return sectionType;
            }
        }
        
        return null;
    }

    /**
     * Check if text is a start tag (e.g., <TABLE-OF-CONTENTS>)
     * @param {string} text 
     * @returns {boolean}
     */
    isStartTag(text) {
        return text.startsWith('<') && text.endsWith('>') && !text.includes('END>');
    }

    /**
     * Check if text is an end tag (e.g., <TABLE-OF-CONTENTS END>)
     * @param {string} text 
     * @returns {boolean}
     */
    isEndTag(text) {
        return text.startsWith('<') && text.includes('END>') ||
               text.includes('[TABLE END]') || 
               text.includes('</TABLE>');
    }

    /**
     * Get section type from HTML-like tag
     * @param {string} tag 
     * @returns {string|null}
     */
    getSectionTypeFromTag(tag) {
        return this.sectionMappings[tag] || null;
    }

    /**
     * Extract tag name from end tag
     * @param {string} endTag 
     * @returns {string}
     */
    getTagFromEndTag(endTag) {
        return endTag.replace(' END>', '>');
    }

    /**
     * Process section content based on detected type
     * @param {string} sectionType 
     * @param {string} content 
     * @param {Array} items 
     * @returns {string}
     */
    processSectionContent(sectionType, content, items = []) {
        const template = this.sectionTemplates[sectionType];
        if (!template) {
            return this.processRegularContent(content);
        }
        
        return template(content, items);
    }

    /**
     * Initialize section templates
     * @returns {Object}
     */
    initializeSectionTemplates() {
        return {
            'toc': (content, items) => {
                if (items.length === 0) return '';
                return `
<div class="blog_index_cover">
    <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
    <ol class="blog_index" style="display: none;">
${items.map(item => {
    // Handle both string items and object items with IDs
    if (typeof item === 'object' && item.text && item.id) {
        return `        <li><a href="#${item.id}">${item.text}</a></li>`;
    } else if (typeof item === 'string') {
        return `        <li><a href="#${this.generateId(item)}">${item}</a></li>`;
    }
    return `        <li>${item}</li>`;
}).join('\n')}
    </ol>
</div>`;
            },
            
            'key-takeaways': (content, items) => {
                return `
<ul class="kta-list">
    <p>Key Takeaways</p>
${items.map(item => `    <li>${item}</li>`).join('\n')}
</ul>`;
            },
            
            'cta': (content, items) => {
                const heading = items[0] || 'Ready to Get Started?';
                const description = items[1] || 'Get in touch with our experienced team for a free consultation.';
                const buttonText = items[2] || 'Schedule Free Consultation';
                const imageUrl = items[3] || 'https://www.spaceotechnologies.com/wp-content/uploads/2023/04/cta-img.png';
                
                return `
<div class="callout_newbox">
    <div class="left-part">
        <p class="call_heading">${heading}</p>
        <p>${description}</p>
        <div class="sec-btn">
            <button class="btn mb0 mt15 open-qouteform" type="button" data-medium="B_1">
                ${buttonText} <strong class="aero_icon"></strong>
            </button>
        </div>
    </div>
    <div class="right-part">
        <img src="${imageUrl}" alt="CTA Image" width="278" height="337" class="alignnone size-full wp-image-194985" />
    </div>
</div>`;
            },
            
            'cta1': (content, items) => {
                const heading = items[0] || 'Want To Create An Android Application?';
                const description = items[1] || 'Looking to Create An Android app? Get in touch with our experienced Android app developers for a free consultation.';
                const buttonText = items[2] || 'Schedule Free Consultation';
                const imageUrl = items[3] || 'https://www.spaceotechnologies.com/wp-content/uploads/2023/04/cta-img.png';
                
                return `
<div class="callout_newbox" style="display: flex; align-items: center; background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 20px 0; max-width: 100%; overflow: hidden;">
    <div class="left-part" style="flex: 1; padding-right: 30px; min-width: 0;">
        <h3 class="call_heading" style="font-size: 24px; font-weight: bold; margin: 0 0 15px 0; color: #333; line-height: 1.3;">${heading}</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 0 0 20px 0;">${description}</p>
        <div class="sec-btn">
            <button class="btn mb0 mt15 open-qouteform" type="button" data-medium="B_1" style="background: #e74c3c; color: white; padding: 12px 25px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px;">
                ${buttonText} <strong class="aero_icon" style="margin-left: 5px;">→</strong>
            </button>
        </div>
    </div>
    <div class="right-part" style="flex: 0 0 280px; max-width: 280px;">
        <img src="${imageUrl}" alt="Cta Image" style="width: 100%; height: auto; border-radius: 10px; display: block;" />
    </div>
</div>
<style>
@media (max-width: 768px) {
    .callout_newbox {
        flex-direction: column !important;
        text-align: center !important;
    }
    .callout_newbox .left-part {
        padding-right: 0 !important;
        margin-bottom: 20px !important;
    }
    .callout_newbox .right-part {
        flex: none !important;
        max-width: 250px !important;
        margin: 0 auto !important;
    }
}
</style>`;
            },
            
            'cta2': (content, items) => {
                const heading = items[0] || 'Get a Free Mobile App Development Strategy Session';
                const description = items[1] || 'Discover the best approach to building a custom mobile app tailored to your business. Get expert insights with no obligation.';
                const buttonText = items[2] || 'Claim My Free Strategy Session';
                
                return `
<div class="callout_box">
    <p class="call_heading">${heading}</p>
    <p>${description}</p>
    <div class="sec-btn">
        <button class="btn mb0 mt15 newsletter-green" type="button" data-toggle="modal" data-target="#popform">
            ${buttonText} <strong class="aero_icon"></strong>
        </button>
    </div>
</div>`;
            },
            
            'faq': (content, items) => {
                const faqItems = this.processFAQItems(items);
                return `
<div class="faq_blog">
    <h2 id="frequently-asked-questions">Frequently Asked Questions</h2>
${faqItems}
</div>`;
            },
            
            'steps': (content, items) => {
                return `
<ol class="listing-bx">
${items.map((item, index) => {
    const parts = item.split(':');
    const title = parts[0] || `Step ${index + 1}`;
    const description = parts.slice(1).join(':').trim() || item;
    return `    <li>
        <h3>${title}</h3>
        <p>${description}</p>
    </li>`;
}).join('\n')}
</ol>`;
            },
            
            'pros-cons': (content, items) => {
                const midPoint = Math.ceil(items.length / 2);
                const pros = items.slice(0, midPoint);
                const cons = items.slice(midPoint);
                
                return `
<div class="table-responsive expense_track">
    <table class="table table-bordered table-striped" dir="ltr" border="1" cellspacing="0" cellpadding="0">
        <tbody>
            <tr>
                <th style="text-align: center; background: green; color: #fff; width: 50%;"><strong>Pros</strong></th>
                <th style="text-align: center; background: red; color: #fff; width: 50%;">Cons</th>
            </tr>
            <tr>
                <td>
                    <ul class="pros" style="padding: 0; margin: 0;">
${pros.map(item => `                        <li><span style="font-weight: 400;">${item}</span></li>`).join('\n')}
                    </ul>
                </td>
                <td>
                    <ul class="cons" style="padding: 0; margin: 0;">
${cons.map(item => `                        <li><span style="font-weight: 400;">${item}</span></li>`).join('\n')}
                    </ul>
                </td>
            </tr>
        </tbody>
    </table>
</div>`;
            },
            
            'bullet-list': (content, items) => {
                return `
<ul class="bullet-new-box">
${items.map(item => `    <li>${item}</li>`).join('\n')}
</ul>`;
            },
            
            'comparison': (content, items) => {
                // Simple comparison table
                return `
<table class="comparison-table table table-bordered">
    <thead>
        <tr class="table-header">
            <th>Feature</th>
            <th>Option 1</th>
            <th>Option 2</th>
        </tr>
    </thead>
    <tbody>
${items.map(item => {
    const parts = item.split('|').map(p => p.trim());
    if (parts.length >= 3) {
        return `        <tr>
            <td>${parts[0]}</td>
            <td>${parts[1]}</td>
            <td>${parts[2]}</td>
        </tr>`;
    }
    return `        <tr><td colspan="3">${item}</td></tr>`;
}).join('\n')}
    </tbody>
</table>`;
            },
            
            'ignore': (content, items) => {
                // Return empty string - completely skip this section
                return '';
            },
            
            'table': (content, items) => {
                return this.processTableItems(items);
            }
        };
    }

    /**
     * Process FAQ items with improved question-answer pairing
     * @param {Array} items 
     * @returns {string}
     */
    processFAQItems(items) {
        let faqHtml = '';
        let currentQuestion = '';
        let answerParagraphs = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i].trim();
            
            // Skip empty items
            if (!item) continue;
            
            // Check if this looks like a question
            if (item.endsWith('?') || this.isLikelyQuestion(item)) {
                // Process previous question-answer pair if exists
                if (currentQuestion && answerParagraphs.length > 0) {
                    const id = this.generateId(currentQuestion);
                    faqHtml += `    <h3 id="${id}">${currentQuestion}</h3>\n`;
                    answerParagraphs.forEach(paragraph => {
                        faqHtml += `    <p>${paragraph}</p>\n`;
                    });
                    faqHtml += `\n`;
                }
                
                // Start new question
                currentQuestion = item;
                answerParagraphs = [];
            } else if (currentQuestion) {
                // This is an answer paragraph
                answerParagraphs.push(item);
            } else {
                // Standalone content - treat as answer to implicit question
                if (item.length > 20) { // Only substantial content
                    answerParagraphs.push(item);
                }
            }
        }
        
        // Process the last question-answer pair
        if (currentQuestion && answerParagraphs.length > 0) {
            const id = this.generateId(currentQuestion);
            faqHtml += `    <h3 id="${id}">${currentQuestion}</h3>\n`;
            answerParagraphs.forEach(paragraph => {
                faqHtml += `    <p>${paragraph}</p>\n`;
            });
        } else if (!currentQuestion && answerParagraphs.length > 0) {
            // Handle case where we have answers but no explicit questions
            answerParagraphs.forEach(paragraph => {
                faqHtml += `    <p>${paragraph}</p>\n`;
            });
        }
        
        return faqHtml;
    }

    /**
     * Check if a line is likely a question even if it doesn't end with ?
     * @param {string} text 
     * @returns {boolean}
     */
    isLikelyQuestion(text) {
        const questionWords = ['how', 'what', 'when', 'where', 'why', 'who', 'which', 'can', 'will', 'should', 'is', 'are', 'do', 'does'];
        const firstWord = text.toLowerCase().split(' ')[0];
        return questionWords.includes(firstWord) && text.length > 10;
    }

    /**
     * Process regular content
     * @param {string} content 
     * @returns {string}
     */
    processRegularContent(content) {
        return `<p>${content}</p>`;
    }

    /**
     * Generate ID from text
     * @param {string} text 
     * @returns {string}
     */
    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    /**
     * Process table items into properly formatted HTML table
     * @param {Array} items 
     * @returns {string}
     */
    processTableItems(items) {
        if (!items || items.length === 0) return '';
        
        // Detect table format - pipe-separated or tab-separated
        let tableData = [];
        let headers = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i].trim();
            if (!item) continue;
            
            // Check for pipe-separated format
            if (item.includes('|')) {
                const columns = item.split('|').map(col => col.trim()).filter(col => col);
                if (i === 0) {
                    headers = columns;
                } else {
                    tableData.push(columns);
                }
            }
            // Check for tab-separated or multiple spaces format
            else if (item.includes('\t') || /\s{3,}/.test(item)) {
                const columns = item.split(/\t|\s{3,}/).map(col => col.trim()).filter(col => col);
                if (i === 0) {
                    headers = columns;
                } else {
                    tableData.push(columns);
                }
            }
            // Single column or simple format
            else {
                if (i === 0) {
                    headers = [item];
                } else {
                    tableData.push([item]);
                }
            }
        }
        
        // Generate table HTML with Space-O styling
        let tableHtml = `
<div class="table-responsive travel_table v-middle">
    <table class="table table-bordered" dir="ltr" border="1" cellspacing="0" cellpadding="0">
        <tbody>`;
        
        // Add header row if we have headers
        if (headers.length > 0) {
            tableHtml += '\n            <tr>\n';
            const colWidth = Math.floor(100 / headers.length);
            headers.forEach((header, index) => {
                tableHtml += `                <th style="width: ${colWidth}%;">${header}</th>\n`;
            });
            tableHtml += '            </tr>';
        }
        
        // Add data rows
        tableData.forEach(row => {
            tableHtml += '\n            <tr>\n';
            // Ensure row has enough columns (pad with empty cells if needed)
            while (row.length < headers.length) {
                row.push('');
            }
            row.forEach(cell => {
                tableHtml += `                <td>${cell}</td>\n`;
            });
            tableHtml += '            </tr>';
        });
        
        tableHtml += `
        </tbody>
    </table>
</div>`;
        
        return tableHtml;
    }

    /**
     * Get section documentation for users
     * @returns {string}
     */
    getSectionGuide() {
        return `
# Section Names Guide for Document to HTML IDE

Add these section names to your documents and the parser will automatically convert them to Space-O Technologies HTML format:

## Table of Contents
**Section Names:** "TABLE OF CONTENTS", "TOC", "CONTENTS", "INDEX"
**Output:** Space-O TOC with toggle functionality

## Key Takeaways  
**Section Names:** "KEY TAKEAWAYS", "KEY POINTS", "MAIN POINTS", "HIGHLIGHTS"
**Output:** Styled key takeaways box with checkmarks

## Call to Action
**Section Names:** "CALL TO ACTION", "CTA", "GET STARTED", "CONTACT US", "READY TO START"
**Format:** 
- Line 1: CTA Heading
- Line 2: Description  
- Line 3: Button Text
- Line 4: Image URL (optional)

## CTA Variant 1 (With Image)
**Section Name:** "CTA 1"
**Format:** 
- Line 1: CTA Heading
- Line 2: Description  
- Line 3: Button Text
- Line 4: Image URL (optional)
**Output:** Two-column layout with image on right

## CTA Variant 2 (Simple Box)
**Section Name:** "CTA 2" 
**Format:**
- Line 1: CTA Heading
- Line 2: Description
- Line 3: Button Text
**Output:** Single column simple callout box

## FAQ Section
**Section Names:** "FAQ", "FREQUENTLY ASKED QUESTIONS", "COMMON QUESTIONS"
**Format:** Questions ending with "?" followed by answers

## Step-by-Step Process
**Section Names:** "STEPS", "STEP BY STEP", "PROCESS", "HOW TO", "TUTORIAL"
**Format:** Numbered or bulleted list items
**Output:** Professional numbered steps with styling

## Pros and Cons
**Section Names:** "PROS AND CONS", "ADVANTAGES AND DISADVANTAGES"
**Format:** First half = pros, second half = cons
**Output:** Two-column comparison table

## Feature Lists
**Section Names:** "BENEFITS", "FEATURES", "ADVANTAGES", "REQUIREMENTS"
**Output:** Styled bullet point lists

## Comparison Tables
**Section Names:** "COMPARISON", "VS"
**Format:** Feature|Option1|Option2 (separated by |)
**Output:** Professional comparison table

## Data Tables
**Section Names:** "TABLE", "DATA TABLE", "COMPARISON TABLE"
**Supported Tags:** 
- [TABLE START] ... [TABLE END]
- <TABLE> ... </TABLE>
- TABLE: (simple format)
**Format:** Header1 | Header2 | Header3
            Data1   | Data2   | Data3
**Output:** Responsive HTML table with Space-O styling
**Output:** Professional data table with Space-O styling

## Example Document Structure:

KEY TAKEAWAYS
- Important point 1
- Important point 2  
- Important point 3

TABLE OF CONTENTS
- Section 1
- Section 2
- Section 3

STEPS
1. First step: Description of what to do
2. Second step: More details
3. Third step: Final instructions

FAQ
What is this tool?
This is a document to HTML converter.

How does it work?
It uses AI and rule-based parsing.

CALL TO ACTION
Ready to Get Started?
Contact our team for a free consultation.
Schedule Free Consultation
https://example.com/cta-image.jpg

PROS AND CONS
- Fast processing
- Easy to use
- Professional output
- Requires internet
- Learning curve
- Some limitations
`;
    }
}

// Export for use in main application
window.SectionDetector = SectionDetector;
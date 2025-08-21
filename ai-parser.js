/**
 * AI-Enhanced Document Parser with Groq Integration
 * Provides intelligent content parsing with fallback to rule-based parsing
 */

class AIDocumentParser extends DocumentParser {
    constructor() {
        super();
        this.groqAvailable = false;
        this.apiEndpoint = window.location.origin + '/api/parse-with-ai';
        this.urlFetcher = new URLDocumentFetcher(); // Initialize URL fetcher
        this.checkAIAvailability();
    }

    /**
     * Check if AI parsing is available
     */
    async checkAIAvailability() {
        try {
            const response = await fetch('/api/parse-with-ai', {
                method: 'OPTIONS'
            });
            this.groqAvailable = response.ok;
        } catch (error) {
            console.log('AI parsing not available, using rule-based fallback');
            this.groqAvailable = false;
        }
    }

    /**
     * Enhanced document parsing with AI
     * @param {File} file - The uploaded file
     * @returns {Promise<Object>} Parsed document data
     */
    async parseDocument(file) {
        if (!this.isValidFormat(file)) {
            throw new Error(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`);
        }

        const content = await this.extractTextContent(file);
        
        // Try AI parsing first if available
        if (this.groqAvailable) {
            try {
                const aiResult = await this.parseWithAI(content, file.name);
                return {
                    ...aiResult,
                    fileName: file.name,
                    fileSize: file.size,
                    parseMethod: 'ai'
                };
            } catch (error) {
                console.warn('AI parsing failed, falling back to rule-based:', error);
            }
        }

        // Fallback to original rule-based parsing
        const fallbackResult = await super.parseDocument(file);
        return {
            ...fallbackResult,
            parseMethod: 'fallback',
            warning: 'AI parsing unavailable, using rule-based parsing'
        };
    }

    /**
     * Parse content using AI
     * @param {string} content 
     * @param {string} fileName 
     * @returns {Promise<Object>}
     */
    async parseWithAI(content, fileName = 'document') {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                type: this.getContentTypeFromFileName(fileName),
                options: {
                    includeTableOfContents: false,  // Only if explicitly mentioned
                    includeKeyTakeaways: false,     // Only if explicitly mentioned
                    spaceOFormat: true,
                    strictMode: true                // Only generate special sections if explicitly mentioned
                }
            })
        });

        if (!response.ok) {
            throw new Error(`AI parsing failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'AI parsing failed');
        }

        return {
            type: 'ai-enhanced',
            originalContent: content,
            html: result.data.html,
            structure: result.data.structure,
            metadata: {
                ...result.data.metadata,
                fileName: fileName,
                aiModel: result.data.metadata?.model || 'llama-3.1-70b-versatile',
                tokens: result.data.metadata?.tokens || 0
            }
        };
    }

    /**
     * Enhanced URL document fetching with AI parsing
     * @param {string} url 
     * @returns {Promise<Object>}
     */
    async parseDocumentFromURL(url) {
        try {
            // Initialize URL fetcher if not available
            if (!this.urlFetcher) {
                this.urlFetcher = new URLDocumentFetcher();
            }
            
            // First fetch the document
            const fetchedDoc = await this.urlFetcher.fetchDocument(url);
            
            // Then parse with AI
            if (this.groqAvailable) {
                try {
                    const aiResult = await this.parseWithAI(fetchedDoc.content, fetchedDoc.title);
                    return {
                        ...aiResult,
                        sourceUrl: url,
                        parseMethod: 'ai'
                    };
                } catch (error) {
                    console.warn('AI parsing failed for URL content, using fallback');
                }
            }

            // Fallback parsing
            const content = fetchedDoc.content;
            const fallbackResult = this.analyzeTextStructure(content);
            
            return {
                type: 'url-fallback',
                originalContent: content,
                html: this.convertTextToHTML(content),
                structure: fallbackResult,
                sourceUrl: url,
                fileName: fetchedDoc.title || 'URL Document',
                parseMethod: 'fallback'
            };

        } catch (error) {
            throw new Error(`Failed to parse document from URL: ${error.message}`);
        }
    }

    /**
     * Get content type from file name
     * @param {string} fileName 
     * @returns {string}
     */
    getContentTypeFromFileName(fileName) {
        const extension = fileName.toLowerCase().split('.').pop();
        const typeMap = {
            'txt': 'text',
            'md': 'markdown',
            'html': 'html',
            'htm': 'html',
            'docx': 'docx',
            'doc': 'docx'
        };
        return typeMap[extension] || 'text';
    }

    /**
     * Extract text content from file based on type
     * @param {File} file 
     * @returns {Promise<string>}
     */
    async extractTextContent(file) {
        const fileType = this.getFileExtension(file.name);
        
        switch (fileType) {
            case '.txt':
            case '.md':
            case '.html':
                return await this.readFileAsText(file);
            
            case '.docx':
                // For client-side, we'll send to server for processing
                return await this.extractDocxContent(file);
            
            default:
                return await this.readFileAsText(file);
        }
    }

    /**
     * Extract DOCX content (send to server if available)
     * @param {File} file 
     * @returns {Promise<string>}
     */
    async extractDocxContent(file) {
        // Try server-side processing first
        try {
            const formData = new FormData();
            formData.append('document', file);
            
            const response = await fetch('/api/parse-with-ai', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.data.originalContent || result.data.html;
            }
        } catch (error) {
            console.warn('Server-side DOCX processing failed, using client fallback');
        }

        // Fallback to basic client-side processing
        return await super.extractTextFromDocx(await file.arrayBuffer());
    }

    /**
     * Enhanced structure analysis with AI insights
     * @param {Object} parseResult 
     * @returns {Object}
     */
    analyzeDocumentStructure(parseResult) {
        const baseAnalysis = {
            wordCount: this.countWords(parseResult.originalContent),
            readingTime: this.estimateReadingTime(parseResult.originalContent),
            complexity: this.assessComplexity(parseResult.structure),
            seoScore: this.calculateSEOScore(parseResult.structure)
        };

        if (parseResult.metadata?.aiModel) {
            baseAnalysis.aiEnhanced = true;
            baseAnalysis.aiModel = parseResult.metadata.aiModel;
            baseAnalysis.processingTokens = parseResult.metadata.tokens;
        }

        return baseAnalysis;
    }

    /**
     * Count words in content
     * @param {string} content 
     * @returns {number}
     */
    countWords(content) {
        return content.trim().split(/\s+/).length;
    }

    /**
     * Estimate reading time (average 200 words per minute)
     * @param {string} content 
     * @returns {number}
     */
    estimateReadingTime(content) {
        const words = this.countWords(content);
        return Math.ceil(words / 200);
    }

    /**
     * Assess content complexity
     * @param {Object} structure 
     * @returns {string}
     */
    assessComplexity(structure) {
        const headings = structure.headings?.length || 0;
        const lists = structure.lists?.length || 0;
        const tables = structure.tables?.length || 0;
        
        const complexity = headings + lists + (tables * 2);
        
        if (complexity < 5) return 'Simple';
        if (complexity < 15) return 'Medium';
        return 'Complex';
    }

    /**
     * Calculate basic SEO score
     * @param {Object} structure 
     * @returns {number}
     */
    calculateSEOScore(structure) {
        let score = 0;
        
        // Has headings
        if (structure.headings?.length > 0) score += 20;
        
        // Has proper heading hierarchy
        if (structure.headings?.some(h => h.level === 1)) score += 15;
        
        // Has lists (good for readability)
        if (structure.lists?.length > 0) score += 10;
        
        // Has table of contents
        if (structure.hasTableOfContents) score += 25;
        
        // Has key takeaways
        if (structure.hasKeyTakeaways) score += 15;
        
        // Good content length (estimated)
        const paragraphs = structure.paragraphs?.length || 0;
        if (paragraphs > 5) score += 15;
        
        return Math.min(score, 100);
    }

    /**
     * Generate parsing statistics
     * @param {Object} parseResult 
     * @returns {Object}
     */
    getParsingStats(parseResult) {
        return {
            method: parseResult.parseMethod,
            aiEnhanced: parseResult.parseMethod === 'ai',
            processingTime: parseResult.metadata?.processingTime,
            model: parseResult.metadata?.aiModel,
            tokens: parseResult.metadata?.tokens,
            structure: this.analyzeDocumentStructure(parseResult),
            quality: this.assessParsingQuality(parseResult)
        };
    }

    /**
     * Assess parsing quality
     * @param {Object} parseResult 
     * @returns {string}
     */
    assessParsingQuality(parseResult) {
        if (parseResult.parseMethod === 'ai') {
            return parseResult.metadata?.tokens > 1000 ? 'High' : 'Good';
        }
        return 'Standard';
    }
}

// Export enhanced parser
window.AIDocumentParser = AIDocumentParser;
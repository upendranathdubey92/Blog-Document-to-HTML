/**
 * URL Document Fetcher
 * Handles fetching documents from URLs (Google Docs, GitHub, etc.)
 */

class URLDocumentFetcher {
    constructor() {
        this.supportedDomains = [
            'docs.google.com',
            'github.com',
            'raw.githubusercontent.com',
            'gist.github.com'
        ];
    }

    /**
     * Fetch document from URL
     * @param {string} url - The document URL
     * @returns {Promise<Object>} Document content and metadata
     */
    async fetchDocument(url) {
        if (!this.isValidUrl(url)) {
            throw new Error('Please enter a valid URL');
        }

        try {
            // Use server-side endpoint for better CORS handling
            const response = await fetch('/fetch-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch document');
            }

            const data = await response.json();
            const content = data.content;
            
            return {
                url: url,
                originalUrl: data.url,
                content: content,
                type: this.detectContentType(url, content),
                title: this.extractTitle(content),
                fetchedAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to fetch document: ${error.message}`);
        }
    }

    /**
     * Process URL to make it fetchable
     * @param {string} url 
     * @returns {string}
     */
    processUrl(url) {
        // Google Docs - convert to export URL
        if (url.includes('docs.google.com/document')) {
            const docId = this.extractGoogleDocId(url);
            if (docId) {
                // Try multiple export formats for better compatibility
                return `https://docs.google.com/document/d/${docId}/export?format=html`;
            }
        }

        // GitHub - convert to raw URL
        if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
            return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }

        return url;
    }

    /**
     * Extract Google Doc ID from URL
     * @param {string} url 
     * @returns {string|null}
     */
    extractGoogleDocId(url) {
        const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    /**
     * Fetch with CORS handling
     * @param {string} url 
     * @returns {Promise<Response>}
     */
    async fetchWithCORS(url) {
        try {
            // Try direct fetch first
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                return response;
            }
            
            // If CORS fails, try with a CORS proxy
            throw new Error('CORS blocked');
        } catch (error) {
            // For Google Docs, try alternative URLs
            if (url.includes('docs.google.com')) {
                const docId = this.extractGoogleDocId(url);
                if (docId) {
                    // Try plain text export
                    const txtUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
                    try {
                        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(txtUrl)}`;
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const data = await response.json();
                            return {
                                ok: true,
                                text: async () => data.contents
                            };
                        }
                    } catch (proxyError) {
                        // Continue to general proxy fallback
                    }
                }
            }
            
            // Use CORS proxy as general fallback
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`Document may not be publicly accessible. Please ensure the Google Doc is shared with "Anyone with the link can view" permissions.`);
            }
            
            const data = await response.json();
            
            // Return a Response-like object
            return {
                ok: true,
                text: async () => data.contents
            };
        }
    }

    /**
     * Detect content type from URL and content
     * @param {string} url 
     * @param {string} content 
     * @returns {string}
     */
    detectContentType(url, content) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('.md') || urlLower.includes('markdown')) {
            return 'markdown';
        }
        
        if (urlLower.includes('.html') || urlLower.includes('.htm')) {
            return 'html';
        }
        
        if (urlLower.includes('docs.google.com')) {
            return 'text';
        }
        
        // Detect by content
        if (content.includes('<html') || content.includes('<!DOCTYPE html')) {
            return 'html';
        }
        
        if (content.includes('# ') || content.includes('## ')) {
            return 'markdown';
        }
        
        return 'text';
    }

    /**
     * Extract title from content
     * @param {string} content 
     * @returns {string}
     */
    extractTitle(content) {
        // Try to extract title from HTML
        const htmlTitleMatch = content.match(/<title>(.*?)<\/title>/i);
        if (htmlTitleMatch) {
            return htmlTitleMatch[1].trim();
        }
        
        // Try to extract first heading from markdown
        const mdHeadingMatch = content.match(/^#\s+(.+)$/m);
        if (mdHeadingMatch) {
            return mdHeadingMatch[1].trim();
        }
        
        // Try to extract first line if it looks like a title
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.length < 100 && firstLine.length > 10) {
                return firstLine;
            }
        }
        
        return 'Untitled Document';
    }

    /**
     * Validate URL
     * @param {string} url 
     * @returns {boolean}
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if domain is supported
     * @param {string} url 
     * @returns {boolean}
     */
    isSupportedDomain(url) {
        try {
            const urlObj = new URL(url);
            return this.supportedDomains.some(domain => 
                urlObj.hostname.includes(domain)
            );
        } catch {
            return false;
        }
    }

    /**
     * Get help text for URL formats
     * @returns {string}
     */
    getHelpText() {
        return `
Supported URL formats:
• Google Docs: https://docs.google.com/document/d/[ID]/edit
• GitHub Files: https://github.com/user/repo/blob/main/file.md
• Raw GitHub: https://raw.githubusercontent.com/user/repo/main/file.md
• GitHub Gists: https://gist.github.com/user/[ID]

Note: Documents must be publicly accessible.
        `;
    }

    /**
     * Convert fetched document to parseable format
     * @param {Object} fetchedDoc 
     * @returns {Object}
     */
    convertToParseableFormat(fetchedDoc) {
        return {
            name: fetchedDoc.title,
            type: fetchedDoc.type,
            content: fetchedDoc.content,
            lastModified: fetchedDoc.fetchedAt,
            size: fetchedDoc.content.length
        };
    }
}

// Export for use in main application
window.URLDocumentFetcher = URLDocumentFetcher;
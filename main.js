/**
 * Main Application Controller for Document to HTML IDE
 * Handles UI interactions, document processing, and template management
 */

class DocumentToHTMLIDE {
    constructor() {
        this.parser = new AIDocumentParser(); // Use AI-enhanced parser
        this.templateSystem = new TemplateSystem();
        this.urlFetcher = new URLDocumentFetcher();
        this.currentDocument = null;
        this.currentTemplate = null;
        this.isDirty = false;
        
        this.initializeEventListeners();
        this.setupDragAndDrop();
        this.updateUI();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.triggerFileUpload());
        document.getElementById('uploadArea').addEventListener('click', () => this.triggerFileUpload());

        // Template selection
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectTemplate(e.target.closest('.template-item')));
        });

        // URL fetching
        document.getElementById('fetchUrlBtn').addEventListener('click', () => this.fetchFromUrl());
        document.getElementById('documentUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchFromUrl();
        });

        // Toolbar buttons
        document.getElementById('formatBtn').addEventListener('click', () => this.formatCode());
        document.getElementById('validateBtn').addEventListener('click', () => this.validateHTML());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadHTML());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());

        // Editor changes
        document.getElementById('htmlEditor').addEventListener('input', () => this.onEditorChange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processFile(file);
        }
    }

    /**
     * Process uploaded file
     */
    async processFile(file) {
        this.setStatus('Processing document...', 'info');
        this.showLoading(true);

        try {
            this.currentDocument = await this.parser.parseDocument(file);
            
            // Update file info with AI status
            const aiStatus = this.currentDocument.parseMethod === 'ai' ? '🤖 AI-Enhanced' : '📝 Rule-based';
            document.getElementById('fileInfo').textContent = `${file.name} (${aiStatus})`;
            
            // Load HTML into editor
            const htmlEditor = document.getElementById('htmlEditor');
            htmlEditor.value = this.currentDocument.html;
            
            this.updateWordCount();
            
            // Show parsing statistics
            if (this.currentDocument.metadata?.tokens) {
                this.setStatus(`AI parsing completed • ${this.currentDocument.metadata.tokens} tokens used`, 'success');
            } else {
                this.setStatus(`Document processed successfully: ${file.name}`, 'success');
            }
            
        } catch (error) {
            this.setStatus(`Error processing file: ${error.message}`, 'error');
            console.error('File processing error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Fetch document from URL with AI parsing
     */
    async fetchFromUrl() {
        const urlInput = document.getElementById('documentUrl');
        const url = urlInput.value.trim();

        if (!url) {
            this.setStatus('Please enter a document URL', 'warning');
            return;
        }

        this.setStatus('Fetching and parsing document with AI...', 'info');
        this.showLoading(true);

        try {
            // Use AI-enhanced URL parsing
            this.currentDocument = await this.parser.parseDocumentFromURL(url);
            
            // Update file info with AI status
            const aiStatus = this.currentDocument.parseMethod === 'ai' ? '🤖 AI-Enhanced' : '📝 Rule-based';
            document.getElementById('fileInfo').textContent = `${this.currentDocument.fileName || 'URL Document'} (${aiStatus})`;
            
            // Load HTML into editor
            const htmlEditor = document.getElementById('htmlEditor');
            htmlEditor.value = this.currentDocument.html;
            
            this.updateWordCount();
            
            // Show parsing statistics
            if (this.currentDocument.metadata?.tokens) {
                this.setStatus(`AI parsing completed • ${this.currentDocument.metadata.tokens} tokens used`, 'success');
            } else {
                this.setStatus(`Document parsed successfully`, 'success');
            }
            
            urlInput.value = ''; // Clear URL input
            
        } catch (error) {
            this.setStatus(`Error fetching document: ${error.message}`, 'error');
            console.error('URL fetch error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Get content type for file extension
     */
    getContentTypeFromExtension(type) {
        const types = {
            'text': 'text/plain',
            'markdown': 'text/markdown', 
            'html': 'text/html',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return types[type] || 'text/plain';
    }

    /**
     * Trigger file upload dialog
     */
    triggerFileUpload() {
        document.getElementById('fileInput').click();
    }

    /**
     * Select and apply template
     */
    selectTemplate(templateElement) {
        // Remove active class from all templates
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected template
        templateElement.classList.add('active');

        const templateName = templateElement.getAttribute('data-template');
        this.applyTemplate(templateName);
    }

    /**
     * Apply selected template
     */
    applyTemplate(templateName) {
        try {
            let html;
            
            if (this.currentDocument) {
                // Apply template with current document content
                const content = this.templateSystem.extractContentForTemplate(this.currentDocument, templateName);
                html = this.templateSystem.applyTemplate(templateName, content);
            } else {
                // Show template preview
                html = this.templateSystem.generatePreview(templateName);
            }

            document.getElementById('htmlEditor').value = html;
            this.currentTemplate = templateName;
            this.setStatus(`Template applied: ${templateName}`, 'success');
            
        } catch (error) {
            this.setStatus(`Error applying template: ${error.message}`, 'error');
        }
    }

    /**
     * Format HTML code in editor
     */
    formatCode() {
        const editor = document.getElementById('htmlEditor');
        const html = editor.value;
        
        try {
            // Basic HTML formatting
            const formatted = this.formatHTML(html);
            editor.value = formatted;
            this.setStatus('Code formatted successfully', 'success');
        } catch (error) {
            this.setStatus('Error formatting code', 'error');
        }
    }

    /**
     * Validate HTML
     */
    validateHTML() {
        const html = document.getElementById('htmlEditor').value;
        
        try {
            // Basic HTML validation
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const errors = doc.getElementsByTagName('parsererror');
            
            if (errors.length > 0) {
                this.setStatus('HTML validation failed: Invalid syntax', 'error');
            } else {
                this.setStatus('HTML validation passed', 'success');
            }
        } catch (error) {
            this.setStatus('HTML validation error', 'error');
        }
    }

    /**
     * Copy HTML to clipboard
     */
    async copyToClipboard() {
        const html = document.getElementById('htmlEditor').value;
        
        if (!html.trim()) {
            this.setStatus('No content to copy', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(html);
            this.setStatus('HTML copied to clipboard', 'success');
        } catch (error) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(html);
        }
    }

    /**
     * Fallback copy method
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.setStatus('HTML copied to clipboard', 'success');
        } catch (error) {
            this.setStatus('Failed to copy HTML', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * Download HTML as file
     */
    downloadHTML() {
        const html = document.getElementById('htmlEditor').value;
        
        if (!html.trim()) {
            this.setStatus('No content to download', 'warning');
            return;
        }

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const filename = this.currentDocument ? 
            (this.currentDocument.name || this.currentDocument.fileName || 'document').replace(/\.[^/.]+$/, '') + '.html' : 
            'document.html';
            
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.setStatus(`Downloaded: ${filename}`, 'success');
    }

    /**
     * Clear all content
     */
    clearAll() {
        if (this.isDirty && !confirm('Are you sure you want to clear all content? Unsaved changes will be lost.')) {
            return;
        }

        document.getElementById('htmlEditor').value = '';
        document.getElementById('fileInfo').textContent = '';
        document.getElementById('fileInput').value = '';
        
        // Reset template selection
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.currentDocument = null;
        this.currentTemplate = null;
        this.isDirty = false;
        
        this.updateWordCount();
        this.setStatus('All content cleared', 'info');
    }


    /**
     * Handle editor changes
     */
    onEditorChange() {
        this.isDirty = true;
        this.updateWordCount();
    }

    /**
     * Update word and character count
     */
    updateWordCount() {
        const content = document.getElementById('htmlEditor').value;
        const text = content.replace(/<[^>]*>/g, '').trim();
        
        const wordCount = text ? text.split(/\s+/).length : 0;
        const charCount = content.length;
        const lineCount = content.split('\n').length;
        
        document.getElementById('wordCount').textContent = wordCount;
        document.getElementById('charCount').textContent = charCount;
        document.getElementById('lineCount').textContent = lineCount;
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.downloadHTML();
                    break;
                case 'o':
                    event.preventDefault();
                    this.triggerFileUpload();
                    break;
                case 'Enter':
                    event.preventDefault();
                    this.formatCode();
                    break;
            }
        }
    }

    /**
     * Set status message
     */
    setStatus(message, type = 'info') {
        const statusBadge = document.getElementById('statusBadge');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = message;
        
        // Remove existing classes
        statusBadge.className = 'badge fs-6 px-3 py-2';
        
        // Add type-specific class
        switch (type) {
            case 'success':
                statusBadge.classList.add('bg-success');
                break;
            case 'error':
                statusBadge.classList.add('bg-danger');
                break;
            case 'warning':
                statusBadge.classList.add('bg-warning');
                break;
            case 'info':
            default:
                statusBadge.classList.add('bg-secondary');
                break;
        }
        
        statusBadge.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        // Auto-clear after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                this.setStatus('Ready', 'info');
            }, 5000);
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    /**
     * Format HTML string (basic implementation)
     */
    formatHTML(html) {
        let formatted = html;
        let indent = 0;
        const lines = html.split('\n');
        const result = [];
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            if (line.includes('</') && !line.includes('</'+ line.split('</')[1].split('>')[0] + '>')) {
                indent--;
            }
            
            result.push('  '.repeat(Math.max(0, indent)) + line);
            
            if (line.includes('<') && !line.includes('</') && !line.endsWith('/>')) {
                indent++;
            }
        }
        
        return result.join('\n');
    }


    /**
     * Initialize and update UI
     */
    updateUI() {
        this.updateWordCount();
        this.setStatus('Ready', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DocumentToHTMLIDE();
    console.log('Document to HTML IDE initialized successfully');
});

// Add CSS for Space-O Technologies styling in preview
const spaceOStyles = document.createElement('style');
spaceOStyles.textContent = `
/* Space-O Technologies Blog Styles */
.blog_index_cover {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    font-family: Arial, sans-serif;
}

.blog_index_toggle_btn {
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 15px;
    color: #333;
    cursor: pointer;
}

.blog_index {
    display: none;
    padding-left: 20px;
}

.blog_index.show {
    display: block;
}

.kta-list {
    background: #e8f4fd;
    border: 1px solid #b3d9ff;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    list-style: none;
}

.kta-list p {
    font-weight: bold;
    margin-bottom: 15px;
    color: #0066cc;
}

.kta-list li {
    margin: 10px 0;
    padding-left: 20px;
    position: relative;
}

.kta-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #28a745;
    font-weight: bold;
}

.callout_newbox, .callout_box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    margin: 30px 0;
    display: flex;
    align-items: center;
}

.callout_box {
    text-align: center;
    display: block;
}

.call_heading {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 15px;
}

.sec-btn {
    margin-top: 20px;
}

.btn {
    background: #ff6b35;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn:hover {
    background: #e55a2e;
    transform: translateY(-2px);
}

.listing-bx {
    counter-reset: item;
    padding-left: 0;
}

.listing-bx > li {
    display: block;
    margin: 20px 0;
    padding: 20px;
    background: #f8f9fa;
    border-left: 4px solid #007bff;
    border-radius: 4px;
    position: relative;
    counter-increment: item;
}

.listing-bx > li::before {
    content: counter(item);
    background: #007bff;
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: -15px;
    top: 20px;
    font-weight: bold;
}

.bullet-new-box {
    list-style: none;
    padding-left: 0;
}

.bullet-new-box li {
    margin: 10px 0;
    padding: 10px 15px 10px 35px;
    background: #f8f9fa;
    border-radius: 4px;
    position: relative;
}

.bullet-new-box li::before {
    content: '●';
    color: #007bff;
    position: absolute;
    left: 15px;
    font-size: 12px;
}

.faq_blog h2 {
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
    margin-bottom: 30px;
}

.faq_blog h3 {
    color: #444;
    margin-top: 25px;
    margin-bottom: 10px;
    font-size: 18px;
}

.comparison-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

.comparison-table th,
.comparison-table td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: left;
}

.table-header th {
    background: #007bff;
    color: white;
    font-weight: bold;
}

.expense_track .table {
    margin-bottom: 0;
}

.pros li::before {
    content: '✓';
    color: #28a745;
    margin-right: 8px;
}

.cons li::before {
    content: '✗';
    color: #dc3545;
    margin-right: 8px;
}

/* Toggle functionality */
.blog_index_toggle_btn:hover {
    color: #007bff;
}
`;

document.head.appendChild(spaceOStyles);

// Add toggle functionality for TOC
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('blog_index_toggle_btn')) {
        const toc = e.target.nextElementSibling;
        if (toc && toc.classList.contains('blog_index')) {
            // If no style is set, assume it's visible (block)
            const currentDisplay = toc.style.display || 'block';
            toc.style.display = currentDisplay === 'none' ? 'block' : 'none';
            
            // Update toggle button text
            const isVisible = toc.style.display === 'block';
            e.target.innerHTML = e.target.innerHTML.replace(/▼|▶/, isVisible ? '▼' : '▶');
        }
    }
});

// Initialize TOC toggle buttons with proper icons
document.addEventListener('DOMContentLoaded', function() {
    const tocButtons = document.querySelectorAll('.blog_index_toggle_btn');
    tocButtons.forEach(btn => {
        if (!btn.innerHTML.includes('▼') && !btn.innerHTML.includes('▶')) {
            btn.innerHTML += ' ▼';
        }
        btn.style.cursor = 'pointer';
    });
});
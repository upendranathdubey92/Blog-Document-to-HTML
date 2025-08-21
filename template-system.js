/**
 * Template System for Space-O Technologies Blog Format
 * Provides 5 professional templates with Space-O CSS classes
 */

class TemplateSystem {
    constructor() {
        this.templates = {
            'tech-blog': this.getTechBlogTemplate(),
            'product-showcase': this.getProductShowcaseTemplate(),
            'tutorial': this.getTutorialTemplate(),
            'case-study': this.getCaseStudyTemplate(),
            'faq': this.getFAQTemplate()
        };
    }

    /**
     * Get template by name
     * @param {string} templateName 
     * @returns {Object}
     */
    getTemplate(templateName) {
        return this.templates[templateName] || null;
    }

    /**
     * Get all available templates
     * @returns {Object}
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Apply template to content
     * @param {string} templateName 
     * @param {Object} content 
     * @returns {string}
     */
    applyTemplate(templateName, content) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        return this.populateTemplate(template, content);
    }

    /**
     * Tech Blog Post Template
     */
    getTechBlogTemplate() {
        return {
            name: 'Tech Blog Post',
            description: 'Complete article layout with TOC, content sections, CTAs, and FAQ',
            structure: [
                'table-of-contents',
                'key-takeaways',
                'introduction',
                'main-content',
                'cta-section',
                'faq-section',
                'conclusion'
            ],
            html: `
<!-- Key Takeaways -->
<ul class="kta-list">
    <p>Key Takeaways</p>
    <li>{{takeaway1}}</li>
    <li>{{takeaway2}}</li>
    <li>{{takeaway3}}</li>
</ul>

<!-- Table of Contents -->
<div class="blog_index_cover">
    <p class="blog_index_toggle_btn fonts-16 w-700">Table Of Contents</p>
    <ol class="blog_index" style="display: none;">
        {{toc_items}}
    </ol>
</div>

<!-- Main Content -->
<div class="blog-content">
    {{main_content}}
</div>

<!-- Call to Action 1 -->
<div class="callout_newbox">
    <div class="left-part">
        <p class="call_heading">{{cta_heading}}</p>
        <p>{{cta_description}}</p>
        <div class="sec-btn">
            <button class="btn mb0 mt15 open-qouteform" type="button" data-medium="B_1">{{cta_button_text}} <strong class="aero_icon"></strong></button>
        </div>
    </div>
    <div class="right-part">
        <img src="{{cta_image_url}}" alt="{{cta_image_alt}}" width="278" height="337" class="alignnone size-full wp-image-194985" />
    </div>
</div>

<!-- FAQ Section -->
<div class="faq_blog">
    <h2 id="faqs">Frequently Asked Questions</h2>
    {{faq_items}}
</div>

<!-- Call to Action 2 -->
<div class="callout_box">
    <p class="call_heading">{{final_cta_heading}}</p>
    {{final_cta_description}}
    <div class="sec-btn">
        <button class="btn mb0 mt15 newsletter-green" type="button" data-toggle="modal" data-target="#popform">{{final_cta_button}} <strong class="aero_icon"></strong></button>
    </div>
</div>
            `,
            defaults: {
                takeaway1: 'Comprehensive coverage of the latest technology trends and implementations',
                takeaway2: 'Real-world examples and case studies from industry experts',
                takeaway3: 'Actionable insights for immediate implementation in your projects',
                cta_heading: 'Want To Build Your Next Project?',
                cta_description: 'Get in touch with our experienced developers for a free consultation.',
                cta_button_text: 'Schedule Free Consultation',
                cta_image_url: 'https://www.spaceotechnologies.com/wp-content/uploads/2023/04/cta-img.png',
                cta_image_alt: 'CTA Image',
                final_cta_heading: 'Ready to Get Started?',
                final_cta_description: 'Discover the best approach to building your custom solution.',
                final_cta_button: 'Get Free Strategy Session'
            }
        };
    }

    /**
     * Product Showcase Template
     */
    getProductShowcaseTemplate() {
        return {
            name: 'Product Showcase',
            description: 'Feature comparison tables, pros/cons sections, and testimonials',
            structure: [
                'introduction',
                'feature-comparison',
                'pros-cons',
                'testimonials',
                'cta-section'
            ],
            html: `
<!-- Introduction -->
<div class="product-intro">
    <h1>{{product_title}}</h1>
    <p>{{product_description}}</p>
</div>

<!-- Feature Comparison Table -->
<table class="comparison-table table table-bordered">
    <thead>
        <tr class="table-header">
            <th>Feature</th>
            <th>{{product_name}}</th>
            <th>Competitor 1</th>
            <th>Competitor 2</th>
        </tr>
    </thead>
    <tbody>
        {{comparison_rows}}
    </tbody>
</table>

<!-- Pros and Cons -->
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
                        {{pros_list}}
                    </ul>
                </td>
                <td>
                    <ul class="cons" style="padding: 0; margin: 0;">
                        {{cons_list}}
                    </ul>
                </td>
            </tr>
        </tbody>
    </table>
</div>

<!-- Call to Action -->
<div class="callout_newbox">
    <div class="left-part">
        <p class="call_heading">{{cta_heading}}</p>
        <p>{{cta_description}}</p>
        <div class="sec-btn">
            <button class="btn mb0 mt15 open-qouteform" type="button">{{cta_button_text}} <strong class="aero_icon"></strong></button>
        </div>
    </div>
    <div class="right-part">
        <img src="{{cta_image_url}}" alt="{{cta_image_alt}}" width="278" height="337" />
    </div>
</div>
            `,
            defaults: {
                product_title: 'Product Showcase',
                product_description: 'Comprehensive comparison and analysis of features, benefits, and capabilities.',
                product_name: 'Our Solution',
                cta_heading: 'Interested in Our Product?',
                cta_description: 'Get a personalized demo and see how it can benefit your business.',
                cta_button_text: 'Request Demo',
                cta_image_url: 'https://www.spaceotechnologies.com/wp-content/uploads/2023/04/cta-img.png',
                cta_image_alt: 'Product Demo'
            }
        };
    }

    /**
     * Tutorial/Guide Template
     */
    getTutorialTemplate() {
        return {
            name: 'Tutorial/Guide',
            description: 'Step-by-step process documentation with numbered sections',
            structure: [
                'introduction',
                'prerequisites',
                'step-by-step',
                'conclusion',
                'cta-section'
            ],
            html: `
<!-- Introduction -->
<div class="tutorial-intro">
    <h1>{{tutorial_title}}</h1>
    <p>{{tutorial_description}}</p>
</div>

<!-- Prerequisites -->
<div class="prerequisites-section">
    <h2>Prerequisites</h2>
    <ul class="bullet-new-box">
        {{prerequisites_list}}
    </ul>
</div>

<!-- Step-by-Step Process -->
<div class="process-steps">
    <h2>Step-by-Step Guide</h2>
    <ol class="listing-bx">
        {{step_items}}
    </ol>
</div>

<!-- Key Points -->
<ul class="kta-list">
    <p>Key Points to Remember</p>
    {{key_points}}
</ul>

<!-- Call to Action -->
<div class="callout_box">
    <p class="call_heading">{{cta_heading}}</p>
    {{cta_description}}
    <div class="sec-btn">
        <button class="btn mb0 mt15 newsletter-green" type="button">{{cta_button_text}} <strong class="aero_icon"></strong></button>
    </div>
</div>
            `,
            defaults: {
                tutorial_title: 'Step-by-Step Tutorial',
                tutorial_description: 'A comprehensive guide to help you master the process from start to finish.',
                cta_heading: 'Need Professional Help?',
                cta_description: 'Our experts can guide you through the implementation process.',
                cta_button_text: 'Get Expert Assistance'
            }
        };
    }

    /**
     * Case Study Template
     */
    getCaseStudyTemplate() {
        return {
            name: 'Case Study',
            description: 'Challenge-solution-results format with metrics and testimonials',
            structure: [
                'overview',
                'challenge',
                'solution',
                'implementation',
                'results',
                'testimonial',
                'cta-section'
            ],
            html: `
<!-- Case Study Overview -->
<div class="case-study-overview">
    <h1>{{project_title}}</h1>
    <p class="lead">{{project_overview}}</p>
</div>

<!-- Project Details -->
<div class="project-details">
    <h2>Project Overview</h2>
    <ul class="bullet-new-box">
        <li><strong>Client:</strong> {{client_name}}</li>
        <li><strong>Industry:</strong> {{industry}}</li>
        <li><strong>Timeline:</strong> {{timeline}}</li>
        <li><strong>Team Size:</strong> {{team_size}}</li>
    </ul>
</div>

<!-- Challenge Section -->
<div class="challenge-section">
    <h2>The Challenge</h2>
    <p>{{challenge_description}}</p>
    <ul class="bullet-new-box">
        {{challenge_points}}
    </ul>
</div>

<!-- Solution Section -->
<div class="solution-section">
    <h2>Our Solution</h2>
    <p>{{solution_description}}</p>
    <ol class="listing-bx">
        {{solution_steps}}
    </ol>
</div>

<!-- Results Section -->
<div class="results-section">
    <h2>Results & Impact</h2>
    <div class="metrics-grid">
        {{results_metrics}}
    </div>
    <ul class="bullet-new-box">
        {{results_benefits}}
    </ul>
</div>

<!-- Client Testimonial -->
<blockquote class="client-testimonial">
    <p>"{{testimonial_text}}"</p>
    <footer>
        <strong>{{client_contact_name}}</strong><br>
        {{client_contact_title}}, {{client_name}}
    </footer>
</blockquote>

<!-- Call to Action -->
<div class="callout_newbox">
    <div class="left-part">
        <p class="call_heading">{{cta_heading}}</p>
        <p>{{cta_description}}</p>
        <div class="sec-btn">
            <button class="btn mb0 mt15 open-qouteform" type="button">{{cta_button_text}} <strong class="aero_icon"></strong></button>
        </div>
    </div>
    <div class="right-part">
        <img src="{{cta_image_url}}" alt="{{cta_image_alt}}" width="278" height="337" />
    </div>
</div>
            `,
            defaults: {
                project_title: 'Client Success Story',
                project_overview: 'How we helped our client achieve remarkable results through innovative solutions.',
                client_name: 'Client Company',
                industry: 'Technology',
                timeline: '6 months',
                team_size: '8 professionals',
                challenge_description: 'The client faced significant challenges that required innovative solutions.',
                solution_description: 'We developed a comprehensive approach to address all challenges.',
                testimonial_text: 'Working with this team was exceptional. They delivered beyond our expectations.',
                client_contact_name: 'John Smith',
                client_contact_title: 'CTO',
                cta_heading: 'Ready for Similar Results?',
                cta_description: 'Let us help you achieve your business goals with proven strategies.',
                cta_button_text: 'Start Your Project',
                cta_image_url: 'https://www.spaceotechnologies.com/wp-content/uploads/2023/04/cta-img.png',
                cta_image_alt: 'Project Success'
            }
        };
    }

    /**
     * FAQ Page Template
     */
    getFAQTemplate() {
        return {
            name: 'FAQ Page',
            description: 'Structured question/answer format with collapsible sections',
            structure: [
                'introduction',
                'faq-categories',
                'faq-items',
                'contact-cta'
            ],
            html: `
<!-- FAQ Introduction -->
<div class="faq-intro">
    <h1>{{faq_title}}</h1>
    <p>{{faq_description}}</p>
</div>

<!-- FAQ Categories (if applicable) -->
<div class="faq-categories">
    <h2>Categories</h2>
    <ul class="bullet-new-box">
        {{category_list}}
    </ul>
</div>

<!-- FAQ Section -->
<div class="faq_blog">
    <h2 id="faqs">{{faq_section_title}}</h2>
    {{faq_items}}
</div>

<!-- Still Have Questions CTA -->
<div class="callout_box">
    <p class="call_heading">{{cta_heading}}</p>
    {{cta_description}}
    <div class="sec-btn">
        <button class="btn mb0 mt15 newsletter-green" type="button" data-toggle="modal" data-target="#popform">{{cta_button_text}} <strong class="aero_icon"></strong></button>
    </div>
</div>
            `,
            defaults: {
                faq_title: 'Frequently Asked Questions',
                faq_description: 'Find answers to common questions about our services and solutions.',
                faq_section_title: 'Common Questions',
                cta_heading: 'Still Have Questions?',
                cta_description: 'Our team is here to help with any additional questions you may have.',
                cta_button_text: 'Contact Support'
            }
        };
    }

    /**
     * Populate template with content
     * @param {Object} template 
     * @param {Object} content 
     * @returns {string}
     */
    populateTemplate(template, content) {
        let html = template.html;

        // Merge defaults with provided content
        const data = { ...template.defaults, ...content };

        // Replace all placeholders
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = data[key] || '';
            html = html.replace(new RegExp(placeholder, 'g'), value);
        });

        return html;
    }

    /**
     * Generate template preview
     * @param {string} templateName 
     * @returns {string}
     */
    generatePreview(templateName) {
        const template = this.getTemplate(templateName);
        if (!template) return '';

        return this.populateTemplate(template, {});
    }

    /**
     * Extract content structure for template population
     * @param {Object} parsedDocument 
     * @param {string} templateName 
     * @returns {Object}
     */
    extractContentForTemplate(parsedDocument, templateName) {
        const template = this.getTemplate(templateName);
        if (!template) return {};

        const content = {};
        const structure = parsedDocument.structure;

        // Generate TOC items
        if (structure.headings && structure.headings.length > 0) {
            content.toc_items = structure.headings.map((heading, index) => {
                const id = this.generateId(heading.text);
                return `<li><a href="#${id}">${heading.text}</a></li>`;
            }).join('\n        ');
        }

        // Generate FAQ items from questions
        if (templateName === 'faq' && structure.headings) {
            content.faq_items = structure.headings
                .filter(h => h.text.endsWith('?'))
                .map((question, index) => {
                    const id = this.generateId(question.text);
                    const answer = this.findAnswerForQuestion(question, structure.paragraphs);
                    return `<h3 id="${id}">${question.text}</h3>\n<p>${answer}</p>`;
                }).join('\n    ');
        }

        // Generate step items for tutorials
        if (templateName === 'tutorial' && structure.lists) {
            const stepsList = structure.lists.find(list => list.type === 'ordered');
            if (stepsList) {
                content.step_items = stepsList.items.map((step, index) => 
                    `<li><h3>Step ${index + 1}</h3><p>${step}</p></li>`
                ).join('\n        ');
            }
        }

        // Main content
        content.main_content = parsedDocument.html;

        return content;
    }

    /**
     * Helper functions
     */
    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    findAnswerForQuestion(question, paragraphs) {
        // Simple heuristic: find paragraph after question
        const questionIndex = question.line;
        const answer = paragraphs.find(p => p.line > questionIndex && p.line < questionIndex + 5);
        return answer ? answer.text : 'Answer content goes here...';
    }
}

// Export for use in main application
window.TemplateSystem = TemplateSystem;
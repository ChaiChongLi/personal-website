/**
 * PDF and Word Document Generation Service
 *
 * Generates professional resume documents in PDF and Word formats.
 * Uses Puppeteer for PDF generation from HTML and docx library for Word files.
 *
 * Features:
 * - Professional HTML resume template
 * - PDF generation with page formatting
 * - Word document generation with proper styles
 * - Docker-compatible Puppeteer configuration
 */

const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, convertInchesToTwip, Table, TableCell, TableRow, BorderStyle } = require('docx');
const logger = require('../utils/logger');
const fs = require('fs');

/**
 * Generate professional HTML resume from resume data
 *
 * Creates a clean, well-formatted HTML resume with embedded CSS styling.
 * Suitable for conversion to PDF or display in browser.
 *
 * @param {Object} resumeData - Resume profile object with parsed JSON fields
 *   Expected fields: personal_info, work_experience, education, skills, certifications, projects, summary
 * @returns {string} Complete HTML document
 */
const generateResumeHTML = (resumeData) => {
  const personalInfo = resumeData.personal_info || {};
  const workExperience = resumeData.work_experience || [];
  const education = resumeData.education || [];
  const skills = resumeData.skills || [];
  const certifications = resumeData.certifications || [];
  const projects = resumeData.projects || [];
  const summary = resumeData.summary || '';

  // Build HTML sections dynamically
  let workExperienceHTML = '';
  if (workExperience.length > 0) {
    workExperienceHTML = `
      <section class="section">
        <h2>Work Experience</h2>
        ${workExperience.map(job => `
          <div class="entry">
            <div class="entry-header">
              <strong>${job.position}</strong> at ${job.company}
              <span class="date">${job.start_date}${job.end_date ? ' - ' + job.end_date : ' - Present'}</span>
            </div>
            ${job.description ? `<p class="description">${job.description}</p>` : ''}
            ${job.responsibilities ? `<ul>${job.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  let educationHTML = '';
  if (education.length > 0) {
    educationHTML = `
      <section class="section">
        <h2>Education</h2>
        ${education.map(edu => `
          <div class="entry">
            <div class="entry-header">
              <strong>${edu.degree}${edu.field ? ' in ' + edu.field : ''}</strong>
              <span class="date">${edu.graduation_date}</span>
            </div>
            <p>${edu.institution}</p>
            ${edu.details ? `<p class="description">${edu.details}</p>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  let skillsHTML = '';
  if (skills.length > 0) {
    skillsHTML = `
      <section class="section">
        <h2>Skills</h2>
        <div class="skills-grid">
          ${skills.map(skill => `
            <div class="skill-item">
              <strong>${skill.skill_name}</strong>
              ${skill.proficiency_level ? `<span class="proficiency">${skill.proficiency_level}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  let certificationsHTML = '';
  if (certifications.length > 0) {
    certificationsHTML = `
      <section class="section">
        <h2>Certifications</h2>
        ${certifications.map(cert => `
          <div class="entry">
            <div class="entry-header">
              <strong>${cert.name}</strong> - ${cert.issuer}
              <span class="date">${cert.issue_date}${cert.expiry_date ? ' - ' + cert.expiry_date : ''}</span>
            </div>
            ${cert.credential_id ? `<p class="credential">Credential ID: ${cert.credential_id}</p>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  let projectsHTML = '';
  if (projects.length > 0) {
    projectsHTML = `
      <section class="section">
        <h2>Projects</h2>
        ${projects.map(project => `
          <div class="entry">
            <div class="entry-header">
              <strong>${project.name}</strong>
              ${project.url ? `<span class="link"><a href="${project.url}" target="_blank">View Project</a></span>` : ''}
            </div>
            ${project.description ? `<p class="description">${project.description}</p>` : ''}
            ${project.technologies ? `<p class="tech"><strong>Technologies:</strong> ${project.technologies.join(', ')}</p>` : ''}
            ${project.start_date ? `<p class="date">${project.start_date}${project.end_date ? ' - ' + project.end_date : ''}</p>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo.name || 'Resume'}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20mm;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 15px;
        }

        .header h1 {
          font-size: 28px;
          margin-bottom: 5px;
          color: #1a1a1a;
        }

        .header .contact-info {
          font-size: 12px;
          color: #666;
        }

        .contact-info a {
          color: #0066cc;
          text-decoration: none;
          margin: 0 5px;
        }

        .summary {
          background: #f5f5f5;
          padding: 12px;
          margin: 15px 0;
          border-left: 3px solid #0066cc;
          font-size: 14px;
          line-height: 1.5;
        }

        .section {
          margin-bottom: 20px;
        }

        .section h2 {
          font-size: 16px;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
          color: #0066cc;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .entry {
          margin-bottom: 15px;
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 5px;
        }

        .entry-header strong {
          font-weight: 600;
        }

        .date {
          font-size: 12px;
          color: #666;
          margin-left: 10px;
        }

        .description {
          font-size: 13px;
          color: #555;
          margin: 5px 0;
        }

        .entry ul {
          margin: 8px 0 8px 20px;
          font-size: 13px;
        }

        .entry li {
          margin-bottom: 4px;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          font-size: 13px;
        }

        .skill-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f9f9f9;
        }

        .proficiency {
          color: #0066cc;
          font-weight: 500;
        }

        .credential {
          font-size: 12px;
          color: #666;
          margin-top: 3px;
        }

        .tech {
          font-size: 12px;
          color: #555;
          margin: 5px 0;
        }

        .link {
          margin-left: 10px;
        }

        .link a {
          color: #0066cc;
          text-decoration: none;
          font-size: 12px;
        }

        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${personalInfo.name || 'Your Name'}</h1>
        <div class="contact-info">
          ${personalInfo.email ? `<span>${personalInfo.email}</span>` : ''}
          ${personalInfo.phone ? `<span>${personalInfo.phone}</span>` : ''}
          ${personalInfo.location ? `<span>${personalInfo.location}</span>` : ''}
          ${personalInfo.portfolio_url ? `<a href="${personalInfo.portfolio_url}" target="_blank">Portfolio</a>` : ''}
          ${personalInfo.github_url ? `<a href="${personalInfo.github_url}" target="_blank">GitHub</a>` : ''}
          ${personalInfo.linkedin_url ? `<a href="${personalInfo.linkedin_url}" target="_blank">LinkedIn</a>` : ''}
        </div>
      </div>

      ${summary ? `<div class="summary">${summary}</div>` : ''}

      ${workExperienceHTML}
      ${educationHTML}
      ${skillsHTML}
      ${projectsHTML}
      ${certificationsHTML}
    </body>
    </html>
  `;
};

/**
 * Generate PDF from resume data
 *
 * Uses Puppeteer to render HTML as PDF.
 * Configured for Docker environments with fallback to system Chromium.
 *
 * @param {Object} resumeData - Resume profile object
 * @returns {Promise<Buffer>} PDF file as Buffer
 * @throws {Error} If PDF generation fails
 */
const generatePDF = async (resumeData) => {
  let browser;
  try {
    logger.info('Generating PDF resume');

    // Launch Puppeteer with Docker-friendly options
    const launchOptions = {
      // For Docker containers - use system Chromium instead of downloading
      args: [
        '--no-sandbox', // Disable sandbox for Docker
        '--disable-setuid-sandbox'
      ]
    };

    // Use custom executable path if set in environment
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set page size to A4 with standard margins
    const htmlContent = generateResumeHTML(resumeData);

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF with A4 formatting
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      // Print background colors and images
      printBackground: true
    });

    await browser.close();
    logger.info('PDF resume generated successfully');
    return pdfBuffer;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    logger.error('Error generating PDF:', error.message);
    throw error;
  }
};

/**
 * Generate Word document from resume data
 *
 * Uses docx library to create a proper Word document with styles.
 * Includes sections for all resume components.
 *
 * @param {Object} resumeData - Resume profile object
 * @returns {Promise<Buffer>} Word document as Buffer
 * @throws {Error} If Word document generation fails
 */
const generateWordDoc = async (resumeData) => {
  try {
    logger.info('Generating Word document resume');

    const personalInfo = resumeData.personal_info || {};
    const workExperience = resumeData.work_experience || [];
    const education = resumeData.education || [];
    const skills = resumeData.skills || [];
    const certifications = resumeData.certifications || [];
    const projects = resumeData.projects || [];
    const summary = resumeData.summary || '';

    const sections = [];

    // Header with contact info
    sections.push(
      new Paragraph({
        text: personalInfo.name || 'Your Name',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 }
      })
    );

    // Contact information
    const contactLines = [];
    if (personalInfo.email) contactLines.push(personalInfo.email);
    if (personalInfo.phone) contactLines.push(personalInfo.phone);
    if (personalInfo.location) contactLines.push(personalInfo.location);
    if (personalInfo.github_url) contactLines.push(`GitHub: ${personalInfo.github_url}`);
    if (personalInfo.linkedin_url) contactLines.push(`LinkedIn: ${personalInfo.linkedin_url}`);

    if (contactLines.length > 0) {
      sections.push(
        new Paragraph({
          text: contactLines.join(' | '),
          spacing: { after: 300 }
        })
      );
    }

    // Professional Summary
    if (summary) {
      sections.push(
        new Paragraph({
          text: 'Professional Summary',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        }),
        new Paragraph({
          text: summary,
          spacing: { after: 300 }
        })
      );
    }

    // Work Experience
    if (workExperience.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Work Experience',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        })
      );

      for (const job of workExperience) {
        sections.push(
          new Paragraph({
            text: `${job.position} at ${job.company}`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `${job.start_date}${job.end_date ? ' - ' + job.end_date : ' - Present'}`,
            spacing: { after: 50 }
          })
        );

        if (job.description) {
          sections.push(
            new Paragraph({
              text: job.description,
              spacing: { after: 50 }
            })
          );
        }

        sections.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    }

    // Education
    if (education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Education',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        })
      );

      for (const edu of education) {
        sections.push(
          new Paragraph({
            text: `${edu.degree}${edu.field ? ' in ' + edu.field : ''}`,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: edu.institution,
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: `Graduation: ${edu.graduation_date}`,
            spacing: { after: 100 }
          })
        );
      }
    }

    // Skills
    if (skills.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Skills',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        })
      );

      const skillsText = skills
        .map(s => `${s.skill_name}${s.proficiency_level ? ' (' + s.proficiency_level + ')' : ''}`)
        .join(' • ');

      sections.push(
        new Paragraph({
          text: skillsText,
          spacing: { after: 300 }
        })
      );
    }

    // Projects
    if (projects.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Projects',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        })
      );

      for (const project of projects) {
        sections.push(
          new Paragraph({
            text: project.name,
            spacing: { after: 50 }
          })
        );

        if (project.description) {
          sections.push(
            new Paragraph({
              text: project.description,
              spacing: { after: 50 }
            })
          );
        }

        sections.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    }

    // Certifications
    if (certifications.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Certifications',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        })
      );

      for (const cert of certifications) {
        sections.push(
          new Paragraph({
            text: `${cert.name} - ${cert.issuer}`,
            spacing: { after: 50 }
          })
        );
      }
    }

    // Create document
    const doc = new Document({
      sections: [{
        children: sections
      }]
    });

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);
    logger.info('Word document resume generated successfully');
    return buffer;
  } catch (error) {
    logger.error('Error generating Word document:', error.message);
    throw error;
  }
};

module.exports = {
  generateResumeHTML,
  generatePDF,
  generateWordDoc
};

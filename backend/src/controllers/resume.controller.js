/**
 * Resume Controller
 *
 * Handles resume profile management and document generation.
 * Supports creating multiple resume versions and downloading as PDF or Word.
 *
 * Routes:
 * - GET /: List all resume profiles
 * - GET /:id: Get single resume profile
 * - POST /: Create new resume profile
 * - PUT /:id: Update resume profile
 * - DELETE /:id: Delete resume profile
 * - GET /:id/download/pdf: Download resume as PDF
 * - GET /:id/download/word: Download resume as Word doc
 */

const { sendSuccess, sendError } = require('../utils/response.helper');
const resumeModel = require('../models/resume.model');
const pdfService = require('../services/pdf.service');
const logger = require('../utils/logger');

/**
 * Get all resume profiles for authenticated user
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const getProfiles = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all resumes for user
    const resumes = await resumeModel.getAllByUserId(userId);

    logger.info(`Retrieved ${resumes.length} resume profiles for user: ${userId}`);

    return sendSuccess(
      res,
      resumes,
      'Resume profiles retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get profiles error:', error.message);
    return sendError(res, 'Failed to retrieve resume profiles', 500);
  }
};

/**
 * Get single resume profile by ID
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get resume with ownership verification
    const resume = await resumeModel.getById(id, userId);

    if (!resume) {
      logger.warn(`User attempted to access non-existent resume: ${id}`);
      return sendError(res, 'Resume not found', 404);
    }

    logger.info(`Resume profile retrieved: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      resume,
      'Resume profile retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get profile error:', error.message);
    return sendError(res, 'Failed to retrieve resume profile', 500);
  }
};

/**
 * Create new resume profile
 *
 * @param {Object} req - Express request with body containing resume data
 * @param {Object} res - Express response
 */
const createProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      profile_name,
      personal_info,
      work_experience,
      education,
      skills,
      certifications,
      projects,
      summary
    } = req.body;

    if (!profile_name) {
      return sendError(res, 'Profile name is required', 400);
    }

    // Create resume
    const resumeId = await resumeModel.create(
      userId,
      profile_name,
      personal_info || {},
      work_experience || [],
      education || [],
      skills || [],
      certifications || [],
      projects || [],
      summary || ''
    );

    logger.info(`Resume profile created: ${resumeId} for user: ${userId}`);

    return sendSuccess(
      res,
      { id: resumeId, profile_name },
      'Resume profile created successfully',
      201
    );
  } catch (error) {
    logger.error('Create profile error:', error.message);
    return sendError(res, 'Failed to create resume profile', 500);
  }
};

/**
 * Update existing resume profile
 *
 * @param {Object} req - Express request with params: {id} and body with fields to update
 * @param {Object} res - Express response
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify resume exists and user owns it
    const resume = await resumeModel.getById(id, userId);
    if (!resume) {
      logger.warn(`User attempted to update non-existent resume: ${id}`);
      return sendError(res, 'Resume not found', 404);
    }

    // Update resume
    const success = await resumeModel.update(id, userId, updates);

    if (!success) {
      logger.warn(`Failed to update resume: ${id}`);
      return sendError(res, 'Failed to update resume', 400);
    }

    logger.info(`Resume profile updated: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id, ...updates },
      'Resume profile updated successfully',
      200
    );
  } catch (error) {
    logger.error('Update profile error:', error.message);
    return sendError(res, 'Failed to update resume profile', 500);
  }
};

/**
 * Delete resume profile
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify resume exists and user owns it
    const resume = await resumeModel.getById(id, userId);
    if (!resume) {
      logger.warn(`User attempted to delete non-existent resume: ${id}`);
      return sendError(res, 'Resume not found', 404);
    }

    // Delete resume
    const success = await resumeModel.deleteResume(id, userId);

    if (!success) {
      logger.warn(`Failed to delete resume: ${id}`);
      return sendError(res, 'Failed to delete resume', 400);
    }

    logger.info(`Resume profile deleted: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id },
      'Resume profile deleted successfully',
      200
    );
  } catch (error) {
    logger.error('Delete profile error:', error.message);
    return sendError(res, 'Failed to delete resume profile', 500);
  }
};

/**
 * Download resume as PDF
 *
 * Generates PDF from resume data and streams to client.
 * Sets appropriate headers for file download.
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const downloadPDF = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get resume
    const resume = await resumeModel.getById(id, userId);
    if (!resume) {
      logger.warn(`User attempted to download non-existent resume: ${id}`);
      return sendError(res, 'Resume not found', 404);
    }

    logger.info(`Generating PDF for resume: ${id}`);

    // Generate PDF
    const pdfBuffer = await pdfService.generatePDF(resume);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.profile_name || 'resume'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`PDF downloaded for resume: ${id}`);

    // Send PDF buffer
    return res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF download error:', error.message);
    return sendError(res, 'Failed to generate PDF', 500);
  }
};

/**
 * Download resume as Word document
 *
 * Generates Word document from resume data and streams to client.
 * Sets appropriate headers for file download.
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const downloadWord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get resume
    const resume = await resumeModel.getById(id, userId);
    if (!resume) {
      logger.warn(`User attempted to download non-existent resume: ${id}`);
      return sendError(res, 'Resume not found', 404);
    }

    logger.info(`Generating Word document for resume: ${id}`);

    // Generate Word document
    const docBuffer = await pdfService.generateWordDoc(resume);

    // Set response headers for Word document download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.profile_name || 'resume'}.docx"`);
    res.setHeader('Content-Length', docBuffer.length);

    logger.info(`Word document downloaded for resume: ${id}`);

    // Send document buffer
    return res.send(docBuffer);
  } catch (error) {
    logger.error('Word document download error:', error.message);
    return sendError(res, 'Failed to generate Word document', 500);
  }
};

module.exports = {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  downloadPDF,
  downloadWord
};

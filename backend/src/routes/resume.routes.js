/**
 * Resume Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 * Handles resume profile CRUD operations and document generation.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const resumeController = require('../controllers/resume.controller');

const router = express.Router();

/**
 * GET /resume/
 * Get all resume profiles for authenticated user
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: number,
 *       user_id: string,
 *       profile_name: string,
 *       personal_info: object,
 *       work_experience: array,
 *       education: array,
 *       skills: array,
 *       certifications: array,
 *       projects: array,
 *       summary: string,
 *       created_at: timestamp,
 *       updated_at: timestamp
 *     }
 *   ]
 * }
 */
router.get('/',
  verifyAccessToken,
  resumeController.getProfiles
);

/**
 * GET /resume/:id
 * Get single resume profile by ID
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (resume profile ID)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {id, user_id, profile_name, personal_info, work_experience, ...}
 * }
 */
router.get('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.getProfile
);

/**
 * POST /resume/
 * Create new resume profile
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Request body:
 * - profile_name: string (required, name for this resume version)
 * - personal_info: object (optional)
 *   {name, email, phone, location, linkedin_url, github_url, portfolio_url}
 * - work_experience: array (optional)
 *   [{company, position, start_date, end_date, description, responsibilities}]
 * - education: array (optional)
 *   [{institution, degree, field, graduation_date, details}]
 * - skills: array (optional)
 *   [{skill_name, proficiency_level, years_of_experience}]
 * - certifications: array (optional)
 *   [{name, issuer, issue_date, expiry_date, credential_id}]
 * - projects: array (optional)
 *   [{name, description, technologies, url, start_date, end_date}]
 * - summary: string (optional, professional summary)
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {id, profile_name}
 * }
 */
router.post('/',
  verifyAccessToken,
  body('profile_name')
    .trim()
    .notEmpty()
    .withMessage('Profile name is required')
    .isLength({ max: 255 })
    .withMessage('Profile name must be 255 characters or less'),
  body('personal_info')
    .optional()
    .isObject()
    .withMessage('Personal info must be an object'),
  body('work_experience')
    .optional()
    .isArray()
    .withMessage('Work experience must be an array'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  body('projects')
    .optional()
    .isArray()
    .withMessage('Projects must be an array'),
  body('summary')
    .optional()
    .trim(),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.createProfile
);

/**
 * PUT /resume/:id
 * Update resume profile
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (resume profile ID)
 *
 * Request body (all optional):
 * - profile_name: string
 * - personal_info: object
 * - work_experience: array
 * - education: array
 * - skills: array
 * - certifications: array
 * - projects: array
 * - summary: string
 *
 * Response: 200 OK
 * {success: true, data: {id, ...updated fields}}
 */
router.put('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  body('profile_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Profile name must be 255 characters or less'),
  body('personal_info')
    .optional()
    .isObject()
    .withMessage('Personal info must be an object'),
  body('work_experience')
    .optional()
    .isArray()
    .withMessage('Work experience must be an array'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  body('projects')
    .optional()
    .isArray()
    .withMessage('Projects must be an array'),
  body('summary')
    .optional()
    .trim(),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.updateProfile
);

/**
 * DELETE /resume/:id
 * Delete resume profile
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (resume profile ID)
 *
 * Response: 200 OK
 * {success: true, data: {id}}
 */
router.delete('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.deleteProfile
);

/**
 * GET /resume/:id/download/pdf
 * Download resume as PDF file
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (resume profile ID)
 *
 * Response: 200 OK with PDF binary data
 * Content-Type: application/pdf
 * Content-Disposition: attachment; filename="resume-name.pdf"
 */
router.get('/:id/download/pdf',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.downloadPDF
);

/**
 * GET /resume/:id/download/word
 * Download resume as Word document
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (resume profile ID)
 *
 * Response: 200 OK with Word document binary data
 * Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * Content-Disposition: attachment; filename="resume-name.docx"
 */
router.get('/:id/download/word',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  resumeController.downloadWord
);

module.exports = router;

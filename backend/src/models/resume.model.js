/**
 * Resume Profiles Model
 *
 * Manages user's resume profiles with comprehensive career information stored as JSON.
 * Allows users to maintain multiple resume versions for different job applications.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * Methods:
 * - getAllByUserId(userId): get all resume profiles for user
 * - getById(id, userId): get single resume with ownership verification
 * - create(...): create new resume profile
 * - update(id, userId, updates): modify resume
 * - delete(id, userId): remove resume
 */

const { pool } = require('../config/database');

/**
 * Parse JSON fields from database
 *
 * Safely parses JSON fields with fallback to empty arrays/objects if parse fails.
 *
 * @param {Object} resume - Resume object from database
 * @returns {Object} Resume object with parsed JSON fields
 */
const parseResume = (resume) => {
  return {
    ...resume,
    personal_info: resume.personal_info ? JSON.parse(resume.personal_info) : {},
    work_experience: resume.work_experience ? JSON.parse(resume.work_experience) : [],
    education: resume.education ? JSON.parse(resume.education) : [],
    skills: resume.skills ? JSON.parse(resume.skills) : [],
    certifications: resume.certifications ? JSON.parse(resume.certifications) : [],
    projects: resume.projects ? JSON.parse(resume.projects) : []
  };
};

/**
 * Get all resume profiles for a user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of resume objects with parsed JSON fields
 * @throws {Error} If database query fails
 */
const getAllByUserId = async (userId) => {
  try {
    const query = `
      SELECT id, user_id, profile_name, personal_info, work_experience, education,
             skills, certifications, projects, summary, created_at, updated_at
      FROM resume_profiles
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows.map(parseResume);
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single resume profile by ID with ownership verification
 *
 * @param {number} id - Resume profile ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object|null>} Resume object with parsed JSON fields or null
 * @throws {Error} If database query fails
 */
const getById = async (id, userId) => {
  try {
    const query = `
      SELECT id, user_id, profile_name, personal_info, work_experience, education,
             skills, certifications, projects, summary, created_at, updated_at
      FROM resume_profiles
      WHERE id = ? AND user_id = ?
    `;
    const [rows] = await pool.execute(query, [id, userId]);
    return rows.length > 0 ? parseResume(rows[0]) : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new resume profile
 *
 * @param {string} userId - User UUID
 * @param {string} profileName - Name for this resume version
 * @param {Object} personalInfo - Personal information object
 *   Example: {name, email, phone, location, linkedin_url, github_url, portfolio_url}
 * @param {Array} workExperience - Array of work experience entries
 *   Example: [{company, position, start_date, end_date, description, responsibilities}]
 * @param {Array} education - Array of education entries
 *   Example: [{institution, degree, field, graduation_date, details}]
 * @param {Array} skills - Array of skill entries
 *   Example: [{skill_name, proficiency_level, years_of_experience}]
 * @param {Array} certifications - Array of certification entries
 *   Example: [{name, issuer, issue_date, expiry_date, credential_id}]
 * @param {Array} projects - Array of project entries
 *   Example: [{name, description, technologies, url, start_date, end_date}]
 * @param {string} summary - Professional summary/objective statement
 * @returns {Promise<number>} ID of inserted resume
 * @throws {Error} If insertion fails
 */
const create = async (
  userId,
  profileName,
  personalInfo = {},
  workExperience = [],
  education = [],
  skills = [],
  certifications = [],
  projects = [],
  summary = ''
) => {
  try {
    // Convert all JSON fields to strings
    const personalInfoJson = JSON.stringify(personalInfo);
    const workExperienceJson = JSON.stringify(workExperience);
    const educationJson = JSON.stringify(education);
    const skillsJson = JSON.stringify(skills);
    const certificationsJson = JSON.stringify(certifications);
    const projectsJson = JSON.stringify(projects);

    const query = `
      INSERT INTO resume_profiles (
        user_id, profile_name, personal_info, work_experience, education,
        skills, certifications, projects, summary, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const [result] = await pool.execute(query, [
      userId,
      profileName,
      personalInfoJson,
      workExperienceJson,
      educationJson,
      skillsJson,
      certificationsJson,
      projectsJson,
      summary
    ]);

    return result.insertId;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing resume profile
 *
 * @param {number} id - Resume profile ID
 * @param {string} userId - User UUID (for ownership verification)
 * @param {Object} updates - Object with fields to update
 *   Supported fields: profile_name, personal_info, work_experience, education,
 *   skills, certifications, projects, summary
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If update fails
 */
const update = async (id, userId, updates) => {
  try {
    // Define allowed fields for update
    const allowedFields = [
      'profile_name',
      'personal_info',
      'work_experience',
      'education',
      'skills',
      'certifications',
      'projects',
      'summary'
    ];

    const updateFields = [];
    const values = [];

    // Build dynamic UPDATE query
    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        // Convert objects/arrays to JSON
        const value = updates[field];
        if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    // Always update timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) {
      // Only updated_at was set
      return true;
    }

    values.push(id);
    values.push(userId);

    const query = `
      UPDATE resume_profiles
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a resume profile
 *
 * @param {number} id - Resume profile ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<boolean>} true if deletion successful
 * @throws {Error} If deletion fails
 */
const deleteResume = async (id, userId) => {
  try {
    const query = `
      DELETE FROM resume_profiles
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllByUserId,
  getById,
  create,
  update,
  deleteResume
};

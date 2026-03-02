-- Personal Website Database Schema
-- This SQL file creates all necessary tables with proper indexes, constraints, and a default admin user.
-- Run this on your MySQL database to initialize the schema.

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS personal_website;
USE personal_website;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user account information with UUID primary key for security and scalability.
-- Includes timestamp tracking for audit purposes.
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT 'UUID primary key for user identification',
  username VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique username for login',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique email address for recovery and contact',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password (never store plaintext)',
  refresh_token LONGTEXT COMMENT 'JWT refresh token for session management, stored server-side for revocation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last account update timestamp',
  INDEX idx_email (email) COMMENT 'Index for fast email lookups during login',
  INDEX idx_username (username) COMMENT 'Index for fast username lookups'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts with secure password storage and token management';

-- ============================================================================
-- STOCK WATCHLIST TABLE
-- ============================================================================
-- Tracks user's stock watchlist with market identifiers and custom notes.
-- Foreign key ensures referential integrity with users table.
CREATE TABLE IF NOT EXISTS stock_watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  user_id VARCHAR(36) NOT NULL COMMENT 'UUID foreign key to users table',
  symbol VARCHAR(10) NOT NULL COMMENT 'Stock ticker symbol (e.g., AAPL, MSFT)',
  market VARCHAR(10) NOT NULL COMMENT 'Exchange code: KLSE, NASDAQ, NYSE, SGX, HKEX (or legacy MY/US/SG)',
  company_name VARCHAR(255) COMMENT 'Full company name for reference',
  notes LONGTEXT COMMENT 'User custom notes/alias for the stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When stock was added to watchlist',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = active, 1 = deleted',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_stock (user_id, symbol, market) COMMENT 'Prevent duplicate entries for same user/stock/market',
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup of user watchlists',
  INDEX idx_is_deleted (is_deleted) COMMENT 'Fast filtering of soft-deleted records'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock watchlist entries with market classification';

-- ============================================================================
-- TODO ITEMS TABLE
-- ============================================================================
-- Task management system with priority levels, status tracking, and due dates.
-- Supports filtering and sorting by multiple criteria.
CREATE TABLE IF NOT EXISTS todo_items (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  user_id VARCHAR(36) NOT NULL COMMENT 'UUID foreign key to users table',
  title VARCHAR(255) NOT NULL COMMENT 'Task title/summary',
  description LONGTEXT COMMENT 'Detailed task description',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT 'Task priority level',
  status ENUM('pending', 'in_progress', 'done') DEFAULT 'pending' COMMENT 'Current task status',
  due_date DATE COMMENT 'Optional due date for the task',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = active, 1 = deleted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When task was created',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup of user todos',
  INDEX idx_status (status) COMMENT 'Fast filtering by status',
  INDEX idx_priority (priority) COMMENT 'Fast filtering by priority',
  INDEX idx_is_deleted (is_deleted) COMMENT 'Fast filtering of soft-deleted records'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Todo/task items with priority and status tracking (soft delete via is_deleted)';

-- ============================================================================
-- TOOLS/BOOKMARKS TABLE
-- ============================================================================
-- Stores bookmarks to useful development tools and resources.
-- Tags are stored as JSON for flexible tagging without separate junction table.
CREATE TABLE IF NOT EXISTS tools (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  user_id VARCHAR(36) NOT NULL COMMENT 'UUID foreign key to users table',
  name VARCHAR(255) NOT NULL COMMENT 'Tool/resource name',
  github_url VARCHAR(500) COMMENT 'GitHub repository URL if applicable',
  description LONGTEXT COMMENT 'Description of what the tool does',
  tags JSON COMMENT 'Array of tags for categorization and search',
  category VARCHAR(100) COMMENT 'Tool category (e.g., monitoring, deployment, testing)',
  is_favorite BOOLEAN DEFAULT FALSE COMMENT 'Star/favorite flag for quick access',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = active, 1 = deleted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When tool was added',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup of user tools',
  INDEX idx_category (category) COMMENT 'Fast filtering by category',
  INDEX idx_is_favorite (is_favorite) COMMENT 'Fast lookup of favorite tools',
  INDEX idx_is_deleted (is_deleted) COMMENT 'Fast filtering of soft-deleted records'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bookmarks and tools reference with categorization';

-- ============================================================================
-- RESUME PROFILES TABLE
-- ============================================================================
-- Stores multiple resume profiles with complete career information.
-- Uses JSON for flexible storage of arrays and structured data (work experience, education, etc).
-- This allows users to maintain multiple resume versions for different job applications.
CREATE TABLE IF NOT EXISTS resume_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  user_id VARCHAR(36) NOT NULL COMMENT 'UUID foreign key to users table',
  profile_name VARCHAR(255) NOT NULL COMMENT 'Name for this resume version (e.g., "Software Engineer", "Product Manager")',
  personal_info JSON COMMENT 'Personal information object: {name, email, phone, location, linkedin_url, github_url, portfolio_url, etc}',
  work_experience JSON COMMENT 'Array of work experience entries: [{company, position, start_date, end_date, description, responsibilities}, ...]',
  education JSON COMMENT 'Array of education entries: [{institution, degree, field, graduation_date, details}, ...]',
  skills JSON COMMENT 'Array of skills: [{skill_name, proficiency_level, years_of_experience}, ...]',
  certifications JSON COMMENT 'Array of certifications: [{name, issuer, issue_date, expiry_date, credential_id}, ...]',
  projects JSON COMMENT 'Array of projects: [{name, description, technologies, url, start_date, end_date}, ...]',
  summary TEXT COMMENT 'Professional summary/objective statement',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0 = active, 1 = deleted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When profile was created',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup of user resume profiles',
  INDEX idx_is_deleted (is_deleted) COMMENT 'Fast filtering of soft-deleted records'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Resume profiles with comprehensive career information in JSON format';

-- ============================================================================
-- NEWS CACHE TABLE
-- ============================================================================
-- Caches stock-related news items to minimize API calls and improve performance.
-- News is cached for 30 minutes before being refreshed.
CREATE TABLE IF NOT EXISTS news_cache (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing primary key',
  symbol VARCHAR(10) NOT NULL COMMENT 'Stock ticker symbol',
  headline VARCHAR(500) NOT NULL COMMENT 'News headline',
  source VARCHAR(255) COMMENT 'News source name',
  url LONGTEXT NOT NULL COMMENT 'Full URL to the news article (LONGTEXT for Google News redirect URLs)',
  published_at DATETIME COMMENT 'When the news was published',
  snippet LONGTEXT COMMENT 'Summary text of the news article (HTML tags stripped)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this cache entry was created',
  UNIQUE KEY unique_article (symbol, headline(200), published_at) COMMENT 'Prevent duplicate inserts of the same article per symbol',
  INDEX idx_symbol (symbol) COMMENT 'Fast lookup of news by symbol',
  INDEX idx_created_at (created_at) COMMENT 'For cache expiration checks'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cached news articles for stocks with TTL-based cleanup';

-- ============================================================================
-- TECH FEED CACHE TABLE
-- ============================================================================
-- Caches developer and tech news from Hacker News, Dev.to, and GitHub Trending.
-- Global shared cache (no user_id) with 60-minute TTL.
CREATE TABLE IF NOT EXISTS tech_feed_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(20) NOT NULL COMMENT 'hackernews | devto | github',
  title VARCHAR(500) NOT NULL,
  url LONGTEXT NOT NULL,
  author VARCHAR(100),
  published_at DATETIME,
  score INT DEFAULT 0 COMMENT 'HN score / GitHub stars',
  snippet LONGTEXT COMMENT 'Dev.to excerpt or GitHub repo description',
  extra_data JSON COMMENT '{language, starsToday} for GitHub; {comments} for HN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_article (source, title(200)),
  INDEX idx_source (source),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cached tech feed items from HN, Dev.to, GitHub Trending';

-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
-- Insert default admin user with bcrypt-hashed password
-- Password: Admin@123
-- Bcrypt hash: $2a$12$iE/YArjWAH.LF1XN4FC5WuTWp8GprBt778rvn7j/bBJVhJcwo2Tgi
-- In production, this user should be deleted and a new admin created through the registration flow
INSERT IGNORE INTO users (id, username, email, password_hash, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'admin@personal.com',
  '$2a$12$iE/YArjWAH.LF1XN4FC5WuTWp8GprBt778rvn7j/bBJVhJcwo2Tgi',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

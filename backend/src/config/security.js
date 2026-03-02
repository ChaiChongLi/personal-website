/**
 * Security Configuration Module
 *
 * Centralizes all security-related constants including JWT configuration,
 * bcrypt settings, cookie options, and Content Security Policy rules.
 *
 * This module ensures consistent security practices across the application
 * and makes it easy to audit and update security policies in one location.
 */

// ============================================================================
// JWT CONFIGURATION
// ============================================================================

const JWT_CONFIG = {
  // Access token secret - used for short-lived authentication tokens
  // Must be at least 32 characters to prevent brute force attacks
  // Generate with: openssl rand -base64 32
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production-32chars',

  // Refresh token secret - different from access secret for security
  // If access secret is compromised, refresh tokens remain secure
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-32chars',

  // Token expiration times
  // Short access token lifetime (15 minutes) reduces exposure if token is stolen
  // Longer refresh token lifetime (7 days) provides good UX
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

// ============================================================================
// BCRYPT CONFIGURATION
// ============================================================================

const BCRYPT_CONFIG = {
  // Number of salt rounds for bcrypt password hashing
  // Higher values = slower hashing = more resistant to brute force attacks
  // 12 rounds ≈ 250ms on modern hardware (good balance of security/speed)
  // Minimum recommended is 10, 14+ for high-security environments
  rounds: 12
};

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================

const COOKIE_OPTIONS = {
  // httpOnly prevents JavaScript access to the cookie
  // Protects against XSS attacks that could steal session tokens
  httpOnly: true,

  // secure flag only allows cookie transmission over HTTPS
  // Prevents man-in-the-middle attacks intercepting the cookie
  // Set to true in production, false in development HTTP
  secure: process.env.NODE_ENV === 'production',

  // sameSite prevents CSRF attacks by restricting cross-site requests
  // 'Strict' is most secure but may break some legitimate workflows
  // 'Lax' allows top-level navigation (link clicks) but blocks form submissions
  // We use 'Lax' as default for better UX while maintaining security
  sameSite: 'Lax',

  // maxAge in milliseconds (7 days = 604800000ms)
  // Should match the refresh token expiration time
  maxAge: 7 * 24 * 60 * 60 * 1000,

  // path restricts cookie to specific paths
  // '/' makes it available site-wide
  path: '/',

  // domain: set to specific domain in production to prevent subdomain access
  // Commented out for development; uncomment and set for production
  // domain: '.yourdomain.com'
};

// ============================================================================
// CONTENT SECURITY POLICY (CSP)
// ============================================================================

// CSP prevents various injection attacks by restricting resource loading
// This is a strict policy suitable for a REST API (no inline scripts/styles)
const CSP_POLICY = {
  // Default fallback for directives not explicitly set
  'default-src': ["'self'"],

  // Restrict where scripts can be loaded from
  // Only allow scripts from the same origin
  'script-src': ["'self'"],

  // Restrict stylesheet sources
  'style-src': ["'self'"],

  // Restrict font sources
  'font-src': ["'self'"],

  // Restrict form submission targets
  'form-action': ["'self'"],

  // Restrict frame embedding
  'frame-ancestors': ["'none'"],

  // Restrict what can be embedded within frames
  'frame-src': ["'none'"],

  // Restrict object/embed tags
  'object-src': ["'none'"],

  // Base URI restricts <base> tag
  'base-uri': ["'self'"],

  // Upgrade insecure connections to HTTPS
  'upgrade-insecure-requests': []
};

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const CORS_CONFIG = {
  // Origin(s) allowed to make requests to this API
  // Prevents CSRF attacks by restricting which domains can access the API
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',

  // Methods allowed for CORS requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Headers allowed in CORS requests
  allowedHeaders: ['Content-Type', 'Authorization'],

  // Expose custom headers to frontend
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],

  // Allow credentials (cookies, auth headers) in CORS requests
  // Must be true to send JWT tokens
  credentials: true,

  // Browser cache CORS preflight response for this many seconds
  // Reduces unnecessary OPTIONS requests
  maxAge: 86400 // 24 hours
};

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

const RATE_LIMIT_CONFIG = {
  // General API rate limit
  general: {
    // Time window in milliseconds
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    // Max requests per window
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    // Message shown when rate limit exceeded
    message: 'Too many requests, please try again later.',
    // Standardize header format (recommended by express-rate-limit)
    standardHeaders: true,
    // Disable legacy headers
    legacyHeaders: false
  },

  // Stricter limit for authentication endpoints (login, register)
  auth: {
    // Same time window as general
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    // Much stricter limit for auth attempts (prevents brute force)
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests (only count failed attempts)
    // Note: In express-rate-limit v7+, use skip function instead
    skip: false
  }
};

// ============================================================================
// PASSWORD VALIDATION RULES
// ============================================================================

const PASSWORD_RULES = {
  // Minimum password length
  minLength: 8,
  // Require at least one uppercase letter
  requireUppercase: true,
  // Require at least one lowercase letter
  requireLowercase: true,
  // Require at least one number
  requireNumbers: true,
  // Require at least one special character
  requireSpecial: true,
  // Regular expression for password validation
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// ============================================================================
// EXPORT ALL SECURITY CONFIGURATIONS
// ============================================================================

module.exports = {
  JWT_CONFIG,
  BCRYPT_CONFIG,
  COOKIE_OPTIONS,
  CSP_POLICY,
  CORS_CONFIG,
  RATE_LIMIT_CONFIG,
  PASSWORD_RULES
};

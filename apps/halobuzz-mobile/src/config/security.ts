// Security configuration for HaloBuzz mobile app
export const SECURITY_CONFIG = {
  // Encryption settings
  ENCRYPTION: {
    ALGORITHM: 'AES-256-GCM',
    KEY_SIZE: 256,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    ITERATIONS: 100000, // PBKDF2 iterations
    SALT_LENGTH: 32,
  },

  // Security levels
  SECURITY_LEVELS: {
    PUBLIC: 'public',
    SENSITIVE: 'sensitive',
    CONFIDENTIAL: 'confidential',
    TOP_SECRET: 'top_secret',
  },

  // API security
  API: {
    TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RATE_LIMIT: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
  },

  // Data protection
  DATA_PROTECTION: {
    AUTO_LOCK_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },

  // Biometric settings
  BIOMETRIC: {
    ENABLED: true,
    FALLBACK_TO_PIN: true,
    REQUIRE_BIOMETRIC_FOR_SENSITIVE: true,
  },

  // Network security
  NETWORK: {
    REQUIRE_HTTPS: true,
    CERTIFICATE_PINNING: true,
    ALLOWED_DOMAINS: [
      'api.halobuzz.com',
      'cdn.halobuzz.com',
      'stream.halobuzz.com',
    ],
  },

  // Message security
  MESSAGING: {
    END_TO_END_ENCRYPTION: true,
    MESSAGE_RETENTION: 30 * 24 * 60 * 60 * 1000, // 30 days
    AUTO_DELETE_SENSITIVE: 7 * 24 * 60 * 60 * 1000, // 7 days
    FORWARD_SECRECY: true,
  },

  // Content security
  CONTENT: {
    SCAN_FOR_MALWARE: true,
    BLOCK_SUSPICIOUS_FILES: true,
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_FILE_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mp3',
      'application/pdf',
    ],
  },

  // Privacy settings
  PRIVACY: {
    COLLECT_ANALYTICS: true,
    COLLECT_CRASH_REPORTS: true,
    SHARE_USAGE_DATA: false,
    ALLOW_TARGETED_ADS: false,
    DATA_MINIMIZATION: true,
  },

  // Audit logging
  AUDIT: {
    LOG_SECURITY_EVENTS: true,
    LOG_USER_ACTIONS: true,
    LOG_API_CALLS: true,
    RETENTION_PERIOD: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
};

// Security status indicators
export const SECURITY_INDICATORS = {
  ENCRYPTED: '🔒',
  VERIFIED: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  SECURE: '🛡️',
  LOCKED: '🔐',
  UNLOCKED: '🔓',
};

// Security messages
export const SECURITY_MESSAGES = {
  ENCRYPTION_ENABLED: 'End-to-end encryption enabled',
  SECURE_CONNECTION: 'Secure connection established',
  DATA_PROTECTED: 'Your data is protected with military-grade encryption',
  VERIFICATION_REQUIRED: 'Identity verification required',
  SECURITY_BREACH: 'Security breach detected - immediate action required',
  PERMISSION_DENIED: 'Insufficient permissions for this action',
  AUTHENTICATION_FAILED: 'Authentication failed - please try again',
  SESSION_EXPIRED: 'Session expired - please log in again',
};

// Security validation rules
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_ATTEMPTS: 5,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    ALLOWED_CHARS: /^[a-zA-Z0-9_]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
  },
};

// Security headers for API requests
export const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Security-Level': 'top_secret',
  'X-Client-Version': '1.0.0',
  'X-Platform': 'mobile',
};

// Security audit checklist
export const SECURITY_AUDIT_CHECKLIST = [
  'Encryption keys are properly generated and stored',
  'All sensitive data is encrypted at rest',
  'Network communications use HTTPS/TLS',
  'Authentication tokens are securely managed',
  'User permissions are properly enforced',
  'Input validation prevents injection attacks',
  'Rate limiting prevents abuse',
  'Security headers are properly configured',
  'Audit logging captures security events',
  'Regular security updates are applied',
];

export default SECURITY_CONFIG;

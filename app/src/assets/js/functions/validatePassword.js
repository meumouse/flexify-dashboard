/**
 * Validates a password against common strength requirements
 * 
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with individual checks and overall validity
 * @example
 * const validation = validatePassword('MyP@ssw0rd');
 * // Returns: { isValid: true, checks: { length: true, uppercase: true, ... } }
 */
export const validatePassword = (password = '') => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };
  
  const isValid = Object.values(checks).every(check => check === true);
  
  return {
    isValid,
    checks,
  };
};


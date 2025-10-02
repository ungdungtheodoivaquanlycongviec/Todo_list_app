/**
 * Validation Helper Utilities
 * Các function tiện ích validation dữ liệu
 */

const { isValidDate } = require('./dateHelper');

/**
 * Validate ObjectId của MongoDB
 * @param {String} id - ID cần validate
 * @returns {Boolean}
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

/**
 * Validate email
 * @param {String} email - Email cần validate
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Validate URL
 * @param {String} url - URL cần validate
 * @returns {Boolean}
 */
const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Validate password strength
 * @param {String} password - Password cần validate
 * @returns {Object} { isValid, errors }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate task status
 * @param {String} status - Status cần validate
 * @returns {Boolean}
 */
const isValidTaskStatus = (status) => {
  const validStatuses = ['Todo', 'In Progress', 'Completed', 'Archived'];
  return validStatuses.includes(status);
};

/**
 * Validate task priority
 * @param {String} priority - Priority cần validate
 * @returns {Boolean}
 */
const isValidTaskPriority = (priority) => {
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  return validPriorities.includes(priority);
};

/**
 * Validate task color
 * @param {String} color - Color cần validate (hex format)
 * @returns {Boolean}
 */
const isValidColor = (color) => {
  if (!color) return false;
  const colorPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
  return colorPattern.test(color);
};

/**
 * Sanitize string (remove HTML tags)
 * @param {String} str - String cần sanitize
 * @returns {String}
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate phone number (Vietnam format)
 * @param {String} phone - Phone number cần validate
 * @returns {Boolean}
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Vietnam phone: 10-11 digits, start with 0
  const phonePattern = /^0\d{9,10}$/;
  return phonePattern.test(phone);
};

/**
 * Validate string length
 * @param {String} str - String cần validate
 * @param {Number} min - Min length
 * @param {Number} max - Max length
 * @returns {Boolean}
 */
const isValidLength = (str, min, max) => {
  if (!str) return false;
  const len = str.trim().length;
  return len >= min && len <= max;
};

/**
 * Validate array không rỗng
 * @param {Array} arr - Array cần validate
 * @returns {Boolean}
 */
const isNonEmptyArray = (arr) => {
  return Array.isArray(arr) && arr.length > 0;
};

/**
 * Validate object không rỗng
 * @param {Object} obj - Object cần validate
 * @returns {Boolean}
 */
const isNonEmptyObject = (obj) => {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
};

/**
 * Validate task dates (dueDate phải sau startDate)
 * @param {Date} startDate - Start date
 * @param {Date} dueDate - Due date
 * @returns {Object} { isValid, error }
 */
const validateTaskDates = (startDate, dueDate) => {
  if (!startDate || !dueDate) {
    return { isValid: true }; // Dates are optional
  }

  if (!isValidDate(startDate)) {
    return { isValid: false, error: 'Invalid start date' };
  }

  if (!isValidDate(dueDate)) {
    return { isValid: false, error: 'Invalid due date' };
  }

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (due < start) {
    return { isValid: false, error: 'Due date must be after start date' };
  }

  return { isValid: true };
};

/**
 * Validate pagination params
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Object} { isValid, sanitizedPage, sanitizedLimit, error }
 */
const validatePagination = (page, limit) => {
  const defaultPage = 1;
  const defaultLimit = 10;
  const maxLimit = 100;

  let sanitizedPage = parseInt(page) || defaultPage;
  let sanitizedLimit = parseInt(limit) || defaultLimit;

  if (sanitizedPage < 1) {
    sanitizedPage = defaultPage;
  }

  if (sanitizedLimit < 1) {
    sanitizedLimit = defaultLimit;
  }

  if (sanitizedLimit > maxLimit) {
    sanitizedLimit = maxLimit;
  }

  return {
    isValid: true,
    sanitizedPage,
    sanitizedLimit
  };
};

/**
 * Validate sort params
 * @param {String} sortBy - Field to sort by
 * @param {String} order - Sort order (asc/desc)
 * @param {Array} allowedFields - Allowed sort fields
 * @returns {Object} { isValid, sanitizedSortBy, sanitizedOrder, error }
 */
const validateSort = (sortBy, order, allowedFields = []) => {
  const defaultSortBy = 'createdAt';
  const defaultOrder = 'desc';

  let sanitizedSortBy = sortBy || defaultSortBy;
  let sanitizedOrder = order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Validate sortBy field
  if (allowedFields.length > 0 && !allowedFields.includes(sanitizedSortBy)) {
    return {
      isValid: false,
      error: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
    };
  }

  return {
    isValid: true,
    sanitizedSortBy,
    sanitizedOrder
  };
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidUrl,
  validatePassword,
  isValidTaskStatus,
  isValidTaskPriority,
  isValidColor,
  sanitizeString,
  isValidPhone,
  isValidLength,
  isNonEmptyArray,
  isNonEmptyObject,
  validateTaskDates,
  validatePagination,
  validateSort
};

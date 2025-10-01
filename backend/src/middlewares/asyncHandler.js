/**
 * Async Handler - Wrap async functions to catch errors
 * Tránh phải viết try-catch trong mỗi controller
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

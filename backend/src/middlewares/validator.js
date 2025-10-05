const { TASK_STATUS, PRIORITY_LEVELS, ERROR_MESSAGES } = require('../config/constants');
const validator = require('validator');
const authService = require('../services/auth.service');

/**
 * Validation middleware cho Task endpoints
 */

/**
 * Validate dữ liệu tạo task mới
 */
const validateCreateTask = (req, res, next) => {
  const { title, dueDate, priority, status, tags } = req.body;
  const errors = [];

  // Validate title (required)
  if (!title || title.trim() === '') {
    errors.push({ field: 'title', message: 'Tiêu đề công việc là bắt buộc' });
  } else if (title.length > 200) {
    errors.push({ field: 'title', message: 'Tiêu đề không được vượt quá 200 ký tự' });
  }

  // Validate dueDate (nếu có)
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.push({ field: 'dueDate', message: 'Ngày hết hạn không hợp lệ' });
    } else if (dueDateObj < new Date()) {
      errors.push({ field: 'dueDate', message: 'Ngày hết hạn phải là ngày trong tương lai' });
    }
  }

  // Validate priority (nếu có)
  if (priority && !PRIORITY_LEVELS.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `Độ ưu tiên không hợp lệ. Chỉ chấp nhận: ${PRIORITY_LEVELS.join(', ')}`
    });
  }

  // Validate status (nếu có)
  if (status && !TASK_STATUS.includes(status)) {
    errors.push({
      field: 'status',
      message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${TASK_STATUS.join(', ')}`
    });
  }

  // Validate tags (nếu có)
  if (tags) {
    if (!Array.isArray(tags)) {
      errors.push({ field: 'tags', message: 'Tags phải là một mảng' });
    } else if (tags.length > 10) {
      errors.push({ field: 'tags', message: 'Số lượng tags không được vượt quá 10' });
    } else {
      // Validate mỗi tag
      tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push({ field: `tags[${index}]`, message: 'Mỗi tag phải là chuỗi ký tự' });
        } else if (tag.length > 30) {
          errors.push({ field: `tags[${index}]`, message: 'Mỗi tag không được vượt quá 30 ký tự' });
        }
      });
    }
  }

  // Nếu có lỗi, trả về 400
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  // Sanitize input
  if (req.body.title) req.body.title = req.body.title.trim();
  if (req.body.description) req.body.description = req.body.description.trim();
  if (req.body.category) req.body.category = req.body.category.trim();
  if (req.body.tags) {
    req.body.tags = req.body.tags.map(tag => typeof tag === 'string' ? tag.trim() : tag);
  }

  next();
};

/**
 * Validate dữ liệu cập nhật task
 */
const validateUpdateTask = (req, res, next) => {
  const { title, dueDate, priority, status, tags, description } = req.body;
  const errors = [];

  // Validate title (nếu có)
  if (title !== undefined) {
    if (title.trim() === '') {
      errors.push({ field: 'title', message: 'Tiêu đề công việc không được để trống' });
    } else if (title.length > 200) {
      errors.push({ field: 'title', message: 'Tiêu đề không được vượt quá 200 ký tự' });
    }
  }

  // Validate description (nếu có)
  if (description !== undefined && description.length > 2000) {
    errors.push({ field: 'description', message: 'Mô tả không được vượt quá 2000 ký tự' });
  }

  // Validate dueDate (nếu có)
  if (dueDate !== undefined && dueDate !== null) {
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.push({ field: 'dueDate', message: 'Ngày hết hạn không hợp lệ' });
    } else if (dueDateObj < new Date()) {
      errors.push({ field: 'dueDate', message: 'Ngày hết hạn phải là ngày trong tương lai' });
    }
  }

  // Validate priority (nếu có)
  if (priority !== undefined && !PRIORITY_LEVELS.includes(priority)) {
    errors.push({
      field: 'priority',
      message: `Độ ưu tiên không hợp lệ. Chỉ chấp nhận: ${PRIORITY_LEVELS.join(', ')}`
    });
  }

  // Validate status (nếu có)
  if (status !== undefined && !TASK_STATUS.includes(status)) {
    errors.push({
      field: 'status',
      message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${TASK_STATUS.join(', ')}`
    });
  }

  // Validate tags (nếu có)
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push({ field: 'tags', message: 'Tags phải là một mảng' });
    } else if (tags.length > 10) {
      errors.push({ field: 'tags', message: 'Số lượng tags không được vượt quá 10' });
    } else {
      tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push({ field: `tags[${index}]`, message: 'Mỗi tag phải là chuỗi ký tự' });
        } else if (tag.length > 30) {
          errors.push({ field: `tags[${index}]`, message: 'Mỗi tag không được vượt quá 30 ký tự' });
        }
      });
    }
  }

  // Nếu có lỗi, trả về 400
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  // Sanitize input
  if (req.body.title) req.body.title = req.body.title.trim();
  if (req.body.description) req.body.description = req.body.description.trim();
  if (req.body.category) req.body.category = req.body.category.trim();
  if (req.body.tags) {
    req.body.tags = req.body.tags.map(tag => typeof tag === 'string' ? tag.trim() : tag);
  }

  next();
};

/**
 * ==========================================
 * Authentication & User Validators
 * ==========================================
 */

/**
 * Validate user registration data
 */
const validateRegister = (req, res, next) => {
  const { email, password, name } = req.body;
  const errors = [];

  // Validate email
  if (!email) {
    errors.push({ field: 'email', message: 'Email là bắt buộc' });
  } else if (!validator.isEmail(email)) {
    errors.push({ field: 'email', message: 'Email không hợp lệ' });
  }

  // Validate password
  if (!password) {
    errors.push({ field: 'password', message: 'Mật khẩu là bắt buộc' });
  } else {
    const passwordValidation = authService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      errors.push({ 
        field: 'password', 
        message: passwordValidation.errors.join(', ') 
      });
    }
  }

  // Validate name
  if (!name || name.trim() === '') {
    errors.push({ field: 'name', message: 'Tên là bắt buộc' });
  } else if (name.length > 100) {
    errors.push({ field: 'name', message: 'Tên không được vượt quá 100 ký tự' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đăng ký không hợp lệ',
      errors
    });
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email là bắt buộc' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Mật khẩu là bắt buộc' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đăng nhập không hợp lệ',
      errors
    });
  }

  next();
};

/**
 * Validate profile update data
 */
const validateUpdateProfile = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  // Name is optional, but validate if provided
  if (name !== undefined) {
    if (name.trim() === '') {
      errors.push({ field: 'name', message: 'Tên không được để trống' });
    } else if (name.length > 100) {
      errors.push({ field: 'name', message: 'Tên không được vượt quá 100 ký tự' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu cập nhật không hợp lệ',
      errors
    });
  }

  next();
};

/**
 * Validate change password data
 */
const validateChangePassword = (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const errors = [];

  if (!oldPassword) {
    errors.push({ field: 'oldPassword', message: 'Mật khẩu cũ là bắt buộc' });
  }

  if (!newPassword) {
    errors.push({ field: 'newPassword', message: 'Mật khẩu mới là bắt buộc' });
  } else {
    const passwordValidation = authService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      errors.push({ 
        field: 'newPassword', 
        message: passwordValidation.errors.join(', ') 
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đổi mật khẩu không hợp lệ',
      errors
    });
  }

  next();
};

/**
 * Validate thêm comment vào task
 */
const validateAddComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  // Validate content (required)
  if (!content || content.trim() === '') {
    errors.push({ field: 'content', message: 'Nội dung comment là bắt buộc' });
  } else if (content.length > 2000) {
    errors.push({ field: 'content', message: 'Comment không được vượt quá 2000 ký tự' });
  }

  // Validate task ID from params
  const { id } = req.params;
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    errors.push({ field: 'taskId', message: 'Task ID không hợp lệ' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu comment không hợp lệ',
      errors
    });
  }

  next();
};

/**
 * Validate cập nhật comment
 */
const validateUpdateComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  // Validate content (required)
  if (!content || content.trim() === '') {
    errors.push({ field: 'content', message: 'Nội dung comment là bắt buộc' });
  } else if (content.length > 2000) {
    errors.push({ field: 'content', message: 'Comment không được vượt quá 2000 ký tự' });
  }

  // Validate task ID and comment ID from params
  const { id, commentId } = req.params;
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    errors.push({ field: 'taskId', message: 'Task ID không hợp lệ' });
  }
  if (!commentId || !commentId.match(/^[0-9a-fA-F]{24}$/)) {
    errors.push({ field: 'commentId', message: 'Comment ID không hợp lệ' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu cập nhật comment không hợp lệ',
      errors
    });
  }

  next();
};

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateAddComment,
  validateUpdateComment
};

const {
  TASK_STATUS,
  PRIORITY_LEVELS,
  ERROR_MESSAGES,
  LIMITS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  GROUP_ROLES,
  GROUP_ROLE_KEYS
} = require('../config/constants');
const validator = require('validator');
const authService = require('../services/auth.service');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User.model');
const {
  isValidObjectId,
  sanitizeEnumArray,
  sanitizeSort,
  validatePagination
} = require('../utils/validationHelper');

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
    }
    // Note: Past due dates are allowed when updating tasks (e.g., from timeline view)
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

/**
 * Validate danh sách userIds khi gán task
 */
const validateAssignTask = asyncHandler(async (req, res, next) => {
  const { userIds } = req.body;
  const errors = [];

  if (!Array.isArray(userIds)) {
    errors.push({ field: 'userIds', message: 'userIds phải là một mảng' });
  } else {
    const normalizedIds = userIds
      .map(id => (typeof id === 'string' ? id.trim() : (id ? String(id) : '')))
      .filter(Boolean);

    if (normalizedIds.length === 0) {
      errors.push({ field: 'userIds', message: 'userIds không được rỗng' });
    }

    if (normalizedIds.length > LIMITS.MAX_ASSIGNEES_PER_TASK) {
      errors.push({
        field: 'userIds',
        message: `Mỗi lần gán tối đa ${LIMITS.MAX_ASSIGNEES_PER_TASK} users`
      });
    }

    const invalidIds = normalizedIds.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      errors.push({
        field: 'userIds',
        message: 'Danh sách userIds chứa giá trị không hợp lệ',
        invalidIds
      });
    }

    const uniqueIds = [...new Set(normalizedIds)];
    if (uniqueIds.length !== normalizedIds.length) {
      errors.push({
        field: 'userIds',
        message: 'userIds không được chứa giá trị trùng lặp'
      });
    }

    if (errors.length === 0) {
      const users = await User.find({ _id: { $in: uniqueIds }, isActive: true })
        .select('_id')
        .lean();

      const foundIds = new Set(users.map(user => user._id.toString()));
      const missingIds = uniqueIds.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        errors.push({
          field: 'userIds',
          message: 'Một hoặc nhiều user không tồn tại hoặc đã bị vô hiệu hóa',
          invalidUserIds: missingIds
        });
      } else {
        req.body.userIds = uniqueIds;
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  next();
});

/**
 * Validate userId khi bỏ gán task
 */
const validateUnassignUser = (req, res, next) => {
  const { userId } = req.params;

  if (!userId || !isValidObjectId(userId)) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: [
        {
          field: 'userId',
          message: 'userId không hợp lệ'
        }
      ]
    });
  }

  next();
};

/**
 * ==========================================
 * Group Validators
 * ==========================================
 */

const sanitizeMemberIds = (memberIds = []) => {
  const unique = new Set();
  memberIds.forEach(id => {
    if (!id) return;
    const normalized = typeof id === 'string' ? id.trim() : String(id);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

const sanitizeMemberAssignments = (members = []) => {
  const unique = new Map();
  members.forEach(entry => {
    if (!entry) return;
    const userId = typeof entry === 'string' ? entry : entry.userId;
    if (!userId) return;
    const normalized = typeof userId === 'string' ? userId.trim() : String(userId);
    if (!normalized) return;
    unique.set(normalized, {
      userId: normalized
    });
  });
  return Array.from(unique.values());
};

const validateCreateGroup = (req, res, next) => {
  const errors = [];
  const { name, description, members } = req.body;

  if (!name || !name.trim()) {
    errors.push({ field: 'name', message: 'Group name is required' });
  } else if (name.trim().length > LIMITS.MAX_GROUP_NAME_LENGTH) {
    errors.push({
      field: 'name',
      message: `Group name must not exceed ${LIMITS.MAX_GROUP_NAME_LENGTH} characters`
    });
  }

  if (description && description.trim().length > LIMITS.MAX_GROUP_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must not exceed ${LIMITS.MAX_GROUP_DESCRIPTION_LENGTH} characters`
    });
  }

  if (members !== undefined) {
    if (!Array.isArray(members)) {
      errors.push({ field: 'members', message: 'members must be an array' });
    } else {
      const sanitized = sanitizeMemberAssignments(members);

      const invalidEntries = sanitized.filter(entry => !isValidObjectId(entry.userId));
      if (invalidEntries.length > 0) {
        errors.push({
          field: 'members',
          message: 'Each member requires a valid userId',
          invalidEntries
        });
      }

      if (sanitized.length + 1 > LIMITS.MAX_MEMBERS_PER_GROUP) {
        errors.push({
          field: 'members',
          message: `Groups can have at most ${LIMITS.MAX_MEMBERS_PER_GROUP} members including the creator`
        });
      }

      req.body.members = sanitized;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  req.body.name = name.trim();
  if (description !== undefined) {
    req.body.description = description ? description.trim() : '';
  }

  next();
};

const validateUpdateGroup = (req, res, next) => {
  const errors = [];
  const { name, description, metadata } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      errors.push({ field: 'name', message: 'Group name cannot be empty' });
    } else if (name.trim().length > LIMITS.MAX_GROUP_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Group name must not exceed ${LIMITS.MAX_GROUP_NAME_LENGTH} characters`
      });
    } else {
      req.body.name = name.trim();
    }
  }

  if (description !== undefined) {
    if (description && description.trim().length > LIMITS.MAX_GROUP_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description must not exceed ${LIMITS.MAX_GROUP_DESCRIPTION_LENGTH} characters`
      });
    } else {
      req.body.description = description ? description.trim() : '';
    }
  }

  if (metadata !== undefined && typeof metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'metadata must be an object' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  next();
};

const validateManageGroupMembers = (req, res, next) => {
  const { members } = req.body;
  const errors = [];

  if (!Array.isArray(members) || members.length === 0) {
    errors.push({ field: 'members', message: 'members must be a non-empty array' });
  } else {
    const sanitized = sanitizeMemberAssignments(members);

    if (sanitized.length === 0) {
      errors.push({ field: 'members', message: 'members must contain at least one valid assignment' });
    }

    const invalidEntries = sanitized.filter(entry => !isValidObjectId(entry.userId));
    if (invalidEntries.length > 0) {
      errors.push({ field: 'members', message: 'members contains invalid assignment(s)', invalidEntries });
    }

    req.body.members = sanitized;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  next();
};

const validateGroupMemberParam = (req, res, next) => {
  const { memberId } = req.params;
  if (!memberId || !isValidObjectId(memberId)) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: [{ field: 'memberId', message: 'memberId is invalid' }]
    });
  }

  next();
};

const validateMemberRoleUpdate = (req, res, next) => {
  return res.status(410).json({
    success: false,
    message: 'Group member roles are deprecated. Roles are assigned by admin at account level.',
    errors: [{ field: 'role', message: 'deprecated' }]
  });
};

const validateGroupInvitation = (req, res, next) => {
  const { email } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !validator.isEmail(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  req.body.email = email.trim().toLowerCase();

  next();
};

const validateFolderMemberAssignments = (req, res, next) => {
  const { memberIds } = req.body;
  const errors = [];

  if (!Array.isArray(memberIds)) {
    errors.push({ field: 'memberIds', message: 'memberIds must be an array' });
  } else {
    const sanitized = sanitizeMemberIds(memberIds);
    const invalidIds = sanitized.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      errors.push({ field: 'memberIds', message: 'memberIds contains invalid id(s)', invalidIds });
    }
    req.body.memberIds = sanitized;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  next();
};

const validateNotificationQuery = (req, res, next) => {
  const errors = [];
  const {
    page = 1,
    limit = 20,
    unreadOnly,
    includeArchived,
    categories,
    channels,
    sort,
    order
  } = req.query;

  const pagination = validatePagination(page, limit);
  const sanitizedLimit = Math.min(
    pagination.sanitizedLimit,
    LIMITS.NOTIFICATION_MAX_PAGE_LIMIT || pagination.sanitizedLimit
  );

  const categoryResult = sanitizeEnumArray(categories, NOTIFICATION_CATEGORIES);
  if (!categoryResult.isValid) {
    errors.push(categoryResult.error || 'Invalid category filter');
  }

  const channelResult = sanitizeEnumArray(channels, NOTIFICATION_CHANNELS);
  if (!channelResult.isValid) {
    errors.push(channelResult.error || 'Invalid channel filter');
  }

  const sortResult = sanitizeSort(
    sort ? `${sort}:${order || ''}` : undefined,
    ['createdAt', 'deliveredAt', 'readAt']
  );

  if (!sortResult.isValid) {
    errors.push(sortResult.error || 'Invalid sort field');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors
    });
  }

  req.notificationFilters = {
    page: pagination.sanitizedPage,
    limit: sanitizedLimit,
    unreadOnly: unreadOnly === 'true' || unreadOnly === true,
    includeArchived: includeArchived === 'true' || includeArchived === true,
    categories: categoryResult.values,
    channels: channelResult.values,
    sort: sortResult.sortBy,
    order: sortResult.order
  };

  next();
};

const validateNotificationArchive = (req, res, next) => {
  const ids = req.body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: [{ field: 'ids', message: 'ids must be a non-empty array' }]
    });
  }

  const trimmed = ids
    .map(id => (typeof id === 'string' ? id.trim() : String(id || '')))
    .filter(Boolean);

  const unique = Array.from(new Set(trimmed));

  if (unique.length === 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_INVALID
    });
  }

  if (unique.length > LIMITS.NOTIFICATION_MAX_ARCHIVE_BATCH) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_LIMIT
    });
  }

  const invalidIds = unique.filter(id => !isValidObjectId(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_INVALID,
      errors: [{ field: 'ids', message: 'ids contains invalid identifier(s)', invalidIds }]
    });
  }

  req.notificationArchiveIds = unique;
  next();
};

const validateNotificationPreferences = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.NOTIFICATION_PREFERENCES_INVALID
    });
  }

  req.notificationPreferences = req.body;
  next();
};

const validateNotificationMarkAll = (req, res, next) => {
  const categoriesInput = req.body?.categories;

  if (categoriesInput === undefined) {
    req.notificationMarkAll = { categories: [] };
    return next();
  }

  const result = sanitizeEnumArray(categoriesInput, NOTIFICATION_CATEGORIES);

  if (!result.isValid) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: [result.error]
    });
  }

  req.notificationMarkAll = { categories: result.values };
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
  validateUpdateComment,
  validateAssignTask,
  validateUnassignUser,
  validateCreateGroup,
  validateUpdateGroup,
  validateManageGroupMembers,
  validateGroupMemberParam,
  validateMemberRoleUpdate,
  validateGroupInvitation,
  validateFolderMemberAssignments,
  validateNotificationQuery,
  validateNotificationArchive,
  validateNotificationPreferences,
  validateNotificationMarkAll
};

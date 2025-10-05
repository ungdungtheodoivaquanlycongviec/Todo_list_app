const taskService = require('../services/task.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

/**
 * Task Controller
 * Xử lý HTTP requests/responses
 * Business logic nằm ở Task Service
 */

/**
 * @desc    Tạo task mới
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = asyncHandler(async (req, res) => {
  // Get userId from authenticated user
  const createdBy = req.user._id;

  const taskData = {
    ...req.body,
    createdBy
  };

  // Call service
  const task = await taskService.createTask(taskData);

  sendSuccess(res, task, SUCCESS_MESSAGES.TASK_CREATED, HTTP_STATUS.CREATED);
});

/**
 * @desc    Lấy chi tiết task theo ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Call service
  const task = await taskService.getTaskById(id);

  if (!task) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, task, SUCCESS_MESSAGES.TASK_FETCHED);
});

/**
 * @desc    Cập nhật task
 * @route   PUT/PATCH /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Call service
  const task = await taskService.updateTask(id, updateData);

  if (!task) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, task, SUCCESS_MESSAGES.TASK_UPDATED);
});

/**
 * @desc    Xóa task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Call service
  const task = await taskService.deleteTask(id);

  if (!task) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, { id }, SUCCESS_MESSAGES.TASK_DELETED);
});

/**
 * @desc    Lấy danh sách tasks (với filter, sort, pagination)
 * @route   GET /api/tasks
 * @access  Private
 */
const getAllTasks = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    search: req.query.search
  };

  const options = {
    sortBy: req.query.sortBy || 'createdAt',
    order: req.query.order || 'desc',
    page: req.query.page || 1,
    limit: req.query.limit || 20
  };

  // Call service
  const result = await taskService.getAllTasks(filters, options);

  sendSuccess(res, result, SUCCESS_MESSAGES.TASKS_FETCHED);
});

/**
 * @desc    Xem tasks theo lịch (Calendar View)
 * @route   GET /api/tasks/calendar
 * @access  Private
 */
const getCalendarView = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  // Call service (service sẽ validate)
  const result = await taskService.getCalendarView(year, month);

  sendSuccess(res, result, 'Lấy calendar view thành công');
});

/**
 * @desc    Xem tasks theo kanban (Kanban View)
 * @route   GET /api/tasks/kanban
 * @access  Private
 */
const getKanbanView = asyncHandler(async (req, res) => {
  const filters = {
    priority: req.query.priority,
    groupId: req.query.groupId,
    search: req.query.search
  };

  // Call service
  const result = await taskService.getKanbanView(filters);

  sendSuccess(res, result, 'Lấy kanban view thành công');
});

/**
 * @desc    Thêm comment vào task
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  // Call service
  const task = await taskService.addComment(id, userId, content);

  if (!task) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, task, 'Thêm comment thành công', HTTP_STATUS.CREATED);
});

/**
 * @desc    Cập nhật comment
 * @route   PUT /api/tasks/:id/comments/:commentId
 * @access  Private
 */
const updateComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  // Call service
  const result = await taskService.updateComment(id, commentId, userId, content);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.task, 'Cập nhật comment thành công');
});

/**
 * @desc    Xóa comment
 * @route   DELETE /api/tasks/:id/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const userId = req.user._id;

  // Call service
  const result = await taskService.deleteComment(id, commentId, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.task, 'Xóa comment thành công');
});

/**
 * @desc    Lấy danh sách comments của task
 * @route   GET /api/tasks/:id/comments
 * @access  Private
 */
const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Call service
  const result = await taskService.getComments(id, page, limit);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, result, 'Lấy danh sách comments thành công');
});

/**
 * @desc    Upload attachments to task
 * @route   POST /api/tasks/:id/attachments
 * @access  Private
 */
const uploadAttachments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const files = req.files;

  if (!files || files.length === 0) {
    return sendError(res, 'Không có file nào được upload', HTTP_STATUS.BAD_REQUEST);
  }

  // Call service
  const result = await taskService.uploadAttachments(id, userId, files);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.task, 'Upload attachments thành công', HTTP_STATUS.CREATED);
});

/**
 * @desc    Delete attachment from task
 * @route   DELETE /api/tasks/:id/attachments/:attachmentId
 * @access  Private
 */
const deleteAttachment = asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;
  const userId = req.user._id;

  // Call service
  const result = await taskService.deleteAttachment(id, attachmentId, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.task, 'Xóa attachment thành công');
});

/**
 * @desc    Add comment with optional attachment
 * @route   POST /api/tasks/:id/comments/with-file
 * @access  Private
 */
const addCommentWithFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  const file = req.file;

  // Call service
  const task = await taskService.addCommentWithFile(id, userId, content, file);

  if (!task) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, task, 'Thêm comment thành công', HTTP_STATUS.CREATED);
});

module.exports = {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasks,
  getCalendarView,
  getKanbanView,
  addComment,
  updateComment,
  deleteComment,
  getComments,
  uploadAttachments,
  deleteAttachment,
  addCommentWithFile
};

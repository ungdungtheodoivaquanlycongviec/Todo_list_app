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

  // Đảm bảo assignedTo bao gồm creator
  if (!taskData.assignedTo || taskData.assignedTo.length === 0) {
    taskData.assignedTo = [{ userId: createdBy }];
  } else {
    // Kiểm tra xem creator đã có trong assignedTo chưa
    const creatorAlreadyAssigned = taskData.assignedTo.some(
      assignee => assignee.userId && assignee.userId.toString() === createdBy.toString()
    );
    if (!creatorAlreadyAssigned) {
      taskData.assignedTo.push({ userId: createdBy });
    }
  }

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
  const task = await taskService.updateTask(id, updateData, req.user._id);

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
    search: req.query.search,
    groupId: req.query.groupId
  };

  const options = {
    sortBy: req.query.sortBy || 'createdAt',
    order: req.query.order || 'desc',
    page: req.query.page || 1,
    limit: req.query.limit || 20
  };

  // Call service
  const result = await taskService.getAllTasks(filters, options, req.user._id);

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
  const result = await taskService.getKanbanView(filters, req.user._id);

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

  // First check if task exists and get its status
  const existingTask = await taskService.getTaskById(id);
  if (!existingTask) {
    return sendError(res, ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // Check if task is completed - only allow comments on completed tasks
  if (existingTask.status !== 'completed') {
    return sendError(res, 'Chỉ có thể comment trên task đã hoàn thành', HTTP_STATUS.FORBIDDEN);
  }

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
 * @desc    Assign users to a task
 * @route   POST /api/tasks/:id/assign
 * @access  Private (task owner)
 */
const assignTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;
  const assignerId = req.user._id;

  const result = await taskService.assignUsersToTask(id, userIds, assignerId);

  if (!result.success) {
    return sendError(
      res,
      result.message,
      result.statusCode || HTTP_STATUS.BAD_REQUEST,
      result.errors || result.meta || null
    );
  }

  const responsePayload = {
    task: result.task,
    assignedUserIds: result.assignedUserIds,
    meta: result.meta
  };

  sendSuccess(res, responsePayload, result.message, result.statusCode || HTTP_STATUS.OK);
});

/**
 * @desc    Unassign a user from task
 * @route   DELETE /api/tasks/:id/unassign/:userId
 * @access  Private (task owner)
 */
const unassignUser = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const requesterId = req.user._id;

  const result = await taskService.unassignUserFromTask(id, userId, requesterId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  const responsePayload = {
    task: result.task,
    removedUserId: result.removedUserId
  };

  sendSuccess(res, responsePayload, result.message, result.statusCode || HTTP_STATUS.OK);
});

/**
 * @desc    Get tasks assigned to current user
 * @route   GET /api/tasks/assigned-to-me
 * @access  Private
 */
const getAssignedToMe = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    search: req.query.search,
    groupId: req.query.groupId
  };

  const options = {
    sortBy: req.query.sortBy || 'dueDate',
    order: req.query.order || 'asc',
    page: req.query.page || 1,
    limit: req.query.limit || 20
  };

  const result = await taskService.getTasksAssignedToUser(req.user._id, filters, options);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

/**
 * @desc    Get assignees of a task
 * @route   GET /api/tasks/:id/assignees
 * @access  Private
 */
const getTaskAssignees = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await taskService.getTaskAssignees(id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
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
  assignTask,
  unassignUser,
  getAssignedToMe,
  getTaskAssignees,
  addCommentWithFile
};

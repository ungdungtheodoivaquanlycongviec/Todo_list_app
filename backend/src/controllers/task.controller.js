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
 * @access  Private (sau khi có auth)
 */
const createTask = asyncHandler(async (req, res) => {
  // TODO: Sau khi có authentication, lấy userId từ req.user._id
  const createdBy = req.body.createdBy || '507f1f77bcf86cd799439011';

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
    groupId: req.query.groupId
  };

  // Call service
  const kanbanBoard = await taskService.getKanbanView(filters);

  sendSuccess(res, kanbanBoard, 'Lấy kanban view thành công');
});

module.exports = {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasks,
  getCalendarView,
  getKanbanView
};

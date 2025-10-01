const Task = require('../models/Task.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Tạo task mới
 * @route   POST /api/tasks
 * @access  Private (sau khi có auth)
 */
const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate, tags, category, groupId } = req.body;

  // TODO: Sau khi có authentication, lấy userId từ req.user._id
  // Hiện tại hard-code để test
  const createdBy = req.body.createdBy || '507f1f77bcf86cd799439011'; // Demo ObjectId

  // Tạo task mới
  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    tags,
    category,
    groupId,
    createdBy
  });

  // Trả về response
  sendSuccess(
    res,
    task,
    SUCCESS_MESSAGES.TASK_CREATED,
    HTTP_STATUS.CREATED
  );
});

/**
 * @desc    Lấy chi tiết task theo ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Note: populate sẽ được enable sau khi có User model (Phase 8)
  const task = await Task.findById(id);
  // .populate('createdBy', 'name email avatar')
  // .populate('assignedTo.userId', 'name email avatar')
  // .populate('comments.userId', 'name email avatar');

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
  const updates = req.body;

  // Tìm và cập nhật task
  const task = await Task.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

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

  const task = await Task.findByIdAndDelete(id);

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
  const {
    status,
    priority,
    search,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  // Build filter object
  const filter = {};

  // TODO: Sau khi có auth, filter theo user
  // filter.createdBy = req.user._id;

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  // Sorting
  const sortOption = {};
  sortOption[sortBy] = order === 'asc' ? 1 : -1;

  // Pagination
  const skip = (page - 1) * limit;

  // Execute query
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      // .populate('createdBy', 'name email avatar') // Tắt tạm - Phase 8
      .lean(),
    Task.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    tasks,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages
    }
  }, SUCCESS_MESSAGES.TASKS_FETCHED);
});

/**
 * @desc    Xem tasks theo lịch (Calendar View)
 * @route   GET /api/tasks/calendar
 * @access  Private
 */
const getCalendarView = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  // Validate required params
  if (!year || !month) {
    return sendError(res, 'Year và month là bắt buộc', HTTP_STATUS.BAD_REQUEST);
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (monthNum < 1 || monthNum > 12) {
    return sendError(res, 'Month phải từ 1 đến 12', HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate date range
  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

  // Query tasks
  const filter = {
    dueDate: {
      $gte: startDate,
      $lte: endDate
    }
  };

  // TODO: Filter by user when auth is ready
  // filter.createdBy = req.user._id;

  const tasks = await Task.find(filter)
    // .populate('createdBy', 'name email avatar') // Tắt tạm - Phase 8
    .sort({ dueDate: 1 })
    .lean();

  // Group by date
  const groupedByDate = {};
  tasks.forEach(task => {
    const dateKey = task.dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(task);
  });

  sendSuccess(res, {
    year: yearNum,
    month: monthNum,
    tasks: groupedByDate
  }, 'Lấy calendar view thành công');
});

/**
 * @desc    Xem tasks theo kanban (Kanban View)
 * @route   GET /api/tasks/kanban
 * @access  Private
 */
const getKanbanView = asyncHandler(async (req, res) => {
  const { priority, groupId } = req.query;

  // Build filter
  const filter = {};

  // TODO: Filter by user when auth is ready
  // filter.createdBy = req.user._id;

  if (priority) filter.priority = priority;
  if (groupId) filter.groupId = groupId;

  // Query all tasks
  const tasks = await Task.find(filter)
    // .populate('createdBy', 'name email avatar') // Tắt tạm - Phase 8
    .sort({ createdAt: -1 })
    .lean();

  // Group by status
  const kanbanBoard = {
    todo: [],
    in_progress: [],
    completed: [],
    archived: []
  };

  tasks.forEach(task => {
    if (kanbanBoard[task.status]) {
      kanbanBoard[task.status].push(task);
    }
  });

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

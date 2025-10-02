const Task = require('../models/Task.model');
const { ERROR_MESSAGES, TASK_STATUS } = require('../config/constants');
const { 
  isValidObjectId, 
  validateTaskDates,
  validatePagination,
  validateSort 
} = require('../utils/validationHelper');
const { 
  addHours, 
  getFirstDayOfMonth, 
  getLastDayOfMonth 
} = require('../utils/dateHelper');

/**
 * Task Service
 * Chứa toàn bộ business logic liên quan đến Task
 * Controller chỉ gọi service, không xử lý logic
 */

class TaskService {
  /**
   * Tạo task mới
   * @param {Object} taskData - Dữ liệu task
   * @returns {Promise<Object>} Task đã tạo
   */
  async createTask(taskData) {
    const task = await Task.create(taskData);
    return task;
  }

  /**
   * Lấy task theo ID
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async getTaskById(taskId) {
    const task = await Task.findById(taskId);
    return task;
  }

  /**
   * Lấy danh sách tasks với filter, sort, pagination
   * @param {Object} filters - Object chứa các filter
   * @param {Object} options - Options cho sort, pagination
   * @returns {Promise<Object>} { tasks, pagination }
   */
  async getAllTasks(filters = {}, options = {}) {
    const {
      status,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20
    } = { ...filters, ...options };

    // Build filter object
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    const sortOption = {};
    sortOption[sortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    };
  }

  /**
   * Cập nhật task
   * @param {String} taskId - ID của task
   * @param {Object} updateData - Dữ liệu cần update
   * @returns {Promise<Object|null>} Task đã update hoặc null
   */
  async updateTask(taskId, updateData) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    return task;
  }

  /**
   * Xóa task
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã xóa hoặc null
   */
  async deleteTask(taskId) {
    const task = await Task.findByIdAndDelete(taskId);
    return task;
  }

  /**
   * Lấy tasks theo calendar view (group by date)
   * @param {Number} year - Năm
   * @param {Number} month - Tháng (1-12)
   * @returns {Promise<Object>} { year, month, tasks }
   */
  async getCalendarView(year, month) {
    // Validate params
    if (!year || !month) {
      throw new Error('Year và month là bắt buộc');
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Month phải từ 1 đến 12');
    }

    // Calculate date range
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Query tasks
    const tasks = await Task.find({
      dueDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
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

    return {
      year: yearNum,
      month: monthNum,
      tasks: groupedByDate
    };
  }

  /**
   * Lấy tasks theo kanban view (group by status)
   * @param {Object} filters - { priority, groupId }
   * @returns {Promise<Object>} Kanban board object
   */
  async getKanbanView(filters = {}) {
    const { priority, groupId } = filters;

    // Build filter
    const query = {};
    if (priority) query.priority = priority;
    if (groupId) query.groupId = groupId;

    // Query all tasks
    const tasks = await Task.find(query)
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

    return kanbanBoard;
  }

  /**
   * Kiểm tra task có tồn tại không
   * @param {String} taskId - ID của task
   * @returns {Promise<Boolean>}
   */
  async taskExists(taskId) {
    const count = await Task.countDocuments({ _id: taskId });
    return count > 0;
  }

  /**
   * Lấy số lượng tasks theo status
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Object>} { todo: 5, in_progress: 3, ... }
   */
  async getTaskCountByStatus(userId = null) {
    const match = userId ? { createdBy: userId } : {};
    
    const result = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {
      todo: 0,
      in_progress: 0,
      completed: 0,
      archived: 0
    };

    result.forEach(item => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Lấy tasks sắp đến hạn (trong vòng X giờ)
   * @param {Number} hours - Số giờ (default: 24)
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Array>} Danh sách tasks
   */
  async getTasksDueSoon(hours = 24, userId = null) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const query = {
      dueDate: {
        $gte: now,
        $lte: futureDate
      },
      status: { $ne: 'completed' }
    };

    if (userId) {
      query.createdBy = userId;
    }

    const tasks = await Task.find(query)
      .sort({ dueDate: 1 })
      .lean();

    return tasks;
  }

  /**
   * Lấy tasks quá hạn (overdue)
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Array>} Danh sách tasks
   */
  async getOverdueTasks(userId = null) {
    const now = new Date();

    const query = {
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    };

    if (userId) {
      query.createdBy = userId;
    }

    const tasks = await Task.find(query)
      .sort({ dueDate: 1 })
      .lean();

    return tasks;
  }

  /**
   * Đánh dấu task là completed
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã update
   */
  async markAsCompleted(taskId) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    );
    return task;
  }

  /**
   * Archive task
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã update
   */
  async archiveTask(taskId) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: 'archived' } },
      { new: true }
    );
    return task;
  }

  /**
   * Bulk update tasks
   * @param {Array} taskIds - Mảng các task IDs
   * @param {Object} updateData - Dữ liệu cần update
   * @returns {Promise<Object>} { modifiedCount }
   */
  async bulkUpdateTasks(taskIds, updateData) {
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updateData }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bulk delete tasks
   * @param {Array} taskIds - Mảng các task IDs
   * @returns {Promise<Object>} { deletedCount }
   */
  async bulkDeleteTasks(taskIds) {
    const result = await Task.deleteMany({
      _id: { $in: taskIds }
    });
    return { deletedCount: result.deletedCount };
  }
}

// Export singleton instance
module.exports = new TaskService();

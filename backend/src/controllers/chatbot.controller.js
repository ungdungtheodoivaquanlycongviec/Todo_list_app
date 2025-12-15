const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const taskService = require('../services/task.service');
const User = require('../models/User.model');
const Group = require('../models/Group.model');
const Task = require('../models/Task.model');
const ChatbotState = require('../models/ChatbotState.model');
const mongoose = require('mongoose');
const { HTTP_STATUS, GROUP_ROLE_KEYS } = require('../config/constants');

/**
 * @desc    Lấy context của user cho chatbot (user info, tasks hôm nay, etc.)
 * @route   GET /api/chatbot/context
 * @access  Private
 */
const getChatbotContext = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to use the chatbot', HTTP_STATUS.FORBIDDEN);
  }

  // Lấy thông tin user
  const user = await User.findById(userId).select('name email').lean();
  if (!user) {
    return sendError(res, 'User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Tách tên thành firstname và lastname
  const nameParts = user.name.trim().split(' ');
  const userFirstname = nameParts[0] || user.name;
  const userLastname = nameParts.slice(1).join(' ') || '';

  // Xác định giới tính dựa trên tên (heuristic đơn giản cho tiếng Việt)
  // Có thể mở rộng logic này sau
  const gender = determineGender(user.name, userFirstname);

  // Lấy tasks hôm nay (chưa completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Lấy tất cả task active (chưa completed) được assign cho user hoặc không có dueDate
  const allActiveTasks = await Task.find({
    groupId: currentGroupId,
    status: { $in: ['todo', 'in_progress', 'incomplete'] },
    $or: [
      { assignedTo: { $elemMatch: { userId: userId } } },
      { dueDate: { $exists: true } }
    ]
  })
    .populate('assignedTo.userId', 'name email')
    .select('title status priority dueDate')
    .limit(50)
    .lean();

  // Phân loại task: hôm nay vs tương lai
  const todayTaskDetails = allActiveTasks
    .filter(task => {
      const isAssignedToUser = task.assignedTo?.some(
        assignee => assignee.userId?._id?.toString() === userId.toString()
      );
      const isDueToday = task.dueDate && 
        new Date(task.dueDate) >= today && 
        new Date(task.dueDate) < tomorrow;
      
      // Chỉ lấy task có dueDate = hôm nay hoặc được assign cho user và có dueDate = hôm nay
      return isDueToday && (isAssignedToUser || !task.dueDate);
    })
    .map(task => ({
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate
    }))
    .slice(0, 10);

  const futureTaskDetails = allActiveTasks
    .filter(task => {
      const isAssignedToUser = task.assignedTo?.some(
        assignee => assignee.userId?._id?.toString() === userId.toString()
      );
      const isDueFuture = task.dueDate && new Date(task.dueDate) >= tomorrow;
      
      // Chỉ lấy task có dueDate > hôm nay
      return isDueFuture && isAssignedToUser;
    })
    .map(task => ({
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate
    }))
    .slice(0, 10);

  // Danh sách title để dùng cho placeholders
  const todayTasks = todayTaskDetails.map(task => task.title);
  const futureTasks = futureTaskDetails.map(task => task.title);
  
  // Tổng hợp tất cả task active (để tương thích với code cũ)
  const activeTaskDetails = [...todayTaskDetails, ...futureTaskDetails].slice(0, 10);
  const activeTasks = activeTaskDetails.map(task => task.title);

  // Lấy ngày hiện tại
  const currentDate = formatDate(today);

  // Lấy thông tin group (tên group để chatbot có thể nhắc lại)
  let groupName = '';
  try {
    const groupDoc = await Group.findById(currentGroupId).select('name').lean();
    groupName = groupDoc?.name || '';
  } catch (e) {
    groupName = '';
  }

  // Trả về context
  const context = {
    user: {
      id: user._id.toString(),
      name: user.name,
      firstname: userFirstname,
      lastname: userLastname,
      email: user.email,
      gender: gender
    },
    tasks: {
      activeTasks: activeTasks,
      activeTasksCount: activeTasks.length,
      todayTasks: todayTasks,
      todayTasksCount: todayTasks.length,
      futureTasks: futureTasks,
      futureTasksCount: futureTasks.length,
      activeTaskDetails,
      todayTaskDetails,
      futureTaskDetails
    },
    date: {
      current_date: currentDate,
      current_date_vn: formatDateVN(today)
    },
    group: {
      id: currentGroupId.toString(),
      name: groupName
    }
  };

  sendSuccess(res, context, 'Chatbot context retrieved successfully');
});

/**
 * Helper function để xác định giới tính dựa trên tên (cho tiếng Việt)
 */
function determineGender(fullName, firstName) {
  const name = fullName.toLowerCase();
  const first = firstName.toLowerCase();

  // Các hậu tố thường gặp trong tên nữ tiếng Việt
  const femaleIndicators = [
    'thị', 'lan', 'linh', 'mai', 'thu', 'ha', 'ngoc', 'anh', 'uyen', 'yen',
    'hoa', 'hong', 'quynh', 'tram', 'phuong', 'van', 'huyen', 'trang', 'ly'
  ];

  // Các hậu tố thường gặp trong tên nam tiếng Việt
  const maleIndicators = [
    'van', 'duc', 'minh', 'tuan', 'hung', 'quang', 'thanh', 'tien', 'dung',
    'huy', 'hoang', 'khanh', 'long', 'phuc', 'tuan', 'viet'
  ];

  // Kiểm tra hậu tố cuối cùng trong tên
  const nameParts = name.split(' ');
  const lastPart = nameParts[nameParts.length - 1] || '';

  if (femaleIndicators.some(ind => lastPart.includes(ind) || first.includes(ind))) {
    return 'bạn'; // Dùng "bạn" cho nữ
  }
  
  if (maleIndicators.some(ind => lastPart.includes(ind) || first.includes(ind))) {
    return 'bạn'; // Dùng "bạn" cho nam (có thể thay bằng "anh" nếu muốn phân biệt rõ hơn)
  }

  // Mặc định
  return 'bạn';
}

/**
 * Format date thành string (VD: "25/12/2024")
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date thành string tiếng Việt (VD: "Thứ Tư, 25 tháng 12 năm 2024")
 */
function formatDateVN(date) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const months = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ngày ${day} ${month} năm ${year}`;
}

/**
 * @desc    Lưu danh sách task được chatbot đề xuất gần nhất cho user
 * @route   POST /api/chatbot/recommended-tasks
 * @access  Private
 */
const saveRecommendedTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;
  const { taskIds } = req.body || {};

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to use the chatbot', HTTP_STATUS.FORBIDDEN);
  }

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return sendError(res, 'taskIds must be a non-empty array', HTTP_STATUS.BAD_REQUEST);
  }

  const objectIds = taskIds
    .filter(id => typeof id === 'string' && id.trim())
    .map(id => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) {
    return sendError(res, 'No valid taskIds provided', HTTP_STATUS.BAD_REQUEST);
  }

  const state = await ChatbotState.findOneAndUpdate(
    { userId, groupId: currentGroupId },
    { recommendedTaskIds: objectIds },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return sendSuccess(
    res,
    {
      userId: state.userId,
      groupId: state.groupId,
      recommendedTaskIds: state.recommendedTaskIds
    },
    'Recommended tasks saved successfully'
  );
});

/**
 * @desc    Đánh giá trạng thái các task được đề xuất dựa trên database
 * @route   GET /api/chatbot/recommended-tasks/evaluate
 * @access  Private
 */
const evaluateRecommendedTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to use the chatbot', HTTP_STATUS.FORBIDDEN);
  }

  const state = await ChatbotState.findOne({
    userId,
    groupId: currentGroupId
  })
    .select('recommendedTaskIds')
    .lean();

  if (!state || !state.recommendedTaskIds || state.recommendedTaskIds.length === 0) {
    return sendSuccess(
      res,
      {
        hasRecommended: false,
        total: 0,
        completed: 0,
        anyCompleted: false,
        allCompleted: false,
        noneCompleted: true
      },
      'No recommended tasks found for this user'
    );
  }

  const tasks = await Task.find({
    _id: { $in: state.recommendedTaskIds },
    groupId: currentGroupId
  })
    .select('status')
    .lean();

  if (!tasks || tasks.length === 0) {
    return sendSuccess(
      res,
      {
        hasRecommended: false,
        total: 0,
        completed: 0,
        anyCompleted: false,
        allCompleted: false,
        noneCompleted: true
      },
      'No tasks found for recommended task IDs'
    );
  }

  const total = tasks.length;
  const completed = tasks.filter(task => task.status === 'completed').length;
  const anyCompleted = completed > 0;
  const allCompleted = completed === total;
  const noneCompleted = completed === 0;

  return sendSuccess(
    res,
    {
      hasRecommended: true,
      total,
      completed,
      anyCompleted,
      allCompleted,
      noneCompleted
    },
    'Recommended tasks evaluated successfully'
  );
});

/**
 * @desc    Thống kê tiến độ task của cả team trong group hiện tại (chỉ PM/Product Owner)
 * @route   GET /api/chatbot/group-progress
 * @access  Private
 */
const getGroupProgressSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to use the chatbot', HTTP_STATUS.FORBIDDEN);
  }

  // Tìm role của user trong group
  const group = await mongoose.model('Group').findById(currentGroupId).select('members').lean();
  if (!group) {
    return sendError(res, 'Group not found', HTTP_STATUS.NOT_FOUND);
  }

  const member = (group.members || []).find(
    m => m.userId?.toString() === userId.toString()
  );

  if (!member || ![GROUP_ROLE_KEYS.PRODUCT_OWNER, GROUP_ROLE_KEYS.PM].includes(member.role)) {
    return sendError(
      res,
      'Chatbot chỉ hỗ trợ xem tiến độ team cho Product Owner/PM của group này',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Lấy toàn bộ task (không giới hạn) trong group để tính % theo status
  const tasks = await Task.find({ groupId: currentGroupId }).select('status').lean();

  const total = tasks.length || 0;
  const countByStatus = {
    todo: 0,
    in_progress: 0,
    completed: 0,
    incomplete: 0
  };

  tasks.forEach(task => {
    if (countByStatus[task.status] !== undefined) {
      countByStatus[task.status]++;
    }
  });

  const toPercent = count => (total === 0 ? 0 : Math.round((count * 10000) / total) / 100);

  const summary = {
    totalTasks: total,
    todo: {
      count: countByStatus.todo,
      percent: toPercent(countByStatus.todo)
    },
    in_progress: {
      count: countByStatus.in_progress,
      percent: toPercent(countByStatus.in_progress)
    },
    completed: {
      count: countByStatus.completed,
      percent: toPercent(countByStatus.completed)
    },
    incomplete: {
      count: countByStatus.incomplete,
      percent: toPercent(countByStatus.incomplete)
    }
  };

  return sendSuccess(res, summary, 'Group progress summary retrieved successfully');
});

/**
 * @desc    Thống kê tiến độ task của một thành viên trong group (chỉ PM/Product Owner)
 * @route   GET /api/chatbot/member-progress?memberId=...
 * @access  Private
 */
const getMemberProgressSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;
  const { memberId } = req.query;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to use the chatbot', HTTP_STATUS.FORBIDDEN);
  }

  if (!memberId) {
    return sendError(res, 'memberId is required', HTTP_STATUS.BAD_REQUEST);
  }

  const group = await mongoose.model('Group').findById(currentGroupId).select('members').lean();
  if (!group) {
    return sendError(res, 'Group not found', HTTP_STATUS.NOT_FOUND);
  }

  const requesterMember = (group.members || []).find(
    m => m.userId?.toString() === userId.toString()
  );

  if (!requesterMember || ![GROUP_ROLE_KEYS.PRODUCT_OWNER, GROUP_ROLE_KEYS.PM].includes(requesterMember.role)) {
    return sendError(
      res,
      'Chatbot chỉ hỗ trợ xem tiến độ thành viên cho Product Owner/PM của group này',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const targetMember = (group.members || []).find(
    m => m.userId?.toString() === memberId.toString()
  );

  if (!targetMember) {
    return sendError(res, 'Thành viên không thuộc group này', HTTP_STATUS.FORBIDDEN);
  }

  const tasks = await Task.find({
    groupId: currentGroupId,
    'assignedTo.userId': memberId
  }).select('status').lean();

  const total = tasks.length || 0;
  const countByStatus = {
    todo: 0,
    in_progress: 0,
    completed: 0,
    incomplete: 0
  };

  tasks.forEach(task => {
    if (countByStatus[task.status] !== undefined) {
      countByStatus[task.status]++;
    }
  });

  const toPercent = count => (total === 0 ? 0 : Math.round((count * 10000) / total) / 100);

  const summary = {
    totalTasks: total,
    todo: {
      count: countByStatus.todo,
      percent: toPercent(countByStatus.todo)
    },
    in_progress: {
      count: countByStatus.in_progress,
      percent: toPercent(countByStatus.in_progress)
    },
    completed: {
      count: countByStatus.completed,
      percent: toPercent(countByStatus.completed)
    },
    incomplete: {
      count: countByStatus.incomplete,
      percent: toPercent(countByStatus.incomplete)
    }
  };

  return sendSuccess(res, summary, 'Member progress summary retrieved successfully');
});

module.exports = {
  getChatbotContext,
  saveRecommendedTasks,
  evaluateRecommendedTasks
  ,
  getGroupProgressSummary,
  getMemberProgressSummary
};



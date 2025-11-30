const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const taskService = require('../services/task.service');
const User = require('../models/User.model');
const Task = require('../models/Task.model');
const { HTTP_STATUS } = require('../config/constants');

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

  const todayTasks = await Task.find({
    groupId: currentGroupId,
    status: { $in: ['todo', 'in_progress', 'incomplete'] },
    $or: [
      { dueDate: { $gte: today, $lt: tomorrow } },
      { dueDate: null },
      { assignedTo: { $elemMatch: { userId: userId } } }
    ]
  })
    .populate('assignedTo.userId', 'name email')
    .select('title status priority dueDate')
    .limit(20)
    .lean();

  // Format tasks thành danh sách đơn giản
  const activeTasks = todayTasks
    .filter(task => {
      // Lọc tasks được assign cho user hoặc không có dueDate hoặc dueDate hôm nay
      const isAssignedToUser = task.assignedTo?.some(
        assignee => assignee.userId?._id?.toString() === userId.toString()
      );
      const isDueToday = task.dueDate && 
        new Date(task.dueDate) >= today && 
        new Date(task.dueDate) < tomorrow;
      
      return isAssignedToUser || !task.dueDate || isDueToday;
    })
    .map(task => task.title)
    .slice(0, 10); // Giới hạn 10 tasks

  // Lấy ngày hiện tại
  const currentDate = formatDate(today);

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
      todayTasksCount: todayTasks.length
    },
    date: {
      current_date: currentDate,
      current_date_vn: formatDateVN(today)
    },
    group: {
      id: currentGroupId.toString()
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

module.exports = {
  getChatbotContext
};



const asyncHandler = require('../middlewares/asyncHandler');
const userService = require('../services/user.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile (name, avatar)
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  
  try {
    const user = await userService.updateProfile(req.user._id, { name, avatar });
    
    sendSuccess(res, { user }, 'Cập nhật thông tin cá nhân thành công');
  } catch (error) {
    if (error.message.includes('cannot exceed')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   PUT /api/users/me/password
 * @desc    Change user password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  try {
    const result = await userService.changePassword(req.user._id, oldPassword, newPassword);
    
    sendSuccess(res, null, result.message);
  } catch (error) {
    if (error.message === 'Old password is incorrect') {
      return sendError(res, 'Mật khẩu cũ không đúng', 400);
    }
    if (error.message.includes('Password must')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   PUT /api/users/me/avatar
 * @desc    Update user avatar
 * @access  Private
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const { avatar } = req.body;
  
  if (!avatar) {
    return sendError(res, 'Avatar URL là bắt buộc', 400);
  }
  
  const user = await userService.updateAvatar(req.user._id, avatar);
  
  sendSuccess(res, { user }, 'Cập nhật avatar thành công');
});

/**
 * @route   PUT /api/users/me/notifications
 * @desc    Update notification settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const settings = req.body;
  
  try {
    const user = await userService.updateNotificationSettings(req.user._id, settings);
    
    sendSuccess(res, { user }, 'Cập nhật cài đặt thông báo thành công');
  } catch (error) {
    if (error.message.includes('beforeDue')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   DELETE /api/users/me
 * @desc    Deactivate user account
 * @access  Private
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  const result = await userService.deactivateAccount(req.user._id);
  
  sendSuccess(res, null, result.message);
});

module.exports = {
  updateProfile,
  changePassword,
  updateAvatar,
  updateNotificationSettings,
  deactivateAccount
};

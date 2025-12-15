const asyncHandler = require('../middlewares/asyncHandler');
const userService = require('../services/user.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile (name, avatar)
 * @access  Private
 */

const updateTheme = asyncHandler(async (req, res) => {
  const { theme } = req.body;

  // Validate theme
  const validThemes = ['light', 'dark', 'auto'];
  if (!validThemes.includes(theme)) {
    return sendError(res, 'Invalid theme. Must be one of: light, dark, auto', 400);
  }

  try {
    const updatedUser = await userService.updateUserTheme(req.user._id, theme);

    sendSuccess(res, { user: updatedUser }, 'Theme updated successfully');
  } catch (error) {
    console.error('Update theme error:', error);
    sendError(res, 'Failed to update theme', 500);
  }
});

/**
 * @route   PATCH /api/users/me/regional-preferences
 * @desc    Update user regional preferences (timeZone, dateFormat, timeFormat, weekStart)
 * @access  Private
 */
const updateRegionalPreferences = asyncHandler(async (req, res) => {
  const { timeZone, dateFormat, timeFormat, weekStart } = req.body;

  try {
    const preferences = {};
    if (timeZone !== undefined) preferences.timeZone = timeZone;
    if (dateFormat !== undefined) preferences.dateFormat = dateFormat;
    if (timeFormat !== undefined) preferences.timeFormat = timeFormat;
    if (weekStart !== undefined) preferences.weekStart = weekStart;

    const updatedUser = await userService.updateRegionalPreferences(req.user._id, preferences);

    sendSuccess(res, { user: updatedUser }, 'Regional preferences updated successfully');
  } catch (error) {
    console.error('Update regional preferences error:', error);
    if (error.message.includes('validation failed')) {
      return sendError(res, 'Invalid preference value', 400);
    }
    sendError(res, 'Failed to update regional preferences', 500);
  }
});

/**
 * @route   PATCH /api/users/me/language
 * @desc    Update user language preference
 * @access  Private
 */
const updateLanguage = asyncHandler(async (req, res) => {
  const { language } = req.body;

  // Validate language
  const validLanguages = ['en', 'vi'];
  if (!validLanguages.includes(language)) {
    return sendError(res, 'Invalid language. Must be one of: en, vi', 400);
  }

  try {
    const updatedUser = await userService.updateLanguage(req.user._id, language);

    sendSuccess(res, { user: updatedUser }, 'Language updated successfully');
  } catch (error) {
    console.error('Update language error:', error);
    sendError(res, 'Failed to update language', 500);
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, currentGroupId } = req.body;

  try {
    // Build update data object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (currentGroupId !== undefined) updateData.currentGroupId = currentGroupId;

    const user = await userService.updateProfile(req.user._id, updateData);

    sendSuccess(res, { user }, 'Profile updated successfully');
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
      return sendError(res, 'Old password is incorrect', 400);
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
    return sendError(res, 'Avatar URL is required', 400);
  }

  const user = await userService.updateAvatar(req.user._id, avatar);

  sendSuccess(res, { user }, 'Avatar updated successfully');
});

/**
 * @route   POST /api/users/me/avatar/upload
 * @desc    Upload user avatar file
 * @access  Private
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    return sendError(res, 'No file was uploaded', 400);
  }

  try {
    const user = await userService.uploadAvatar(req.user._id, file);

    sendSuccess(res, { user }, 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Upload avatar error:', error);
    sendError(res, error.message || 'Failed to upload avatar', 500);
  }
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

    sendSuccess(res, { user }, 'Notification settings updated successfully');
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
  uploadAvatar,
  updateNotificationSettings,
  deactivateAccount,
  updateTheme,
  updateRegionalPreferences,
  updateLanguage
};

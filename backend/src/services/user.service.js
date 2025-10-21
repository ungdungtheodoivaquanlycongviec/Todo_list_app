const User = require('../models/User.model');
const authService = require('./auth.service');
const fileService = require('./file.service');

class UserService {
  /**
   * Update user theme preference
   * @param {String} userId
   * @param {String} theme - 'light', 'dark', or 'auto'
   * @returns {Object} - Updated user
   */
  async updateUserTheme(userId, theme) {
    const user = await User.findByIdAndUpdate(
      userId,
      { theme },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toSafeObject();
  }
  
  /**
   * Get user by ID
   * @param {String} userId
   * @returns {Object} - User object without sensitive data
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toSafeObject();
  }
  
  /**
   * Update user profile
   * @param {String} userId
   * @param {Object} updateData - { name, avatar }
   * @returns {Object} - Updated user
   */
  async updateProfile(userId, updateData) {
    const allowedFields = ['name', 'avatar'];
    const updates = {};
    
    // Filter only allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    });
    
    // Validate name length if provided
    if (updates.name && updates.name.length > 100) {
      throw new Error('Name cannot exceed 100 characters');
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...updates,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toSafeObject();
  }
  
  /**
   * Change user password
   * @param {String} userId
   * @param {String} oldPassword
   * @param {String} newPassword
   */
  async changePassword(userId, oldPassword, newPassword) {
    // 1. Get user with password
    const user = await User.findById(userId).select('+password +refreshToken');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // 2. Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      throw new Error('Old password is incorrect');
    }
    
    // 3. Validate new password
    const passwordValidation = authService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }
    
    // 4. Update password (will trigger hash middleware)
    user.password = newPassword;
    
    // 5. Clear refresh token (force re-login on all devices)
    user.refreshToken = null;
    
    await user.save();
    
    return { message: 'Password changed successfully. Please login again.' };
  }
  
  /**
   * Update user avatar
   * @param {String} userId
   * @param {String} avatarUrl
   * @returns {Object} - Updated user
   */
  async updateAvatar(userId, avatarUrl) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        avatar: avatarUrl,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toSafeObject();
  }

  /**
   * Upload user avatar file
   * @param {String} userId
   * @param {Object} file - Multer file object
   * @returns {Object} - Updated user
   */
  async uploadAvatar(userId, file) {
    try {
      // Upload file to Cloudinary
      const uploadedFile = await fileService.uploadFile(file.buffer, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }, 'avatars');

      // Update user avatar
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          avatar: uploadedFile.url,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.toSafeObject();
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw new Error('Failed to upload avatar');
    }
  }
  
  /**
   * Update notification settings
   * @param {String} userId
   * @param {Object} settings - { email, push, beforeDue }
   * @returns {Object} - Updated user
   */
  async updateNotificationSettings(userId, settings) {
    const allowedFields = ['email', 'push', 'beforeDue'];
    const updates = {};
    
    // Filter and build notificationSettings update
    Object.keys(settings).forEach(key => {
      if (allowedFields.includes(key) && settings[key] !== undefined) {
        updates[`notificationSettings.${key}`] = settings[key];
      }
    });
    
    // Validate beforeDue is a positive number
    if (settings.beforeDue !== undefined && settings.beforeDue < 0) {
      throw new Error('beforeDue must be a positive number');
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...updates,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toSafeObject();
  }
  
  /**
   * Deactivate user account
   * @param {String} userId
   */
  async deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        refreshToken: null, // Clear refresh token
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return { message: 'Account deactivated successfully' };
  }
}

module.exports = new UserService();

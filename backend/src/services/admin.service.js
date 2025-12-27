const User = require('../models/User.model');
const LoginHistory = require('../models/LoginHistory.model');
const AdminActionLog = require('../models/AdminActionLog.model');
const Notification = require('../models/Notification.model');
const Group = require('../models/Group.model');
const { publishNotification } = require('./notification.producer');
const { isValidObjectId } = require('../utils/validationHelper');
const validator = require('validator');
const { GROUP_ROLES } = require('../config/constants');

class AdminService {
  /**
   * Log admin action
   */
  async logAdminAction(adminId, adminEmail, action, targetType, description, changes = {}, metadata = {}, req = null) {
    try {
      const logData = {
        admin: adminId,
        adminEmail,
        action,
        targetType,
        description,
        changes,
        metadata
      };

      if (req) {
        logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        logData.userAgent = req.headers['user-agent'];
      }

      await AdminActionLog.create(logData);
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Get all users with pagination and filters
   */
  async getUsers(query = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      isActive = '',
      groupRole = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (groupRole !== '') {
      if (groupRole === 'null') {
        filter.groupRole = null;
      } else {
        filter.groupRole = groupRole;
      }
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get users
    const users = await User.find(filter)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await User.countDocuments(filter);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create new user
   */
  async createUser(userData, adminId, adminEmail, req = null) {
    const { email, password, name, role = 'user', groupRole = null, isLeader = false } = userData;

    // Validate data
    if (!email || !validator.isEmail(email)) {
      throw new Error('Valid email is required');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!['user', 'admin'].includes(role)) {
      throw new Error('Invalid role. Only "user" and "admin" are allowed');
    }

    if (groupRole !== null && !GROUP_ROLES.includes(groupRole)) {
      throw new Error('Invalid groupRole');
    }

    if (typeof isLeader !== 'boolean') {
      throw new Error('isLeader must be a boolean');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      role,
      groupRole,
      isLeader,
      isActive: true,
      isEmailVerified: false
    });

    // Log action
    await this.logAdminAction(
      adminId,
      adminEmail,
      'user_create',
      'user',
      `Created new user: ${email}`,
      { userId: newUser._id, email, name, role, groupRole, isLeader },
      {},
      req
    );

    return newUser.toSafeObject();
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData, adminId, adminEmail, req = null) {
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID');
    }

    const allowedFields = ['name', 'email', 'avatar', 'role', 'isActive', 'isEmailVerified', 'groupRole', 'isLeader'];
    const updates = {};
    const changes = {};

    // Get original user data
    const originalUser = await User.findById(userId);
    if (!originalUser) {
      throw new Error('User not found');
    }

    // Filter and validate updates
    if (updateData.name !== undefined) {
      if (!updateData.name || updateData.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      if (updateData.name.length > 100) {
        throw new Error('Name cannot exceed 100 characters');
      }
      updates.name = updateData.name.trim();
      if (originalUser.name !== updates.name) {
        changes.name = { from: originalUser.name, to: updates.name };
      }
    }

    if (updateData.email !== undefined) {
      if (!validator.isEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }
      const emailLower = updateData.email.toLowerCase();
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: emailLower,
        _id: { $ne: userId }
      });
      if (existingUser) {
        throw new Error('Email is already taken by another user');
      }
      updates.email = emailLower;
      if (originalUser.email !== updates.email) {
        changes.email = { from: originalUser.email, to: updates.email };
      }
    }

    if (updateData.avatar !== undefined) {
      updates.avatar = updateData.avatar;
    }

    if (updateData.role !== undefined) {
      if (!['user', 'admin'].includes(updateData.role)) {
        throw new Error('Invalid role. Only "user" and "admin" are allowed');
      }
      // Super admin can assign any role, admin cannot assign admin role
      const admin = await User.findById(adminId);
      if (admin.role !== 'super_admin' && updateData.role === 'admin') {
        throw new Error('Only super_admin can assign admin role');
      }
      updates.role = updateData.role;
      if (originalUser.role !== updates.role) {
        changes.role = { from: originalUser.role, to: updates.role };
      }
    }

    if (updateData.groupRole !== undefined) {
      if (updateData.groupRole !== null && !GROUP_ROLES.includes(updateData.groupRole)) {
        throw new Error('Invalid groupRole');
      }
      updates.groupRole = updateData.groupRole;
      if (originalUser.groupRole !== updates.groupRole) {
        changes.groupRole = { from: originalUser.groupRole, to: updates.groupRole };
      }
    }

    if (updateData.isLeader !== undefined) {
      if (typeof updateData.isLeader !== 'boolean') {
        throw new Error('isLeader must be a boolean');
      }
      updates.isLeader = updateData.isLeader;
      if (originalUser.isLeader !== updates.isLeader) {
        changes.isLeader = { from: originalUser.isLeader, to: updates.isLeader };
      }
    }

    if (updateData.isActive !== undefined) {
      if (typeof updateData.isActive !== 'boolean') {
        throw new Error('isActive must be a boolean');
      }
      updates.isActive = updateData.isActive;
      if (originalUser.isActive !== updates.isActive) {
        changes.isActive = { from: originalUser.isActive, to: updates.isActive };
      }
    }

    if (updateData.isEmailVerified !== undefined) {
      if (typeof updateData.isEmailVerified !== 'boolean') {
        throw new Error('isEmailVerified must be a boolean');
      }
      updates.isEmailVerified = updateData.isEmailVerified;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -passwordResetToken -passwordResetExpires');

    if (!updatedUser) {
      throw new Error('User not found');
    }

    // Log action
    const actionType = Object.keys(changes).length > 0 ? 'user_update' : null;
    if (actionType) {
      await this.logAdminAction(
        adminId,
        adminEmail,
        actionType,
        'user',
        `Updated user: ${updatedUser.email}`,
        changes,
        { userId: updatedUser._id },
        req
      );
    }

    return updatedUser.toSafeObject();
  }

  /**
   * Lock/unlock user account
   */
  async toggleUserLock(userId, isActive, adminId, adminEmail, req = null) {
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: isActive,
        refreshToken: null // Clear refresh token to force re-login
      },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Log action
    const action = isActive ? 'user_unlock' : 'user_lock';
    await this.logAdminAction(
      adminId,
      adminEmail,
      action,
      'user',
      `${isActive ? 'Unlocked' : 'Locked'} user account: ${user.email}`,
      { userId: user._id, isActive },
      {},
      req
    );

    return user.toSafeObject();
  }

  /**
   * Assign admin role to user (super_admin only)
   */
  async assignAdminRole(userId, adminId, adminEmail, req = null) {
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'admin') {
      throw new Error('User is already an admin');
    }

    if (user.role === 'super_admin') {
      throw new Error('Cannot change super_admin role');
    }

    user.role = 'admin';
    await user.save();

    // Log action
    await this.logAdminAction(
      adminId,
      adminEmail,
      'admin_create',
      'admin',
      `Assigned admin role to user: ${user.email}`,
      { userId: user._id, email: user.email, role: 'admin' },
      {},
      req
    );

    return user.toSafeObject();
  }

  /**
   * Remove admin role from user (super_admin only)
   */
  async removeAdminRole(userId, adminId, adminEmail, req = null) {
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'admin') {
      throw new Error('User is not an admin');
    }

    if (user.role === 'super_admin') {
      throw new Error('Cannot change super_admin role');
    }

    user.role = 'user';
    await user.save();

    // Log action
    await this.logAdminAction(
      adminId,
      adminEmail,
      'admin_remove',
      'admin',
      `Removed admin role from user: ${user.email}`,
      { userId: user._id, email: user.email, role: 'user' },
      {},
      req
    );

    return user.toSafeObject();
  }

  /**
   * Send notification to users
   */
  async sendNotification(notificationData, adminId, adminEmail, req = null) {
    const { title, message, recipients, groupId, sendToAll = false } = notificationData;

    // Validate
    if (!title || title.trim().length === 0) {
      throw new Error('Notification title is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Notification message is required');
    }

    let recipientIds = [];

    if (sendToAll) {
      // Get all active users
      const users = await User.find({ isActive: true }).select('_id');
      recipientIds = users.map(u => u._id.toString());
    } else if (groupId) {
      // Get all members of the group
      if (!isValidObjectId(groupId)) {
        throw new Error('Invalid group ID');
      }
      const group = await Group.findById(groupId).populate('members.userId', '_id');
      if (!group) {
        throw new Error('Group not found');
      }
      recipientIds = group.members
        .map(m => m.userId?._id?.toString())
        .filter(id => id && isValidObjectId(id));
    } else if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      // Validate recipient IDs
      recipientIds = recipients.filter(id => isValidObjectId(id));
      if (recipientIds.length === 0) {
        throw new Error('No valid recipient IDs provided');
      }
    } else {
      throw new Error('Please specify recipients, groupId, or set sendToAll to true');
    }

    if (recipientIds.length === 0) {
      throw new Error('No recipients found');
    }

    // Send notifications
    const notificationPromises = recipientIds.map(recipientId => {
      return publishNotification(
        'admin_notification',
        {
          recipient: recipientId,
          sender: adminId,
          type: 'admin_notification',
          title: title.trim(),
          message: message.trim(),
          data: {
            source: 'admin',
            groupId: groupId || null
          },
          categories: ['system'],
          channels: ['in_app']
        }
      ).enqueuePromise;
    });

    const notifications = await Promise.all(notificationPromises);

    // Log action
    await this.logAdminAction(
      adminId,
      adminEmail,
      'notification_send',
      'notification',
      `Sent notification to ${recipientIds.length} user(s): ${title}`,
      {
        title,
        recipientCount: recipientIds.length,
        recipientIds,
        groupId: groupId || null,
        sendToAll
      },
      {},
      req
    );

    return {
      success: true,
      sentCount: notifications.length,
      recipients: recipientIds
    };
  }

  /**
   * Get login history with filters
   */
  async getLoginHistory(query = {}) {
    const {
      page = 1,
      limit = 50,
      userId = '',
      email = '',
      status = '',
      startDate = '',
      endDate = '',
      sortBy = 'loginAt',
      sortOrder = 'desc'
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (userId && isValidObjectId(userId)) {
      filter.user = userId;
    }

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.loginAt = {};
      if (startDate) {
        filter.loginAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.loginAt.$lte = new Date(endDate);
      }
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get login history
    const history = await LoginHistory.find(filter)
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await LoginHistory.countDocuments(filter);

    return {
      history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get admin action logs
   */
  async getAdminActionLogs(query = {}) {
    const {
      page = 1,
      limit = 50,
      adminId = '',
      action = '',
      targetType = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (adminId && isValidObjectId(adminId)) {
      filter.admin = adminId;
    }

    if (action) {
      filter.action = action;
    }

    if (targetType) {
      filter.targetType = targetType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get logs
    const logs = await AdminActionLog.find(filter)
      .populate('admin', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await AdminActionLog.countDocuments(filter);

    return {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get admin dashboard stats
   */
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalAdmins,
      totalGroups,
      recentLogins,
      recentActions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
      Group.countDocuments(),
      LoginHistory.countDocuments({ loginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      AdminActionLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalAdmins,
      totalGroups,
      recentLogins,
      recentActions
    };
  }

  /**
   * Get user analytics data
   */
  async getAnalytics() {
    const Task = require('../models/Task.model');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active users over time (last 7 days - users who logged in)
    const activeUsersOverTime = await LoginHistory.aggregate([
      {
        $match: {
          loginAt: { $gte: sevenDaysAgo },
          status: 'success'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$loginAt' } }
          },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          count: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Fill in missing dates with 0
    const dateMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }
    activeUsersOverTime.forEach(item => {
      dateMap.set(item.date, item.count);
    });
    const activeUsersChart = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Most active users (by task creation in last 30 days)
    const mostActiveUsers = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$createdBy',
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { taskCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $ifNull: ['$user.name', 'Unknown'] },
          email: { $ifNull: ['$user.email', ''] },
          taskCount: 1,
          completedCount: 1,
          completionRate: {
            $cond: [
              { $eq: ['$taskCount', 0] },
              0,
              { $multiply: [{ $divide: ['$completedCount', '$taskCount'] }, 100] }
            ]
          }
        }
      }
    ]);

    // Task completion rates (overall)
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = {};
    let totalTasks = 0;
    taskStats.forEach(stat => {
      statusMap[stat._id] = stat.count;
      totalTasks += stat.count;
    });

    const completionRate = totalTasks > 0
      ? Math.round((statusMap['completed'] || 0) / totalTasks * 100)
      : 0;

    // Storage usage by user - aggregate from multiple sources
    const GroupMessage = require('../models/GroupMessage.model');
    const DirectMessage = require('../models/DirectMessage.model');

    // 1. Task attachments
    const taskAttachments = await Task.aggregate([
      { $unwind: { path: '$attachments', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$attachments.uploadedBy',
          fileCount: { $sum: 1 },
          totalSize: { $sum: { $ifNull: ['$attachments.size', 0] } }
        }
      }
    ]);

    // 2. Task comment attachments
    const commentAttachments = await Task.aggregate([
      { $unwind: { path: '$comments', preserveNullAndEmptyArrays: false } },
      { $match: { 'comments.attachment': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$comments.user',
          fileCount: { $sum: 1 },
          totalSize: { $sum: { $ifNull: ['$comments.attachment.size', 0] } }
        }
      }
    ]);

    // 3. Group message attachments
    const groupMessageAttachments = await GroupMessage.aggregate([
      { $unwind: { path: '$attachments', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$senderId',
          fileCount: { $sum: 1 },
          totalSize: { $sum: { $ifNull: ['$attachments.size', 0] } }
        }
      }
    ]);

    // 4. Direct message attachments
    const directMessageAttachments = await DirectMessage.aggregate([
      { $unwind: { path: '$attachments', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$senderId',
          fileCount: { $sum: 1 },
          totalSize: { $sum: { $ifNull: ['$attachments.size', 0] } }
        }
      }
    ]);

    // Combine all sources
    const storageMap = new Map();

    const addToStorage = (items) => {
      items.forEach(item => {
        if (!item._id) return;
        const id = item._id.toString();
        if (storageMap.has(id)) {
          const existing = storageMap.get(id);
          existing.fileCount += item.fileCount;
          existing.totalSize += item.totalSize;
        } else {
          storageMap.set(id, {
            userId: item._id,
            fileCount: item.fileCount,
            totalSize: item.totalSize
          });
        }
      });
    };

    addToStorage(taskAttachments);
    addToStorage(commentAttachments);
    addToStorage(groupMessageAttachments);
    addToStorage(directMessageAttachments);

    // Sort by total size and get top 5
    const sortedStorage = Array.from(storageMap.values())
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 5);

    // Populate user names
    const userIds = sortedStorage.map(s => s.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name').lean();
    const userNameMap = new Map(users.map(u => [u._id.toString(), u.name]));

    const storageByUser = sortedStorage.map(item => ({
      userId: item.userId,
      name: userNameMap.get(item.userId.toString()) || 'Unknown',
      fileCount: item.fileCount,
      totalSize: item.totalSize
    }));

    return {
      activeUsersChart,
      mostActiveUsers,
      taskStats: {
        total: totalTasks,
        completed: statusMap['completed'] || 0,
        inProgress: statusMap['in_progress'] || 0,
        todo: statusMap['todo'] || 0,
        completionRate
      },
      storageByUser
    };
  }
}

module.exports = new AdminService();


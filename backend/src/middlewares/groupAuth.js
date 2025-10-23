const Group = require('../models/Group.model');
const { sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Middleware to check if user is member of a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkGroupMembership = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!groupId) {
      return sendError(res, 'Group ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return sendError(res, 'Group not found', HTTP_STATUS.NOT_FOUND);
    }

    if (!group.isMember(userId)) {
      return sendError(res, 'You are not a member of this group', HTTP_STATUS.FORBIDDEN);
    }

    // Add group info to request for use in controllers
    req.group = group;
    next();
  } catch (error) {
    console.error('Group membership check error:', error);
    sendError(res, 'Error checking group membership', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Middleware to check if user is admin of a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!groupId) {
      return sendError(res, 'Group ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if group exists and user is an admin
    const group = await Group.findById(groupId);
    if (!group) {
      return sendError(res, 'Group not found', HTTP_STATUS.NOT_FOUND);
    }

    if (!group.isAdmin(userId)) {
      return sendError(res, 'You must be an admin of this group to perform this action', HTTP_STATUS.FORBIDDEN);
    }

    // Add group info to request for use in controllers
    req.group = group;
    next();
  } catch (error) {
    console.error('Group admin check error:', error);
    sendError(res, 'Error checking group admin status', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Middleware to check if user has a current group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireCurrentGroup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = req.user;

    if (!user.currentGroupId) {
      return sendError(res, 'You must join or create a group to manage tasks', HTTP_STATUS.FORBIDDEN);
    }

    // Verify the group still exists and user is still a member
    const group = await Group.findById(user.currentGroupId);
    if (!group) {
      return sendError(res, 'Your current group no longer exists', HTTP_STATUS.NOT_FOUND);
    }

    if (!group.isMember(userId)) {
      return sendError(res, 'You are no longer a member of your current group', HTTP_STATUS.FORBIDDEN);
    }

    // Add group info to request
    req.group = group;
    next();
  } catch (error) {
    console.error('Current group check error:', error);
    sendError(res, 'Error checking current group', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  checkGroupMembership,
  checkGroupAdmin,
  requireCurrentGroup
};

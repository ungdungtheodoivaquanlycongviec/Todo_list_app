const groupService = require('../services/group.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

const createGroup = asyncHandler(async (req, res) => {
  const { name, description = '', memberIds = [] } = req.body;
  const creatorId = req.user._id;

  const result = await groupService.createGroup({
    name,
    description,
    creatorId,
    memberIds
  });

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  // Update user's currentGroupId
  const User = require('../models/User.model');
  await User.findByIdAndUpdate(creatorId, { currentGroupId: result.data._id });

  // Update the user object in the response
  const updatedUser = await User.findById(creatorId).select('-password -refreshToken -passwordResetToken -passwordResetExpires');
  result.data.updatedUser = updatedUser;

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.CREATED);
});

const getGroups = asyncHandler(async (req, res) => {
  const options = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    order: req.query.order,
    search: req.query.search
  };

  const result = await groupService.getGroupsForUser(req.user._id, options);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const getGroupDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.getGroupById(id, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.updateGroup(id, req.user._id, req.body);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.deleteGroup(id, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const addMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds = [] } = req.body;

  const result = await groupService.addMembers(id, req.user._id, memberIds);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const removeMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const result = await groupService.removeMember(id, req.user._id, memberId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.leaveGroup(id, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const getGroupTasks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    search: req.query.search
  };
  const options = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    order: req.query.order
  };

  const result = await groupService.getGroupTasks(id, req.user._id, filters, options);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const joinGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.joinGroup(id, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const switchToGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await groupService.switchToGroup(id, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  // Update the user object in the response to include currentGroupId
  const User = require('../models/User.model');
  const updatedUser = await User.findById(req.user._id).select('-password -refreshToken -passwordResetToken -passwordResetExpires');
  result.data.user = updatedUser;

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const inviteUserToGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  
  const result = await groupService.inviteUserToGroup(id, email, req.user._id);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

module.exports = {
  createGroup,
  getGroups,
  getGroupDetail,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
  leaveGroup,
  getGroupTasks,
  joinGroup,
  switchToGroup,
  inviteUserToGroup
};

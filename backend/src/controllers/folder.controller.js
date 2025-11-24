const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { folderService } = require('../services/folder.service');

const listFolders = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const result = await folderService.getFolders(groupId, req.user._id);
  sendSuccess(res, result.data, result.message, result.statusCode);
});

const createFolder = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const result = await folderService.createFolder(groupId, req.user._id, req.body);
  sendSuccess(res, result.data, result.message, result.statusCode);
});

const updateFolder = asyncHandler(async (req, res) => {
  const { groupId, folderId } = req.params;
  const result = await folderService.updateFolder(groupId, folderId, req.user._id, req.body);
  sendSuccess(res, result.data, result.message, result.statusCode);
});

const deleteFolder = asyncHandler(async (req, res) => {
  const { groupId, folderId } = req.params;
  const result = await folderService.deleteFolder(groupId, folderId, req.user._id);
  sendSuccess(res, result.data, result.message, result.statusCode);
});

const setFolderMembers = asyncHandler(async (req, res) => {
  const { groupId, folderId } = req.params;
  const { memberIds = [] } = req.body;
  const result = await folderService.setFolderMembers(groupId, folderId, req.user._id, memberIds);
  sendSuccess(res, result.data, result.message, result.statusCode);
});

module.exports = {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  setFolderMembers
};


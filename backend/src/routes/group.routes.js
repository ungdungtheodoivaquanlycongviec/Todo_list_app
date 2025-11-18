const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/group.controller');
const {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder
} = require('../controllers/folder.controller');
const {
  validateCreateGroup,
  validateUpdateGroup,
  validateManageGroupMembers,
  validateGroupMemberParam
} = require('../middlewares/validator');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', getGroups);
router.post('/', validateCreateGroup, createGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/switch', switchToGroup);
router.post('/:id/invite', inviteUserToGroup);
router.get('/:id/tasks', getGroupTasks);
router.post('/:id/members', validateManageGroupMembers, addMembers);
router.delete('/:id/members/:memberId', validateGroupMemberParam, removeMember);
router.post('/:id/leave', leaveGroup);
router.get('/:groupId/folders', listFolders);
router.post('/:groupId/folders', createFolder);
router.patch('/:groupId/folders/:folderId', updateFolder);
router.delete('/:groupId/folders/:folderId', deleteFolder);
router.get('/:id', getGroupDetail);
router.patch('/:id', validateUpdateGroup, updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupDetail,
  updateGroup,
  deleteGroup,
  addMembers,
  updateMemberRole,
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
  deleteFolder,
  setFolderMembers
} = require('../controllers/folder.controller');
const {
  validateCreateGroup,
  validateUpdateGroup,
  validateManageGroupMembers,
  validateMemberRoleUpdate,
  validateGroupMemberParam,
  validateGroupInvitation,
  validateFolderMemberAssignments
} = require('../middlewares/validator');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', getGroups);
router.post('/', validateCreateGroup, createGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/switch', switchToGroup);
router.post('/:id/invite', validateGroupInvitation, inviteUserToGroup);
router.get('/:id/tasks', getGroupTasks);
router.post('/:id/members', validateManageGroupMembers, addMembers);
router.delete('/:id/members/:memberId', validateGroupMemberParam, removeMember);
router.patch('/:id/members/:memberId/role', validateGroupMemberParam, validateMemberRoleUpdate, updateMemberRole);
router.post('/:id/leave', leaveGroup);
router.get('/:groupId/folders', listFolders);
router.post('/:groupId/folders', createFolder);
router.patch('/:groupId/folders/:folderId', updateFolder);
router.delete('/:groupId/folders/:folderId', deleteFolder);
router.put('/:groupId/folders/:folderId/members', validateFolderMemberAssignments, setFolderMembers);
router.get('/:id', getGroupDetail);
router.patch('/:id', validateUpdateGroup, updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;

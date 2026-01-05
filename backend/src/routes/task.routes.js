const express = require('express');
const router = express.Router();
const {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasks,
  getCalendarView,
  getKanbanView,
  addComment,
  updateComment,
  deleteComment,
  getComments,
  uploadAttachments,
  deleteAttachment,
  addCommentWithFile,
  assignTask,
  unassignUser,
  getAssignedToMe,
  getTaskAssignees,
  startTimer,
  stopTimer,
  setCustomStatus,
  setTaskRepetition,
  addChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem
} = require('../controllers/task.controller');
const {
  validateCreateTask,
  validateUpdateTask,
  validateAddComment,
  validateUpdateComment,
  validateAssignTask,
  validateUnassignUser
} = require('../middlewares/validator');
const { authenticate } = require('../middlewares/auth');
const { requireCurrentGroup } = require('../middlewares/groupAuth');
const { uploadMultiple, uploadSingle } = require('../middlewares/upload');

/**
 * Task Routes
 * All routes require authentication
 */

// Apply authentication to all task routes
router.use(authenticate);

// Apply group requirement to all task routes except group management
router.use(requireCurrentGroup);

// GET routes - List views
router.get('/assigned-to-me', getAssignedToMe); // Phải đặt trước /:id
router.get('/calendar', getCalendarView);  // Phải đặt trước /:id
router.get('/kanban', getKanbanView);      // Phải đặt trước /:id
router.get('/', getAllTasks);

// POST routes
router.post('/', validateCreateTask, createTask);

// GET single task
router.get('/:id/assignees', getTaskAssignees);
router.get('/:id', getTaskById);

// PUT/PATCH routes
router.put('/:id', validateUpdateTask, updateTask);
router.patch('/:id', validateUpdateTask, updateTask);

// Assignment routes
router.post('/:id/assign', validateAssignTask, assignTask);
router.delete('/:id/unassign/:userId', validateUnassignUser, unassignUser);

// DELETE routes
router.delete('/:id', deleteTask);

// Comment routes
router.post('/:id/comments', validateAddComment, addComment);
router.post('/:id/comments/with-file', uploadSingle, addCommentWithFile);
router.get('/:id/comments', getComments);
router.put('/:id/comments/:commentId', validateUpdateComment, updateComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Attachment routes
router.post('/:id/attachments', uploadMultiple, uploadAttachments);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

// NEW: Timer routes
router.post('/:id/start-timer', startTimer);
router.post('/:id/stop-timer', stopTimer);

// NEW: Custom status routes
router.post('/:id/custom-status', setCustomStatus);

// NEW: Task repetition routes
router.post('/:id/repeat', setTaskRepetition);

// NEW: Checklist routes
router.post('/:id/checklist', addChecklistItem);
router.put('/:id/checklist/:itemId', updateChecklistItem);
router.patch('/:id/checklist/:itemId/toggle', toggleChecklistItem);
router.delete('/:id/checklist/:itemId', deleteChecklistItem);

module.exports = router;

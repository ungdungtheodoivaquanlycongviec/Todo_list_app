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
  getTaskAssignees
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
const { uploadMultiple, uploadSingle } = require('../middlewares/upload');

/**
 * Task Routes
 * All routes require authentication
 */

// Apply authentication to all task routes
router.use(authenticate);

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

module.exports = router;

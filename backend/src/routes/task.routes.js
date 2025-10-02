const express = require('express');
const router = express.Router();
const {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getAllTasks,
  getCalendarView,
  getKanbanView
} = require('../controllers/task.controller');
const { validateCreateTask, validateUpdateTask } = require('../middlewares/validator');
const { authenticate } = require('../middlewares/auth');

/**
 * Task Routes
 * All routes require authentication
 */

// Apply authentication to all task routes
router.use(authenticate);

// GET routes - List views
router.get('/calendar', getCalendarView);  // Phải đặt trước /:id
router.get('/kanban', getKanbanView);      // Phải đặt trước /:id
router.get('/', getAllTasks);

// POST routes
router.post('/', validateCreateTask, createTask);

// GET single task
router.get('/:id', getTaskById);

// PUT/PATCH routes
router.put('/:id', validateUpdateTask, updateTask);
router.patch('/:id', validateUpdateTask, updateTask);

// DELETE routes
router.delete('/:id', deleteTask);

module.exports = router;

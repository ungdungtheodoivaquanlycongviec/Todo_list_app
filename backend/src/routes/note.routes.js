const express = require('express');
const router = express.Router();
const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
} = require('../controllers/note.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * Note Routes
 * All routes require authentication
 */

// GET /api/notes - Lấy tất cả notes của user
router.get('/', authenticate, getAllNotes);

// GET /api/notes/:id - Lấy note theo ID
router.get('/:id', authenticate, getNoteById);

// POST /api/notes - Tạo note mới
router.post('/', authenticate, createNote);

// PUT /api/notes/:id - Cập nhật note
router.put('/:id', authenticate, updateNote);

// DELETE /api/notes/:id - Xóa note
router.delete('/:id', authenticate, deleteNote);

module.exports = router;

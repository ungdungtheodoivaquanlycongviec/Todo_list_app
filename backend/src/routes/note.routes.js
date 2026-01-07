const express = require('express');
const router = express.Router();
const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  toggleBookmark,
  updateSharing,
  removeTag
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

// PATCH /api/notes/:id/bookmark - Toggle bookmark status
router.patch('/:id/bookmark', authenticate, toggleBookmark);

// PATCH /api/notes/:id/sharing - Update sharing settings
router.patch('/:id/sharing', authenticate, updateSharing);

// POST /api/notes/:id/tags/remove - Remove a tag
router.post('/:id/tags/remove', authenticate, removeTag);

module.exports = router;

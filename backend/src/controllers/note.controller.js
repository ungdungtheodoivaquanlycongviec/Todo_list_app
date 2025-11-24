const noteService = require('../services/note.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

/**
 * Note Controller
 * Xử lý HTTP requests/responses cho notes
 */

/**
 * @desc    Lấy tất cả notes của user
 * @route   GET /api/notes
 * @access  Private
 */
const getAllNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;
  const { search, page = 1, limit = 50, folderId } = req.query;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to view notes', HTTP_STATUS.FORBIDDEN);
  }

  const notes = await noteService.getAllNotes(userId, currentGroupId, {
    search,
    page,
    limit,
    folderId
  });

  sendSuccess(res, { notes }, SUCCESS_MESSAGES.NOTES_FETCHED);
});

/**
 * @desc    Lấy note theo ID
 * @route   GET /api/notes/:id
 * @access  Private
 */
const getNoteById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to view notes', HTTP_STATUS.FORBIDDEN);
  }

  const note = await noteService.getNoteById(id, userId, currentGroupId);

  if (!note) {
    return sendError(res, ERROR_MESSAGES.NOTE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, { note }, SUCCESS_MESSAGES.NOTE_FETCHED);
});

/**
 * @desc    Tạo note mới
 * @route   POST /api/notes
 * @access  Private
 */
const createNote = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to create notes', HTTP_STATUS.FORBIDDEN);
  }

  const noteData = {
    ...req.body,
    userId,
    groupId: currentGroupId
  };

  const note = await noteService.createNote(noteData);

  sendSuccess(res, { note }, SUCCESS_MESSAGES.NOTE_CREATED, HTTP_STATUS.CREATED);
});

/**
 * @desc    Cập nhật note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;
  const updateData = req.body;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to update notes', HTTP_STATUS.FORBIDDEN);
  }

  const note = await noteService.updateNote(id, userId, currentGroupId, updateData);

  if (!note) {
    return sendError(res, ERROR_MESSAGES.NOTE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, { note }, SUCCESS_MESSAGES.NOTE_UPDATED);
});

/**
 * @desc    Xóa note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const currentGroupId = req.user.currentGroupId;

  if (!currentGroupId) {
    return sendError(res, 'You must join or create a group to delete notes', HTTP_STATUS.FORBIDDEN);
  }

  const deleted = await noteService.deleteNote(id, userId, currentGroupId);

  if (!deleted) {
    return sendError(res, ERROR_MESSAGES.NOTE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  sendSuccess(res, null, SUCCESS_MESSAGES.NOTE_DELETED);
});

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};

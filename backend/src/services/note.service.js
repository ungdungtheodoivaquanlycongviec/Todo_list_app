const Note = require('../models/Note.model');

/**
 * Note Service
 * Xử lý business logic cho notes
 */

/**
 * Lấy tất cả notes của user
 * @param {string} userId - ID của user
 * @param {Object} options - Tùy chọn tìm kiếm và phân trang
 * @returns {Promise<Array>} Danh sách notes
 */
const getAllNotes = async (userId, options = {}) => {
  const { search, page = 1, limit = 50 } = options;
  
  // Tạo query
  let query = { userId };
  
  // Thêm tìm kiếm nếu có
  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // Tính toán skip
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Lấy notes
  const notes = await Note.find(query)
    .sort({ lastEdited: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return notes;
};

/**
 * Lấy note theo ID
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @returns {Promise<Object|null>} Note object hoặc null
 */
const getNoteById = async (noteId, userId) => {
  const note = await Note.findOne({ _id: noteId, userId }).lean();
  return note;
};

/**
 * Tạo note mới
 * @param {Object} noteData - Dữ liệu note
 * @returns {Promise<Object>} Note đã tạo
 */
const createNote = async (noteData) => {
  const note = new Note(noteData);
  await note.save();
  return note;
};

/**
 * Cập nhật note
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @param {Object} updateData - Dữ liệu cập nhật
 * @returns {Promise<Object|null>} Note đã cập nhật hoặc null
 */
const updateNote = async (noteId, userId, updateData) => {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { ...updateData, lastEdited: new Date() },
    { new: true, runValidators: true }
  );
  return note;
};

/**
 * Xóa note
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @returns {Promise<boolean>} True nếu xóa thành công
 */
const deleteNote = async (noteId, userId) => {
  const result = await Note.findOneAndDelete({ _id: noteId, userId });
  return !!result;
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};

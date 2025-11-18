const Note = require('../models/Note.model');
const { resolveFolderContext } = require('./folder.service');

/**
 * Note Service
 * Xử lý business logic cho notes
 */

/**
 * Lấy tất cả notes của user trong group
 * @param {string} userId - ID của user
 * @param {string} groupId - ID của group
 * @param {Object} options - Tùy chọn tìm kiếm và phân trang
 * @returns {Promise<Array>} Danh sách notes
 */
const getAllNotes = async (userId, groupId, options = {}) => {
  const { search, page = 1, limit = 50, folderId } = options;

  const { folder } = await resolveFolderContext({
    groupId,
    folderId,
    requesterId: userId
  });

  const filters = [{ userId }, { groupId }];

  if (folder) {
    if (folder.isDefault) {
      filters.push({
        $or: [
          { folderId: folder._id },
          { folderId: null },
          { folderId: { $exists: false } }
        ]
      });
    } else {
      filters.push({ folderId: folder._id });
    }
  }

  if (search && search.trim()) {
    filters.push({
      $or: [
        { title: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } }
      ]
    });
  }

  const query =
    filters.length > 1
      ? { $and: filters }
      : filters[0];

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const notes = await Note.find(query)
    .sort({ lastEdited: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  return notes;
};

/**
 * Lấy note theo ID
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @param {string} groupId - ID của group
 * @returns {Promise<Object|null>} Note object hoặc null
 */
const getNoteById = async (noteId, userId, groupId) => {
  const note = await Note.findOne({ _id: noteId, userId, groupId }).lean();
  return note;
};

/**
 * Tạo note mới
 * @param {Object} noteData - Dữ liệu note
 * @returns {Promise<Object>} Note đã tạo
 */
const createNote = async (noteData) => {
  const { folder } = await resolveFolderContext({
    groupId: noteData.groupId,
    folderId: noteData.folderId,
    requesterId: noteData.userId
  });

  const note = new Note({
    ...noteData,
    folderId: folder ? folder._id : null
  });
  await note.save();
  return note;
};

/**
 * Cập nhật note
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @param {string} groupId - ID của group
 * @param {Object} updateData - Dữ liệu cập nhật
 * @returns {Promise<Object|null>} Note đã cập nhật hoặc null
 */
const updateNote = async (noteId, userId, groupId, updateData) => {
  let folderUpdates = {};

  if (updateData.folderId !== undefined) {
    const { folder } = await resolveFolderContext({
      groupId,
      folderId: updateData.folderId,
      requesterId: userId
    });
    folderUpdates.folderId = folder ? folder._id : null;
    delete updateData.folderId;
  }

  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, groupId },
    { ...updateData, ...folderUpdates, lastEdited: new Date() },
    { new: true, runValidators: true }
  );

  return note;
};

/**
 * Xóa note
 * @param {string} noteId - ID của note
 * @param {string} userId - ID của user
 * @param {string} groupId - ID của group
 * @returns {Promise<boolean>} True nếu xóa thành công
 */
const deleteNote = async (noteId, userId, groupId) => {
  const result = await Note.findOneAndDelete({ _id: noteId, userId, groupId });
  return !!result;
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};

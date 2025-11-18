const mongoose = require('mongoose');
const Folder = require('../models/Folder.model');
const Group = require('../models/Group.model');
const Task = require('../models/Task.model');
const Note = require('../models/Note.model');
const {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LIMITS,
  HTTP_STATUS
} = require('../config/constants');
const { isValidObjectId } = require('../utils/validationHelper');

const normalizeId = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const buildError = (message, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const fetchGroupOrThrow = async (groupId, requesterId) => {
  if (!groupId || !isValidObjectId(groupId)) {
    throw buildError(ERROR_MESSAGES.INVALID_ID);
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw buildError(ERROR_MESSAGES.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (requesterId && !group.isMember(requesterId)) {
    throw buildError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  return group;
};

const ensureDefaultFolder = async (groupDoc, actorId = null) => {
  if (!groupDoc) {
    return null;
  }

  const groupId = normalizeId(groupDoc._id);
  let defaultFolder = null;

  if (groupDoc.defaultFolderId) {
    defaultFolder = await Folder.findOne({
      _id: groupDoc.defaultFolderId,
      groupId
    });
  }

  if (!defaultFolder) {
    defaultFolder = await Folder.findOne({ groupId, isDefault: true });
  }

  if (!defaultFolder) {
    defaultFolder = await Folder.create({
      name: 'General',
      description: 'Default folder',
      groupId,
      createdBy: normalizeId(actorId) || normalizeId(groupDoc.createdBy),
      isDefault: true,
      order: 0
    });
  }

  if (!groupDoc.defaultFolderId || normalizeId(groupDoc.defaultFolderId) !== normalizeId(defaultFolder._id)) {
    groupDoc.defaultFolderId = defaultFolder._id;
    await groupDoc.save();
  }

  return defaultFolder;
};

const resolveFolderContext = async ({
  groupId,
  groupDoc = null,
  folderId,
  requesterId,
  allowFallback = true
}) => {
  const normalizedGroupId = normalizeId(groupDoc?._id || groupId);
  const group = groupDoc || await fetchGroupOrThrow(normalizedGroupId, requesterId);

  if (groupDoc && requesterId && !group.isMember(requesterId)) {
    throw buildError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  const defaultFolder = await ensureDefaultFolder(group, requesterId);

  if (!folderId && !allowFallback) {
    return { group, folder: null, defaultFolder };
  }

  if (!folderId) {
    return { group, folder: defaultFolder, defaultFolder };
  }

  if (!isValidObjectId(folderId)) {
    throw buildError(ERROR_MESSAGES.INVALID_ID);
  }

  const folder = await Folder.findOne({ _id: folderId, groupId: group._id });
  if (!folder) {
    throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  return { group, folder, defaultFolder };
};

const mapCounts = (docs = []) =>
  docs.reduce((acc, item) => {
    const key = item._id ? item._id.toString() : 'unassigned';
    acc[key] = item.count;
    return acc;
  }, {});

class FolderService {
  async getFolders(groupId, requesterId) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const defaultFolder = await ensureDefaultFolder(group, requesterId);

    let folders = await Folder.find({ groupId })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const hasDefault = folders.some(folder => normalizeId(folder._id) === normalizeId(defaultFolder._id));
    if (!hasDefault && defaultFolder) {
      folders = [defaultFolder.toObject ? defaultFolder.toObject() : defaultFolder, ...folders];
    }

    const groupObjectId = new mongoose.Types.ObjectId(groupId);

    const [taskCountsRaw, noteCountsRaw] = await Promise.all([
      Task.aggregate([
        { $match: { groupId: groupObjectId } },
        { $group: { _id: '$folderId', count: { $sum: 1 } } }
      ]),
      Note.aggregate([
        { $match: { groupId: groupObjectId } },
        { $group: { _id: '$folderId', count: { $sum: 1 } } }
      ])
    ]);

    const taskCounts = mapCounts(taskCountsRaw);
    const noteCounts = mapCounts(noteCountsRaw);
    const defaultFolderId = normalizeId(defaultFolder?._id);

    const enrichedFolders = folders.map(folder => {
      const folderId = normalizeId(folder._id);
      const baseTaskCount = taskCounts[folderId] || 0;
      const baseNoteCount = noteCounts[folderId] || 0;
      const unassignedTaskCount = folderId === defaultFolderId ? taskCounts.unassigned || 0 : 0;
      const unassignedNoteCount = folderId === defaultFolderId ? noteCounts.unassigned || 0 : 0;

      return {
        ...folder,
        taskCount: baseTaskCount + unassignedTaskCount,
        noteCount: baseNoteCount + unassignedNoteCount,
        isDefault: folderId === defaultFolderId
      };
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.FOLDERS_FETCHED,
      data: {
        folders: enrichedFolders,
        meta: {
          total: enrichedFolders.length,
          defaultFolderId
        }
      }
    };
  }

  async createFolder(groupId, requesterId, payload = {}) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    await ensureDefaultFolder(group, requesterId);

    const folderCount = await Folder.countDocuments({ groupId });
    if (folderCount >= LIMITS.MAX_FOLDERS_PER_GROUP) {
      throw buildError(ERROR_MESSAGES.FOLDER_LIMIT_REACHED);
    }

    const name = payload.name ? payload.name.trim() : '';
    if (!name) {
      throw buildError('Folder name is required');
    }

    const existing = await Folder.findOne({
      groupId,
      name
    });

    if (existing) {
      throw buildError(ERROR_MESSAGES.FOLDER_NAME_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const lastFolder = await Folder.findOne({ groupId }).sort({ order: -1 }).lean();
    const order = lastFolder ? (lastFolder.order || 0) + 1 : 0;

    const folder = await Folder.create({
      name,
      description: payload.description ? payload.description.trim() : '',
      groupId,
      createdBy: requesterId,
      order,
      isDefault: false,
      metadata: {
        color: payload.metadata?.color || '#1d4ed8',
        icon: payload.metadata?.icon || 'folder'
      }
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: SUCCESS_MESSAGES.FOLDER_CREATED,
      data: folder
    };
  }

  async updateFolder(groupId, folderId, requesterId, payload = {}) {
    await fetchGroupOrThrow(groupId, requesterId);

    if (!folderId || !isValidObjectId(folderId)) {
      throw buildError(ERROR_MESSAGES.INVALID_ID);
    }

    const folder = await Folder.findOne({ _id: folderId, groupId });
    if (!folder) {
      throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updates = {};

    if (payload.name !== undefined) {
      const trimmedName = payload.name.trim();
      if (!trimmedName) {
        throw buildError('Folder name cannot be empty');
      }

      const conflict = await Folder.findOne({
        groupId,
        name: trimmedName,
        _id: { $ne: folderId }
      });

      if (conflict) {
        throw buildError(ERROR_MESSAGES.FOLDER_NAME_EXISTS, HTTP_STATUS.CONFLICT);
      }

      updates.name = trimmedName;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description ? payload.description.trim() : '';
    }

    if (payload.metadata && typeof payload.metadata === 'object') {
      const metadataUpdates = {};
      if (payload.metadata.color) {
        metadataUpdates['metadata.color'] = payload.metadata.color;
      }
      if (payload.metadata.icon) {
        metadataUpdates['metadata.icon'] = payload.metadata.icon;
      }
      Object.assign(updates, metadataUpdates);
    }

    if (payload.order !== undefined && Number.isFinite(payload.order)) {
      updates.order = payload.order;
    }

    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      { $set: updates },
      { new: true }
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.FOLDER_UPDATED,
      data: updatedFolder
    };
  }

  async deleteFolder(groupId, folderId, requesterId) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const { folder, defaultFolder } = await resolveFolderContext({
      groupId,
      groupDoc: group,
      folderId,
      requesterId
    });

    if (!folder) {
      throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (folder.isDefault || normalizeId(folder._id) === normalizeId(defaultFolder?._id)) {
      throw buildError(ERROR_MESSAGES.FOLDER_DELETE_DEFAULT, HTTP_STATUS.FORBIDDEN);
    }

    const [taskCount, noteCount] = await Promise.all([
      Task.countDocuments({ groupId, folderId }),
      Note.countDocuments({ groupId, folderId })
    ]);

    if (taskCount > 0 || noteCount > 0) {
      throw buildError(ERROR_MESSAGES.FOLDER_NOT_EMPTY, HTTP_STATUS.BAD_REQUEST);
    }

    await Folder.deleteOne({ _id: folderId, groupId });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.FOLDER_DELETED,
      data: { id: folderId }
    };
  }
}

const folderService = new FolderService();

module.exports = {
  folderService,
  ensureDefaultFolder,
  resolveFolderContext
};


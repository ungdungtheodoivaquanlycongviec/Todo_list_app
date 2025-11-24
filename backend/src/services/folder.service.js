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
const {
  canManageFolders,
  canAssignFolderMembers,
  canViewFolder,
  canViewAllFolders,
  canWriteInFolder,
  requiresFolderAssignment
} = require('../utils/groupPermissions');
const { isValidObjectId } = require('../utils/validationHelper');
const { emitFolderEvent, FOLDER_EVENTS } = require('./folder.realtime.gateway');

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

  // No longer creating default folder automatically
  // Return null if no default folder exists
  return defaultFolder;
};

const resolveFolderContext = async ({
  groupId,
  groupDoc = null,
  folderId,
  requesterId,
  allowFallback = true,
  access = null
}) => {
  const normalizedGroupId = normalizeId(groupDoc?._id || groupId);
  const group = groupDoc || await fetchGroupOrThrow(normalizedGroupId, requesterId);

  if (groupDoc && requesterId && !group.isMember(requesterId)) {
    throw buildError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  const defaultFolder = await ensureDefaultFolder(group, requesterId);
  const role = access?.role || getRequesterRole(group, requesterId);
  let accessResult = null;

  if (!folderId && !allowFallback) {
    return { group, folder: null, defaultFolder };
  }

  if (!folderId) {
    if (access?.enforceAssignment && requesterId && defaultFolder) {
      accessResult = assertFolderPermission({
        groupDoc: group,
        folderDoc: defaultFolder,
        requesterId,
        role,
        requireWrite: Boolean(access?.requireWrite)
      });
    }
    return { group, folder: defaultFolder, defaultFolder, permission: accessResult };
  }

  if (!isValidObjectId(folderId)) {
    throw buildError(ERROR_MESSAGES.INVALID_ID);
  }

  const folder = await Folder.findOne({ _id: folderId, groupId: group._id });
  if (!folder) {
    throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (access?.enforceAssignment && requesterId) {
    const targetFolder = folder || defaultFolder;
    if (targetFolder) {
      accessResult = assertFolderPermission({
        groupDoc: group,
        folderDoc: targetFolder,
        requesterId,
        role,
        requireWrite: Boolean(access?.requireWrite)
      });
    }
  }

  return { group, folder, defaultFolder, permission: accessResult };
};

const mapCounts = (docs = []) =>
  docs.reduce((acc, item) => {
    const key = item._id ? item._id.toString() : 'unassigned';
    acc[key] = item.count;
    return acc;
  }, {});

const getRequesterRole = (groupDoc, requesterId) => {
  if (!groupDoc || typeof groupDoc.getMemberRole !== 'function') {
    return null;
  }
  return groupDoc.getMemberRole(requesterId);
};

const hasFolderAssignment = (folderDoc, requesterId) => {
  if (!folderDoc || !Array.isArray(folderDoc.memberAccess)) {
    return false;
  }
  const targetId = normalizeId(requesterId);
  if (!targetId) {
    return false;
  }
  return folderDoc.memberAccess.some(access => normalizeId(access.userId) === targetId);
};

const serializeMemberAccess = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    userId: normalizeId(entry.userId),
    addedBy: normalizeId(entry.addedBy),
    addedAt: entry.addedAt || null
  }));

const assertFolderPermission = ({ groupDoc, folderDoc, requesterId, role, requireWrite = false }) => {
  const effectiveRole = role || getRequesterRole(groupDoc, requesterId);
  const assigned = hasFolderAssignment(folderDoc, requesterId);
  if (!canViewFolder(effectiveRole, { isAssigned: assigned })) {
    throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  if (requireWrite && !canWriteInFolder(effectiveRole, { isAssigned: assigned })) {
    throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  return { effectiveRole, assigned };
};

class FolderService {
  async getFolders(groupId, requesterId) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const defaultFolder = await ensureDefaultFolder(group, requesterId);
    const requesterRole = getRequesterRole(group, requesterId);
    const canViewAll = canViewAllFolders(requesterRole);
    const exposeMemberAccess = canAssignFolderMembers(requesterRole);
    const query = { groupId };
    if (!canViewAll) {
      const requesterObjectId = new mongoose.Types.ObjectId(normalizeId(requesterId));
      query['memberAccess.userId'] = requesterObjectId;
    }

    let folders = await Folder.find(query)
      .sort({ order: 1, createdAt: 1 })
      .lean();

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
    const defaultFolderId = defaultFolder ? normalizeId(defaultFolder._id) : null;

    const enrichedFolders = folders.map(folder => {
      const folderId = normalizeId(folder._id);
      const baseTaskCount = taskCounts[folderId] || 0;
      const baseNoteCount = noteCounts[folderId] || 0;
      // No longer adding unassigned tasks/notes to default folder since we don't have one
      const unassignedTaskCount = 0;
      const unassignedNoteCount = 0;

      const base = {
        ...folder,
        taskCount: baseTaskCount + unassignedTaskCount,
        noteCount: baseNoteCount + unassignedNoteCount,
        isDefault: defaultFolderId ? folderId === defaultFolderId : false
      };

      if (!canManageFolders(requesterRole)) {
        base.permissions = {
          canManage: canManageFolders(requesterRole),
          canWrite: canWriteInFolder(requesterRole, {
            isAssigned: hasFolderAssignment(folder, requesterId)
          })
        };
      }

      // Include memberAccess based on permissions:
      // - Admins (Product Owner/PM) see all memberAccess
      // - Regular users only see their own assignment in memberAccess
      if (exposeMemberAccess) {
        // Admins see all memberAccess
        base.memberAccess = serializeMemberAccess(folder.memberAccess);
      } else {
        // Regular users only see if they are assigned to this folder
        const userAssigned = hasFolderAssignment(folder, requesterId);
        if (userAssigned && Array.isArray(folder.memberAccess)) {
          const userAccess = folder.memberAccess.find(
            access => normalizeId(access.userId) === normalizeId(requesterId)
          );
          base.memberAccess = userAccess ? serializeMemberAccess([userAccess]) : [];
        } else {
          base.memberAccess = [];
        }
      }

      return base;
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
    const requesterRole = getRequesterRole(group, requesterId);

    if (!canManageFolders(requesterRole)) {
      throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }

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

    if (Array.isArray(payload.memberIds) && payload.memberIds.length > 0) {
      const memberSet = new Set(
        group.members.map(member => normalizeId(member.userId)).filter(Boolean)
      );
      const normalizedAssignments = Array.from(
        new Set(
          payload.memberIds
            .filter(isValidObjectId)
            .map(id => normalizeId(id))
        )
      ).filter(id => memberSet.has(id));

      if (normalizedAssignments.length > 0) {
        folder.memberAccess = normalizedAssignments.map(id => ({
          userId: id,
          addedBy: requesterId
        }));
        await folder.save();
      }
    }

    // Emit realtime event
    const folderData = folder.toObject ? folder.toObject() : folder;
    emitFolderEvent(FOLDER_EVENTS.created, {
      folder: folderData,
      groupId: normalizeId(groupId),
      recipients: group.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: SUCCESS_MESSAGES.FOLDER_CREATED,
      data: folder
    };
  }

  async updateFolder(groupId, folderId, requesterId, payload = {}) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const requesterRole = getRequesterRole(group, requesterId);

    if (!canManageFolders(requesterRole)) {
      throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }

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

    // Emit realtime event - only to users assigned to this folder (or admins)
    const folderData = updatedFolder.toObject ? updatedFolder.toObject() : updatedFolder;
    const canViewAll = canViewAllFolders(requesterRole);
    
    // Determine recipients: assigned users + admins
    let recipients = [];
    if (canViewAll) {
      // Admins get all updates
      recipients = group.members.map(member => normalizeId(member.userId)).filter(Boolean);
    } else {
      // Regular users: only those assigned to this folder
      if (Array.isArray(updatedFolder.memberAccess)) {
        recipients = updatedFolder.memberAccess
          .map(access => normalizeId(access.userId))
          .filter(Boolean);
      }
      // Also include admins
      group.members.forEach(member => {
        const memberId = normalizeId(member.userId);
        const memberRole = group.getMemberRole(memberId);
        if (memberId && canViewAllFolders(memberRole)) {
          if (!recipients.includes(memberId)) {
            recipients.push(memberId);
          }
        }
      });
    }
    
    emitFolderEvent(FOLDER_EVENTS.updated, {
      folder: folderData,
      groupId: normalizeId(groupId),
      recipients
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.FOLDER_UPDATED,
      data: updatedFolder
    };
  }

  async deleteFolder(groupId, folderId, requesterId) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const requesterRole = getRequesterRole(group, requesterId);

    if (!canManageFolders(requesterRole)) {
      throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }
    const { folder } = await resolveFolderContext({
      groupId,
      groupDoc: group,
      folderId,
      requesterId
    });

    if (!folder) {
      throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Product Owner can delete any folder, including folders with tasks/notes
    // For other roles with folder management, check if folder is empty
    const isProductOwner = group.isProductOwner(requesterId);
    
    if (!isProductOwner) {
      const [taskCount, noteCount] = await Promise.all([
        Task.countDocuments({ groupId, folderId }),
        Note.countDocuments({ groupId, folderId })
      ]);

      if (taskCount > 0 || noteCount > 0) {
        throw buildError(ERROR_MESSAGES.FOLDER_NOT_EMPTY, HTTP_STATUS.BAD_REQUEST);
      }
    } else {
      // Product Owner: Delete all tasks and notes in the folder first
      await Promise.all([
        Task.deleteMany({ groupId, folderId }),
        Note.deleteMany({ groupId, folderId })
      ]);
    }

    const folderData = folder.toObject ? folder.toObject() : folder;
    const groupIdNormalized = normalizeId(groupId);
    
    await Folder.deleteOne({ _id: folderId, groupId });

    // Emit realtime event
    emitFolderEvent(FOLDER_EVENTS.deleted, {
      folder: { ...folderData, _id: folderId },
      groupId: groupIdNormalized,
      recipients: group.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.FOLDER_DELETED,
      data: { id: folderId }
    };
  }

  async setFolderMembers(groupId, folderId, requesterId, memberIds = []) {
    const group = await fetchGroupOrThrow(groupId, requesterId);
    const requesterRole = getRequesterRole(group, requesterId);

    if (!canAssignFolderMembers(requesterRole)) {
      throw buildError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }

    if (!folderId || !isValidObjectId(folderId)) {
      throw buildError(ERROR_MESSAGES.INVALID_ID);
    }

    const folder = await Folder.findOne({ _id: folderId, groupId });
    if (!folder) {
      throw buildError(ERROR_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (folder.isDefault) {
      throw buildError('Cannot manage access for the default folder', HTTP_STATUS.FORBIDDEN);
    }

    if (!Array.isArray(memberIds)) {
      throw buildError('memberIds must be an array', HTTP_STATUS.BAD_REQUEST);
    }

    const memberSet = new Set(
      group.members.map(member => normalizeId(member.userId)).filter(Boolean)
    );

    const normalizedAssignments = Array.from(
      new Set(
        memberIds
          .filter(isValidObjectId)
          .map(id => normalizeId(id))
      )
    ).filter(id => memberSet.has(id));

    if (!Array.isArray(folder.memberAccess)) {
      folder.memberAccess = [];
    }

    folder.memberAccess = normalizedAssignments.map(id => {
      const existing = folder.memberAccess.find(access => normalizeId(access.userId) === id);
      return existing
        ? existing
        : {
            userId: id,
            addedBy: requesterId,
            addedAt: new Date()
          };
    });

    await folder.save();

    const plainFolder = folder.toObject();
    plainFolder.memberAccess = serializeMemberAccess(plainFolder.memberAccess);

    // Emit realtime event - only to users assigned to this folder (or admins)
    const canViewAll = canViewAllFolders(requesterRole);
    
    // Determine recipients: newly assigned users + admins
    let recipients = [];
    if (canViewAll) {
      // Admins get all updates
      recipients = group.members.map(member => normalizeId(member.userId)).filter(Boolean);
    } else {
      // Regular users: only those assigned to this folder
      if (Array.isArray(plainFolder.memberAccess)) {
        recipients = plainFolder.memberAccess
          .map(access => normalizeId(access.userId))
          .filter(Boolean);
      }
      // Also include admins
      group.members.forEach(member => {
        const memberId = normalizeId(member.userId);
        const memberRole = group.getMemberRole(memberId);
        if (memberId && canViewAllFolders(memberRole)) {
          if (!recipients.includes(memberId)) {
            recipients.push(memberId);
          }
        }
      });
    }
    
    emitFolderEvent(FOLDER_EVENTS.membersUpdated, {
      folder: plainFolder,
      groupId: normalizeId(groupId),
      recipients
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Folder members updated',
      data: plainFolder
    };
  }
}

const folderService = new FolderService();

module.exports = {
  folderService,
  ensureDefaultFolder,
  resolveFolderContext
};


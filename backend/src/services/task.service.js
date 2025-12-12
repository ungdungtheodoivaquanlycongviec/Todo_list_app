const Task = require('../models/Task.model');
const Group = require('../models/Group.model');
const Folder = require('../models/Folder.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const { ERROR_MESSAGES, TASK_STATUS, LIMITS, SUCCESS_MESSAGES, HTTP_STATUS, PRIORITY_LEVELS } = require('../config/constants');
const {
  isValidObjectId,
  validateTaskDates,
  validatePagination,
  validateSort
} = require('../utils/validationHelper');
const {
  addHours,
  getFirstDayOfMonth,
  getLastDayOfMonth
} = require('../utils/dateHelper');
const fileService = require('./file.service');
const notificationService = require('./notification.service');
const { TASK_EVENTS, emitTaskEvent } = require('./task.realtime.gateway');
const { resolveFolderContext } = require('./folder.service');
const {
  canCreateTasks,
  canWriteInFolder,
  canViewFolder,
  canViewAllFolders,
  requiresFolderAssignment,
  canAssignFolderMembers
} = require('../utils/groupPermissions');

const normalizeId = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const raiseError = (message, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const toPlainTask = (taskDoc) => {
  if (!taskDoc) {
    return null;
  }
  if (typeof taskDoc.toObject === 'function') {
    return taskDoc.toObject({
      virtuals: true,
      getters: true
    });
  }
  return taskDoc;
};

const buildRecipientList = (task, groupDoc = null) => {
  const recipients = new Set();
  const push = (value) => {
    const normalized = normalizeId(value);
    if (normalized) {
      recipients.add(normalized);
    }
  };

  if (!task) {
    return [];
  }

  push(task.createdBy);

  if (Array.isArray(task.assignedTo)) {
    task.assignedTo.forEach((assignment) => {
      if (!assignment) return;
      const user = assignment.userId || assignment;
      if (user && typeof user === 'object') {
        push(user._id || user.id || user);
      } else {
        push(user);
      }
    });
  }

  if (groupDoc && Array.isArray(groupDoc.members)) {
    groupDoc.members.forEach((member) => {
      if (!member) return;
      const user = member.userId || member;
      if (user && typeof user === 'object') {
        push(user._id || user.id || user);
      } else {
        push(user);
      }
    });
  }

  return Array.from(recipients);
};

const emitTaskRealtime = async ({
  taskDoc,
  groupDoc = null,
  eventKey = TASK_EVENTS.updated,
  meta = {}
}) => {
  if (!taskDoc) {
    return;
  }

  const plainTask = toPlainTask(taskDoc);
  if (!plainTask) {
    return;
  }

  const groupId = normalizeId(plainTask.groupId);
  let resolvedGroup = groupDoc;

  if (!resolvedGroup && groupId) {
    try {
      resolvedGroup = await Group.findById(groupId).select('_id members').lean();
    } catch (error) {
      console.warn('Failed to resolve group for realtime task event:', error.message);
    }
  }

  const recipients = buildRecipientList(plainTask, resolvedGroup);

  const taskId =
    normalizeId(plainTask._id) ||
    (typeof plainTask.id === 'string' ? plainTask.id : null);

  const mutationType =
    meta.mutationType ||
    (eventKey === TASK_EVENTS.created
      ? 'create'
      : eventKey === TASK_EVENTS.deleted
        ? 'delete'
        : 'update');

  emitTaskEvent(eventKey, {
    task: plainTask,
    taskId,
    groupId,
    recipients,
    meta: {
      ...meta,
      mutationType
    }
  });
};

const ensureGroupAccess = async (groupId, requesterId) => {
  if (!groupId) {
    raiseError(ERROR_MESSAGES.INVALID_ID);
  }

  const group = await Group.findById(groupId);
  if (!group) {
    raiseError(ERROR_MESSAGES.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (!group.isMember(requesterId)) {
    raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const role = group.getMemberRole(requesterId);

  return { group, role };
};

const enforceFolderAccess = async ({
  group,
  groupId,
  folderId,
  requesterId,
  role,
  requireWrite = false,
  allowFallback = true
}) => {
  if (!group && groupId) {
    group = await Group.findById(groupId);
  }

  return resolveFolderContext({
    groupId: groupId || group?._id,
    groupDoc: group,
    folderId,
    requesterId,
    allowFallback,
    access: {
      role,
      enforceAssignment: true,
      requireWrite
    }
  });
};

const buildFolderClauses = folder => {
  if (!folder) {
    return [];
  }

  if (folder.isDefault) {
    return [
      {
        $or: [
          { folderId: folder._id },
          { folderId: null },
          { folderId: { $exists: false } }
        ]
      }
    ];
  }

  return [{ folderId: folder._id }];
};

const buildScopedFolderFilter = async ({
  group,
  groupId,
  folderId,
  requesterId,
  role
}) => {
  if (folderId) {
    const { folder } = await enforceFolderAccess({
      group,
      groupId,
      folderId,
      requesterId,
      role,
      requireWrite: false
    });
    return buildFolderClauses(folder);
  }

  if (!requiresFolderAssignment(role)) {
    return [];
  }

  const assignedFolders = await Folder.find({
    groupId,
    'memberAccess.userId': requesterId
  })
    .select('_id isDefault')
    .lean();

  if (!assignedFolders || assignedFolders.length === 0) {
    raiseError(ERROR_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const clauses = [];
  const defaultFolder = assignedFolders.find(folder => folder.isDefault);
  const scopedFolders = assignedFolders.filter(folder => !folder.isDefault);

  if (scopedFolders.length > 0) {
    clauses.push({
      folderId: { $in: scopedFolders.map(folder => folder._id) }
    });
  }

  if (defaultFolder) {
    clauses.push({
      $or: [
        { folderId: defaultFolder._id },
        { folderId: null },
        { folderId: { $exists: false } }
      ]
    });
  }

  return clauses;
};

const ensureTaskWriteAccess = async (taskDoc, requesterId) => {
  if (!taskDoc) {
    raiseError(ERROR_MESSAGES.TASK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const groupId = normalizeId(taskDoc.groupId);
  if (!groupId) {
    raiseError(ERROR_MESSAGES.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const { group, role } = await ensureGroupAccess(groupId, requesterId);

  await enforceFolderAccess({
    group,
    groupId,
    folderId: taskDoc.folderId,
    requesterId,
    role,
    requireWrite: true
  });

  return { group, role };
};

/**
 * Task Service
 * Chứa toàn bộ business logic liên quan đến Task
 * Controller chỉ gọi service, không xử lý logic
 */

class TaskService {
  /**
   * Tạo task mới
   * @param {Object} taskData - Dữ liệu task
   * @returns {Promise<Object>} Task đã tạo
   */
  async createTask(taskData) {
    const creatorId = normalizeId(taskData.createdBy);
    if (!creatorId) {
      raiseError(ERROR_MESSAGES.INVALID_ID);
    }

    let groupMemberIds = null;
    let targetGroup = null;
    let requesterRole = null;

    if (taskData.groupId) {
      const groupId = normalizeId(taskData.groupId);
      if (!groupId || !isValidObjectId(groupId)) {
        raiseError('Invalid groupId format');
      }

      const { group, role } = await ensureGroupAccess(groupId, creatorId);
      targetGroup = group;
      requesterRole = role;

      if (!canCreateTasks(requesterRole)) {
        raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
      }

      groupMemberIds = new Set(
        group.members.map(member => normalizeId(member.userId)).filter(Boolean)
      );
      taskData.groupId = groupId;

      const { folder } = await enforceFolderAccess({
        group,
        groupId,
        folderId: taskData.folderId,
        requesterId: creatorId,
        role: requesterRole,
        requireWrite: true
      });

      taskData.folderId = folder ? folder._id : null;
    }

    let assignedIds = [];
    if (Array.isArray(taskData.assignedTo)) {
      assignedIds = taskData.assignedTo
        .map(assignee => normalizeId(assignee?.userId || assignee))
        .filter(Boolean);
    }

    // Check if user can assign to others (only PM and Product Owner)
    const canAssignToOthers = targetGroup ? canAssignFolderMembers(requesterRole) : false;

    // If user cannot assign to others, they can only assign to themselves
    if (!canAssignToOthers && assignedIds.length > 0) {
      // Filter to only allow self-assignment
      const selfOnly = assignedIds.filter(id => id === creatorId);
      if (selfOnly.length !== assignedIds.length) {
        raiseError('Bạn chỉ có thể gán task cho chính mình. Chỉ PM và Product Owner mới có thể gán task cho người khác.', HTTP_STATUS.FORBIDDEN);
      }
      assignedIds = selfOnly;
    }

    // If no assignees specified and user cannot assign to others, auto-assign to creator
    if (assignedIds.length === 0 && !canAssignToOthers) {
      assignedIds = [creatorId];
    }

    assignedIds = Array.from(new Set(assignedIds));

    if (groupMemberIds) {
      const outsideGroup = assignedIds.filter(id => !groupMemberIds.has(id));
      if (outsideGroup.length > 0) {
        raiseError(ERROR_MESSAGES.USER_NOT_IN_GROUP);
      }
    }

    // If task has a folder, check and auto-grant folder access for assigned users
    if (taskData.folderId && targetGroup) {
      const folder = await Folder.findById(taskData.folderId);
      if (folder && !folder.isDefault) {
        const folderMemberAccess = new Set(
          (folder.memberAccess || []).map(access => normalizeId(access.userId)).filter(Boolean)
        );

        // Find assignees who don't have folder access
        const assigneesWithoutAccess = assignedIds.filter(id => !folderMemberAccess.has(id));

        if (assigneesWithoutAccess.length > 0) {
          if (canAssignToOthers) {
            // PM/Product Owner can auto-grant folder access to assigned users
            console.log(`[TaskService] Auto-granting folder access to ${assigneesWithoutAccess.length} users`);

            // Add these users to folder's memberAccess
            const newMemberAccess = assigneesWithoutAccess.map(userId => ({
              userId: new mongoose.Types.ObjectId(userId),
              addedBy: new mongoose.Types.ObjectId(creatorId),
              addedAt: new Date()
            }));

            folder.memberAccess = folder.memberAccess || [];
            folder.memberAccess.push(...newMemberAccess);
            await folder.save();

            console.log(`[TaskService] Granted folder access to users: ${assigneesWithoutAccess.join(', ')}`);
          } else {
            // Regular users cannot assign to people without folder access
            raiseError('Không thể gán task cho người không có quyền truy cập vào folder này.', HTTP_STATUS.FORBIDDEN);
          }
        }
      }
    }

    if (assignedIds.length > LIMITS.MAX_ASSIGNEES_PER_TASK) {
      raiseError(`Task cannot have more than ${LIMITS.MAX_ASSIGNEES_PER_TASK} assignees`);
    }

    taskData.assignedTo = assignedIds.map(id => ({ userId: id }));

    const task = await Task.create(taskData);

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');

    if (targetGroup) {
      try {
        const recipientIds = targetGroup.members
          .map(member => normalizeId(member.userId))
          .filter(id => id && id !== creatorId);

        if (recipientIds.length > 0) {
          await notificationService.createNewTaskNotification({
            groupId: targetGroup._id,
            senderId: creatorId,
            groupName: targetGroup.name,
            taskId: populatedTask._id,
            taskTitle: populatedTask.title,
            recipientIds,
            creatorName: populatedTask.createdBy?.name || null,
            priority: populatedTask.priority,
            dueDate: populatedTask.dueDate
          });
        }
      } catch (notificationError) {
        console.error('Failed to dispatch task creation notification:', notificationError);
      }
    }

    await emitTaskRealtime({
      taskDoc: populatedTask,
      groupDoc: targetGroup,
      eventKey: TASK_EVENTS.created,
      meta: {
        mutationType: 'create',
        source: 'task:create'
      }
    });

    return populatedTask;
  }

  /**
   * Lấy task theo ID
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async getTaskById(taskId) {
    const task = await Task.findById(taskId)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');
    return task;
  }

  /**
   * Update overdue tasks to 'incomplete' status
   * Tasks with dueDate in the past and status of 'todo' or 'in_progress' will be marked as 'incomplete'
   * @param {String} groupId - Optional group ID to limit scope
   * @returns {Promise<Number>} Number of tasks updated
   */
  async updateOverdueTasks(groupId = null) {
    const now = new Date();
    // Set to start of today for comparison (end of previous day)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const query = {
      dueDate: { $lt: todayStart },
      status: { $in: ['todo', 'in_progress'] }
    };

    if (groupId) {
      query.groupId = groupId;
    }

    const result = await Task.updateMany(query, {
      $set: { status: 'incomplete' }
    });

    if (result.modifiedCount > 0) {
      console.log(`[TaskService] Updated ${result.modifiedCount} overdue tasks to 'incomplete' status`);
    }

    return result.modifiedCount;
  }

  /**
   * Lấy danh sách tasks với filter, sort, pagination
   * @param {Object} filters - Object chứa các filter
   * @param {Object} options - Options cho sort, pagination
   * @returns {Promise<Object>} { tasks, pagination }
   */
  async getAllTasks(filters = {}, options = {}, requesterId = null) {
    const { status, priority, search, groupId, folderId } = filters;
    const { sortBy, order, page, limit } = options;

    // Update overdue tasks before fetching
    if (groupId) {
      await this.updateOverdueTasks(groupId);
    }

    // Validate và sanitize pagination
    const paginationValidation = validatePagination(page, limit);
    const sanitizedPage = paginationValidation.sanitizedPage;
    const sanitizedLimit = paginationValidation.sanitizedLimit;

    // Validate và sanitize sort
    const allowedSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status'];
    const sortValidation = validateSort(sortBy, order, allowedSortFields);

    if (!sortValidation.isValid) {
      throw new Error(sortValidation.error);
    }

    const sanitizedSortBy = sortValidation.sanitizedSortBy;
    const sanitizedOrder = sortValidation.sanitizedOrder;

    const queryFilters = [];

    if (status) {
      if (!TASK_STATUS.includes(status)) {
        throw new Error(`Invalid status. Allowed values: ${TASK_STATUS.join(', ')}`);
      }
      queryFilters.push({ status });
    }

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error(`Invalid priority. Allowed values: ${validPriorities.join(', ')}`);
      }
      queryFilters.push({ priority });
    }

    if (groupId) {
      if (!isValidObjectId(groupId)) {
        raiseError('Invalid groupId format');
      }

      const { group, role } = await ensureGroupAccess(groupId, requesterId);

      queryFilters.push({ groupId });

      const folderClauses = await buildScopedFolderFilter({
        group,
        groupId,
        folderId,
        requesterId,
        role
      });

      if (folderClauses.length === 1) {
        queryFilters.push(folderClauses[0]);
      } else if (folderClauses.length > 1) {
        queryFilters.push({ $or: folderClauses });
      }
    }

    if (search && search.trim()) {
      queryFilters.push({
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    const query = queryFilters.length > 0 ? { $and: queryFilters } : {};

    // Sorting
    const sortOption = {};
    sortOption[sanitizedSortBy] = sanitizedOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Execute query VỚI POPULATE
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo.userId', 'name email avatar')
        .populate('comments.user', 'name email avatar')
        .populate('groupId', 'name description')
        .sort(sortOption)
        .skip(skip)
        .limit(sanitizedLimit)
        .lean(),
      Task.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / sanitizedLimit);

    return {
      tasks,
      pagination: {
        total,
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalPages
      }
    };
  }

  /**
   * Cập nhật task
   * @param {String} taskId - ID của task
   * @param {Object} updateData - Dữ liệu cần update
   * @returns {Promise<Object|null>} Task đã update hoặc null
   */
  async updateTask(taskId, updateData = {}, requesterId = null) {
    const taskDoc = await Task.findById(taskId);
    if (!taskDoc) {
      return null;
    }

    const { group: currentGroup, role: initialRole } = await ensureTaskWriteAccess(taskDoc, requesterId);

    const requesterIdStr = normalizeId(requesterId);
    const creatorIdStr = normalizeId(taskDoc.createdBy);

    let finalGroupId = normalizeId(taskDoc.groupId);
    let targetGroup = currentGroup;
    let requesterRole = initialRole;

    if (updateData.groupId !== undefined) {
      const requestedGroupId = updateData.groupId ? normalizeId(updateData.groupId) : null;

      const isTaskOwner = requesterIdStr && requesterIdStr === creatorIdStr;

      if (!isTaskOwner && (!requestedGroupId || !requesterIdStr)) {
        raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
      }

      if (requestedGroupId === null) {
        if (!isTaskOwner) {
          raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
        }
        finalGroupId = null;
      } else {
        if (!isValidObjectId(requestedGroupId)) {
          raiseError('Invalid groupId format');
        }

        targetGroup = await Group.findById(requestedGroupId);
        if (!targetGroup) {
          raiseError(ERROR_MESSAGES.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        const allowedToBind = isTaskOwner ? targetGroup.isAdmin(creatorIdStr) : targetGroup.isAdmin(requesterIdStr);
        if (!allowedToBind) {
          raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
        }

        finalGroupId = requestedGroupId;
        requesterRole = targetGroup.getMemberRole(requesterIdStr);
        if (!requesterRole) {
          raiseError(ERROR_MESSAGES.GROUP_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
        }
      }
    } else if (finalGroupId) {
      targetGroup = await Group.findById(finalGroupId);
    }

    let folderResolution = null;
    if ((updateData.folderId !== undefined || updateData.groupId !== undefined) && finalGroupId) {
      folderResolution = await enforceFolderAccess({
        group: targetGroup,
        groupId: finalGroupId,
        folderId: updateData.folderId,
        requesterId,
        role: requesterRole,
        requireWrite: true
      });
    } else if (updateData.folderId !== undefined && !finalGroupId) {
      raiseError('Cannot assign folder without a valid group', HTTP_STATUS.BAD_REQUEST);
    }

    const groupMemberIds = targetGroup
      ? new Set(targetGroup.members.map(member => normalizeId(member.userId)).filter(Boolean))
      : null;

    const currentAssignedIds = taskDoc.assignedTo
      .map(assignee => normalizeId(assignee.userId))
      .filter(Boolean);

    let finalAssignedIds = [...currentAssignedIds];

    if (updateData.assignedTo !== undefined) {
      if (!Array.isArray(updateData.assignedTo)) {
        raiseError('assignedTo must be an array');
      }

      finalAssignedIds = Array.from(
        new Set(
          updateData.assignedTo
            .map(assignee => normalizeId(assignee?.userId || assignee))
            .filter(Boolean)
        )
      );
    }

    // REMOVED: No longer automatically add creator to assignedTo when updating
    // Users have full control over who is assigned to the task

    if (finalAssignedIds.length > LIMITS.MAX_ASSIGNEES_PER_TASK) {
      raiseError(`Task cannot have more than ${LIMITS.MAX_ASSIGNEES_PER_TASK} assignees`);
    }

    if (groupMemberIds) {
      // REMOVED: No longer require creator to be in group members
      // Users can assign tasks to anyone in the group

      const outsideGroup = finalAssignedIds.filter(id => !groupMemberIds.has(id));
      if (outsideGroup.length > 0) {
        raiseError(ERROR_MESSAGES.USER_NOT_IN_GROUP);
      }
    }

    const updatePayload = { ...updateData };
    delete updatePayload.assignedTo;
    delete updatePayload.groupId;
    delete updatePayload.folderId;

    if (updateData.assignedTo !== undefined || groupMemberIds) {
      updatePayload.assignedTo = finalAssignedIds.map(id => ({ userId: id }));
    }

    if (updateData.groupId !== undefined) {
      updatePayload.groupId = finalGroupId;
    }

    if (folderResolution) {
      updatePayload.folderId = folderResolution.folder ? folderResolution.folder._id : null;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');

    // Send notifications for changes
    if (updatedTask && targetGroup) {
      try {
        // Notification when task is assigned to new users
        if (updateData.assignedTo !== undefined) {
          const newAssigneeIds = finalAssignedIds.filter(id => !currentAssignedIds.includes(id));
          if (newAssigneeIds.length > 0 && requesterIdStr) {
            const User = require('../models/User.model');
            const requester = await User.findById(requesterIdStr).select('name');
            await notificationService.createTaskAssignedNotification({
              taskId: updatedTask._id,
              senderId: requesterIdStr,
              assigneeIds: newAssigneeIds,
              taskTitle: updatedTask.title,
              groupId: finalGroupId,
              groupName: targetGroup.name,
              assignerName: requester?.name || null,
              priority: updatedTask.priority,
              dueDate: updatedTask.dueDate
            });
          }
        }

        // Notification when task is completed
        if (updateData.status === 'completed' && taskDoc.status !== 'completed') {
          const User = require('../models/User.model');
          const completer = await User.findById(requesterIdStr || creatorIdStr).select('name');
          await notificationService.createTaskCompletedNotification({
            taskId: updatedTask._id,
            completerId: requesterIdStr || creatorIdStr,
            taskTitle: updatedTask.title,
            groupId: finalGroupId,
            groupName: targetGroup.name,
            completerName: completer?.name || null,
            completedAt: updatedTask.completedAt || new Date()
          });
        }
      } catch (notificationError) {
        console.error('Failed to dispatch task update notifications:', notificationError);
      }
    }

    await emitTaskRealtime({
      taskDoc: updatedTask,
      groupDoc: targetGroup,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changedFields: Object.keys(updateData || {}),
        source: 'task:update'
      }
    });

    return updatedTask;
  }

  /**
   * Xóa task
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã xóa hoặc null
   */
  async deleteTask(taskId, requesterId = null) {
    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    await ensureTaskWriteAccess(task, requesterId);

    await Task.deleteOne({ _id: taskId });

    if (task) {
      await emitTaskRealtime({
        taskDoc: task,
        eventKey: TASK_EVENTS.deleted,
        meta: {
          mutationType: 'delete',
          source: 'task:delete'
        }
      });
    }

    return task;
  }

  /**
   * Lấy tasks theo calendar view (group by date)
   * @param {Number} year - Năm
   * @param {Number} month - Tháng (1-12)
   * @returns {Promise<Object>} { year, month, tasksByDate }
   */
  async getCalendarView(year, month, groupId, folderId = null, requesterId = null) {
    // Validate params
    if (!year || !month) {
      throw new Error('Year và month là bắt buộc');
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw new Error('Year và month phải là số hợp lệ');
    }

    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Month phải từ 1 đến 12');
    }

    if (yearNum < 2000 || yearNum > 2100) {
      throw new Error('Year phải từ 2000 đến 2100');
    }

    // Calculate date range using dateHelper
    const startDate = getFirstDayOfMonth(yearNum, monthNum);
    const endDate = getLastDayOfMonth(yearNum, monthNum);

    const { group, role } = await ensureGroupAccess(groupId, requesterId);
    const folderClauses = await buildScopedFolderFilter({
      group,
      groupId,
      folderId,
      requesterId,
      role
    });

    const filters = [
      { groupId },
      {
        dueDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    ];

    if (folderClauses.length === 1) {
      filters.push(folderClauses[0]);
    } else if (folderClauses.length > 1) {
      filters.push({ $or: folderClauses });
    }

    const query = { $and: filters };

    // Query tasks VỚI POPULATE và filter theo group
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description')
      .sort({ dueDate: 1, priority: -1 })
      .lean();

    // Group by date
    const tasksByDate = {};

    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });

    return {
      year: yearNum,
      month: monthNum,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTasks: tasks.length,
      tasksByDate
    };
  }

  /**
   * Lấy tasks theo kanban view (group by status)
   * @param {Object} filters - { priority, groupId, search }
   * @returns {Promise<Object>} Kanban board object
   */
  async getKanbanView(filters = {}, requesterId = null) {
    const { priority, groupId, search, folderId } = filters;

    // Update overdue tasks before fetching
    if (groupId) {
      await this.updateOverdueTasks(groupId);
    }

    const queryFilters = [];

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error(`Invalid priority. Allowed values: ${validPriorities.join(', ')}`);
      }
      queryFilters.push({ priority });
    }

    if (groupId) {
      if (!isValidObjectId(groupId)) {
        raiseError('Invalid groupId format');
      }

      const { group, role } = await ensureGroupAccess(groupId, requesterId);

      queryFilters.push({ groupId });

      const folderClauses = await buildScopedFolderFilter({
        group,
        groupId,
        folderId,
        requesterId,
        role
      });

      if (folderClauses.length === 1) {
        queryFilters.push(folderClauses[0]);
      } else if (folderClauses.length > 1) {
        queryFilters.push({ $or: folderClauses });
      }
    }

    if (search && search.trim()) {
      queryFilters.push({
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    const query = queryFilters.length > 0 ? { $and: queryFilters } : {};

    // Query all tasks VỚI POPULATE
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description')
      .sort({ priority: -1, dueDate: 1, createdAt: -1 })
      .lean();

    // Group by status với count
    const kanbanBoard = {
      todo: {
        tasks: [],
        count: 0
      },
      in_progress: {
        tasks: [],
        count: 0
      },
      completed: {
        tasks: [],
        count: 0
      },
      incomplete: {
        tasks: [],
        count: 0
      },
      archived: {
        tasks: [],
        count: 0
      }
    };

    tasks.forEach(task => {
      if (kanbanBoard[task.status]) {
        kanbanBoard[task.status].tasks.push(task);
        kanbanBoard[task.status].count++;
      }
    });

    return {
      kanbanBoard,
      totalTasks: tasks.length,
      filters: {
        priority: priority || 'all',
        groupId: groupId || null,
        search: search || null
      }
    };
  }

  /**
   * Kiểm tra task có tồn tại không
   * @param {String} taskId - ID của task
   * @returns {Promise<Boolean>}
   */
  async taskExists(taskId) {
    const count = await Task.countDocuments({ _id: taskId });
    return count > 0;
  }

  /**
   * Gán nhiều user vào task
   * @param {String} taskId
   * @param {Array<String>} userIds
   * @param {String} assignerId - Người thực hiện hành động (phải là task owner)
   * @returns {Promise<Object>} Kết quả xử lý
   */
  async assignUsersToTask(taskId, userIds = [], assignerId) {
    if (!isValidObjectId(taskId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_TASK_ID
      };
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.TASK_NOT_FOUND
      };
    }

    const normalizedAssignerId = normalizeId(assignerId);

    let groupMemberIds = null;
    let group = null;

    if (task.groupId) {
      group = await Group.findById(task.groupId);
      if (!group) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.GROUP_NOT_FOUND
        };
      }

      groupMemberIds = new Set(group.members.map(member => normalizeId(member.userId)).filter(Boolean));
    }

    // Check permissions: only PM and Product Owner can assign tasks to others
    const assignerRole = group ? group.getMemberRole(normalizedAssignerId) : null;
    const canAssignToOthers = canAssignFolderMembers(assignerRole);

    if (!normalizedAssignerId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Bạn không có quyền gán người dùng cho task này.'
      };
    }

    // If user cannot assign to others, they can only assign themselves
    if (!canAssignToOthers) {
      // Check if trying to assign to someone other than self
      const tryingToAssignOthers = sanitizedIds.some(id => id !== normalizedAssignerId);
      if (tryingToAssignOthers) {
        return {
          success: false,
          statusCode: HTTP_STATUS.FORBIDDEN,
          message: 'Bạn chỉ có thể gán task cho chính mình. Chỉ PM và Product Owner mới có thể gán task cho người khác.'
        };
      }
      // If no userIds provided or only self, allow self-assignment
      if (sanitizedIds.length === 0 || (sanitizedIds.length === 1 && sanitizedIds[0] === normalizedAssignerId)) {
        // Allow self-assignment
      } else {
        return {
          success: false,
          statusCode: HTTP_STATUS.FORBIDDEN,
          message: 'Bạn chỉ có thể gán task cho chính mình.'
        };
      }
    }

    const existingAssigneeIds = new Set(
      task.assignedTo.map(assignee => assignee.userId?.toString() || assignee.userId)
    );

    const ignoredSelf = [];
    const alreadyAssigned = [];
    const invalidIds = [];

    const sanitizedIds = Array.isArray(userIds)
      ? [...new Set(userIds.map(id => (id ? id.toString().trim() : '')).filter(Boolean))]
      : [];

    const filteredIds = [];

    sanitizedIds.forEach(id => {
      if (!isValidObjectId(id)) {
        invalidIds.push(id);
        return;
      }

      // Allow self-assignment for regular users
      if (id === normalizedAssignerId && !canAssignToOthers) {
        // Regular users can assign themselves
        if (existingAssigneeIds.has(id)) {
          alreadyAssigned.push(id);
          return;
        }
        filteredIds.push(id);
        return;
      }

      // For admins, ignore self-assignment attempts (they can assign others)
      if (id === normalizedAssignerId && canAssignToOthers) {
        ignoredSelf.push(id);
        return;
      }

      if (existingAssigneeIds.has(id)) {
        alreadyAssigned.push(id);
        return;
      }

      filteredIds.push(id);
    });

    if (groupMemberIds) {
      const outsideGroup = filteredIds.filter(id => !groupMemberIds.has(id));
      if (outsideGroup.length > 0) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.USER_NOT_IN_GROUP,
          errors: { notInGroup: outsideGroup }
        };
      }
    }

    // If task has a folder, verify all assignees have access to that folder
    if (task.folderId && group) {
      const folder = await Folder.findById(task.folderId);
      if (folder && !folder.isDefault) {
        const folderMemberAccess = new Set(
          (folder.memberAccess || []).map(access => normalizeId(access.userId)).filter(Boolean)
        );

        // Admins can assign to anyone in group, but regular users must have folder access
        const invalidAssignees = filteredIds.filter(id => {
          if (canAssignToOthers) {
            // Admins can assign to anyone in group
            return false;
          }
          // Regular users: assignees must have folder access (or be self)
          if (id === normalizedAssignerId) {
            return false; // Self-assignment is allowed
          }
          return !folderMemberAccess.has(id);
        });

        if (invalidAssignees.length > 0) {
          return {
            success: false,
            statusCode: HTTP_STATUS.FORBIDDEN,
            message: 'Không thể gán task cho người không có quyền truy cập vào folder này.',
            errors: { invalidAssignees }
          };
        }
      }
    }

    if (invalidIds.length > 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Danh sách userIds chứa giá trị không hợp lệ',
        errors: { invalidIds }
      };
    }

    if (filteredIds.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Không có user hợp lệ để gán',
        errors: {
          alreadyAssigned,
          ignoredSelf
        }
      };
    }

    const users = await User.find({ _id: { $in: filteredIds }, isActive: true })
      .select('_id')
      .lean();

    const activeIds = new Set(users.map(user => user._id.toString()));
    const inactiveOrMissing = filteredIds.filter(id => !activeIds.has(id));

    if (activeIds.size === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Không có user hợp lệ để gán',
        errors: {
          alreadyAssigned,
          ignoredSelf,
          inactiveOrMissing
        }
      };
    }

    const availableSlots = LIMITS.MAX_ASSIGNEES_PER_TASK - task.assignedTo.length;
    if (availableSlots <= 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: `Task đã đạt giới hạn ${LIMITS.MAX_ASSIGNEES_PER_TASK} assignees`
      };
    }

    const assignableIds = filteredIds.filter(id => activeIds.has(id));
    let finalAssignableIds = assignableIds.slice(0, availableSlots);
    const skippedDueToLimit = assignableIds.slice(availableSlots);

    if (finalAssignableIds.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Không có user hợp lệ để gán',
        errors: {
          alreadyAssigned,
          ignoredSelf,
          inactiveOrMissing,
          skippedDueToLimit
        }
      };
    }

    finalAssignableIds.forEach(userId => {
      task.assignedTo.push({ userId, assignedAt: new Date() });
    });

    await task.save();

    // POPULATE SAU KHI SAVE
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');

    // Send notification for assigned users
    if (finalAssignableIds.length > 0 && populatedTask.groupId) {
      try {
        const User = require('../models/User.model');
        const assigner = await User.findById(normalizedAssignerId).select('name');
        const groupName = (populatedTask.groupId && typeof populatedTask.groupId === 'object' && populatedTask.groupId.name)
          ? populatedTask.groupId.name
          : null;

        await notificationService.createTaskAssignedNotification({
          taskId: populatedTask._id,
          senderId: normalizedAssignerId,
          assigneeIds: finalAssignableIds,
          taskTitle: populatedTask.title,
          groupId: normalizeId(populatedTask.groupId),
          groupName: groupName,
          assignerName: assigner?.name || null,
          priority: populatedTask.priority,
          dueDate: populatedTask.dueDate
        });
      } catch (notificationError) {
        console.error('Failed to dispatch task assignment notification:', notificationError);
      }
    }

    await emitTaskRealtime({
      taskDoc: populatedTask,
      groupDoc: group,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'assignee:add',
        addedUserIds: finalAssignableIds,
        source: 'task:assign'
      }
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: `${SUCCESS_MESSAGES.TASK_ASSIGNED}. Đã gán ${finalAssignableIds.length} user(s) mới.`,
      task: populatedTask,
      assignedUserIds: finalAssignableIds,
      meta: {
        alreadyAssigned,
        ignoredSelf,
        inactiveOrMissing,
        skippedDueToLimit
      }
    };
  }

  /**
   * Bỏ gán một user khỏi task
   * @param {String} taskId
   * @param {String} userId
   * @param {String} requesterId
   * @returns {Promise<Object>} Kết quả xử lý
   */
  async unassignUserFromTask(taskId, userId, requesterId) {
    if (!isValidObjectId(taskId) || !isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.TASK_NOT_FOUND
      };
    }

    const requesterIdStr = requesterId?.toString();

    // Get group info to check admin permissions
    let group = null;
    if (task.groupId) {
      group = await Group.findById(task.groupId);
    }

    // Check permissions: user must be either creator, admin of the group, or the user being unassigned themselves
    const isCreator = normalizeId(task.createdBy) === requesterIdStr;
    const isGroupAdmin = group && group.isAdmin(requesterIdStr);
    const isUnassigningSelf = requesterIdStr === userId.toString();

    if (!requesterIdStr || (!isCreator && !isGroupAdmin && !isUnassigningSelf)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Bạn không có quyền bỏ gán người dùng khỏi task này. Chỉ người tạo task, admin của group, hoặc chính người dùng đó mới có thể thực hiện.'
      };
    }

    const assigneeIndex = task.assignedTo.findIndex(
      assignee => assignee.userId?.toString() === userId.toString()
    );

    if (assigneeIndex === -1) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'User không được gán cho task này'
      };
    }

    task.assignedTo.splice(assigneeIndex, 1);
    await task.save();

    // POPULATE SAU KHI SAVE
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');

    // Send notification for unassigned user
    if (populatedTask.groupId) {
      try {
        const User = require('../models/User.model');
        const unassigner = await User.findById(requesterIdStr).select('name');
        const groupName = (populatedTask.groupId && typeof populatedTask.groupId === 'object' && populatedTask.groupId.name)
          ? populatedTask.groupId.name
          : null;

        await notificationService.createTaskUnassignmentNotification({
          taskId: populatedTask._id,
          taskTitle: populatedTask.title,
          groupId: normalizeId(populatedTask.groupId),
          groupName: groupName,
          unassignerId: requesterIdStr,
          unassignerName: unassigner?.name || null,
          recipientId: userId.toString()
        });
      } catch (notificationError) {
        console.error('Failed to dispatch task unassignment notification:', notificationError);
      }
    }

    await emitTaskRealtime({
      taskDoc: populatedTask,
      groupDoc: group,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'assignee:remove',
        removedUserId: userId.toString(),
        source: 'task:unassign'
      }
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.TASK_UNASSIGNED,
      task: populatedTask,
      removedUserId: userId.toString()
    };
  }

  /**
   * Lấy danh sách task được gán cho một user (kèm filter + pagination)
   * @param {String} userId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Object>} { success, tasks, pagination }
   */
  async getTasksAssignedToUser(userId, filters = {}, options = {}) {
    if (!isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const { status, priority, search, groupId, folderId } = filters;
    const { sortBy, order, page, limit } = options;

    const queryFilters = [
      { 'assignedTo.userId': userId }
    ];

    if (status) {
      if (!TASK_STATUS.includes(status)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: `Invalid status. Allowed values: ${TASK_STATUS.join(', ')}`
        };
      }
      queryFilters.push({ status });
    }

    if (priority) {
      if (!PRIORITY_LEVELS.includes(priority)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: `Invalid priority. Allowed values: ${PRIORITY_LEVELS.join(', ')}`
        };
      }
      queryFilters.push({ priority });
    }

    if (groupId) {
      if (!isValidObjectId(groupId)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Invalid groupId format'
        };
      }
      queryFilters.push({ groupId });

      if (folderId !== undefined) {
        const { folder } = await resolveFolderContext({
          groupId,
          folderId,
          requesterId: userId
        });

        if (folder) {
          if (folder.isDefault) {
            queryFilters.push({
              $or: [
                { folderId: folder._id },
                { folderId: null },
                { folderId: { $exists: false } }
              ]
            });
          } else {
            queryFilters.push({ folderId: folder._id });
          }
        }
      }
    }

    if (search && search.trim()) {
      queryFilters.push({
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ]
      });
    }

    const query = queryFilters.length > 1 ? { $and: queryFilters } : queryFilters[0];

    const pagination = validatePagination(page, limit);
    const sanitizedPage = pagination.sanitizedPage;
    const sanitizedLimit = pagination.sanitizedLimit;

    const allowedSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status'];
    const sortValidation = validateSort(sortBy, order, allowedSortFields);

    if (!sortValidation.isValid) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: sortValidation.error
      };
    }

    const sortOption = {
      [sortValidation.sanitizedSortBy]: sortValidation.sanitizedOrder === 'asc' ? 1 : -1
    };

    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // THÊM POPULATE VÀO QUERY
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo.userId', 'name email avatar')
        .populate('comments.user', 'name email avatar')
        .populate('groupId', 'name description')
        .sort(sortOption)
        .skip(skip)
        .limit(sanitizedLimit)
        .lean(),
      Task.countDocuments(query)
    ]);

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Lấy danh sách tasks được gán thành công',
      data: {
        tasks,
        pagination: {
          total,
          page: sanitizedPage,
          limit: sanitizedLimit,
          totalPages: Math.ceil(total / sanitizedLimit)
        }
      }
    };
  }

  /**
   * Lấy danh sách assignees của task
   * @param {String} taskId
   * @returns {Promise<Object>} { success, assignees, count }
   */
  async getTaskAssignees(taskId) {
    if (!isValidObjectId(taskId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_TASK_ID
      };
    }

    const task = await Task.findById(taskId)
      .select('assignedTo createdBy')
      .populate('assignedTo.userId', 'name email avatar');

    if (!task) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.TASK_NOT_FOUND
      };
    }

    const assignees = task.assignedTo.map(assignee => ({
      _id: assignee._id,
      assignedAt: assignee.assignedAt,
      user: assignee.userId
        ? {
          _id: assignee.userId._id,
          name: assignee.userId.name,
          email: assignee.userId.email,
          avatar: assignee.userId.avatar
        }
        : null
    }));

    const inactiveCount = assignees.filter(item => item.user === null).length;

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Lấy danh sách assignees thành công',
      data: {
        taskId: task._id,
        total: assignees.length,
        inactiveCount,
        assignees
      }
    };
  }

  /**
   * Kiểm tra user có được gán vào task hay không
   * @param {String} taskId
   * @param {String} userId
   * @returns {Promise<Boolean>}
   */
  async isUserAssigned(taskId, userId) {
    if (!isValidObjectId(taskId) || !isValidObjectId(userId)) {
      return false;
    }

    const exists = await Task.exists({
      _id: taskId,
      'assignedTo.userId': userId
    });

    return Boolean(exists);
  }

  /**
   * Lấy số lượng tasks theo status
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Object>} { todo: 5, in_progress: 3, ... }
   */
  async getTaskCountByStatus(userId = null) {
    const match = userId ? { createdBy: userId } : {};

    const result = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {
      todo: 0,
      in_progress: 0,
      completed: 0,
      archived: 0
    };

    result.forEach(item => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Lấy tasks sắp đến hạn (trong vòng X giờ)
   * @param {Number} hours - Số giờ (default: 24)
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Array>} Danh sách tasks
   */
  async getTasksDueSoon(hours = 24, userId = null) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const query = {
      dueDate: {
        $gte: now,
        $lte: futureDate
      },
      status: { $ne: 'completed' }
    };

    if (userId) {
      query.createdBy = userId;
    }

    // THÊM POPULATE
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description')
      .sort({ dueDate: 1 })
      .lean();

    return tasks;
  }

  /**
   * Lấy tasks quá hạn (overdue)
   * @param {String} userId - ID của user (optional)
   * @returns {Promise<Array>} Danh sách tasks
   */
  async getOverdueTasks(userId = null) {
    const now = new Date();

    const query = {
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    };

    if (userId) {
      query.createdBy = userId;
    }

    // THÊM POPULATE
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description')
      .sort({ dueDate: 1 })
      .lean();

    return tasks;
  }

  /**
   * Đánh dấu task là completed
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã update
   */
  async markAsCompleted(taskId) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');
    return task;
  }

  /**
   * Archive task
   * @param {String} taskId - ID của task
   * @returns {Promise<Object|null>} Task đã update
   */
  async archiveTask(taskId) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: 'archived' } },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('groupId', 'name description');
    return task;
  }

  /**
   * Bulk update tasks
   * @param {Array} taskIds - Mảng các task IDs
   * @param {Object} updateData - Dữ liệu cần update
   * @returns {Promise<Object>} { modifiedCount }
   */
  async bulkUpdateTasks(taskIds, updateData) {
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updateData }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bulk delete tasks
   * @param {Array} taskIds - Mảng các task IDs
   * @returns {Promise<Object>} { deletedCount }
   */
  async bulkDeleteTasks(taskIds) {
    const result = await Task.deleteMany({
      _id: { $in: taskIds }
    });
    return { deletedCount: result.deletedCount };
  }

  /**
   * Thêm comment vào task
   * @param {String} taskId - ID của task
   * @param {String} userId - ID của user comment
   * @param {String} content - Nội dung comment
   * @returns {Promise<Object|null>} Task đã update
   */
  async addComment(taskId, userId, content) {
    // Validate taskId
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    // Tìm task
    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // FIXED: No restrictions - comments are available for all tasks regardless of due date
    // Check limit 200 comments
    if (task.comments.length >= 200) {
      throw new Error('Task đã đạt giới hạn 200 comments');
    }

    // Thêm comment
    task.comments.push({
      user: userId,
      content: content.trim(),
      createdAt: new Date()
    });

    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('comments.user', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('groupId', 'name description');

    // Send notification for new comment
    if (task.groupId) {
      try {
        const commenterIdStr = normalizeId(userId);
        const groupIdStr = normalizeId(task.groupId);
        const User = require('../models/User.model');
        const commenter = await User.findById(commenterIdStr).select('name');

        // Get all assignees and creator (excluding commenter)
        const recipientIds = [
          ...task.assignedTo.map(a => normalizeId(a.userId)),
          normalizeId(task.createdBy)
        ].filter(id => id && id !== commenterIdStr);

        const latestComment = task.comments[task.comments.length - 1];
        const groupName = (task.groupId && typeof task.groupId === 'object' && task.groupId.name)
          ? task.groupId.name
          : null;

        await notificationService.createCommentAddedNotification({
          taskId: task._id,
          commenterId: commenterIdStr,
          commentId: latestComment?._id,
          taskTitle: task.title,
          groupId: groupIdStr,
          groupName: groupName,
          commenterName: commenter?.name || null,
          commentPreview: content.trim(),
          recipientIds: Array.from(new Set(recipientIds))
        });
      } catch (notificationError) {
        console.error('Failed to dispatch comment notification:', notificationError);
      }
    }

    const latestComment = task.comments[task.comments.length - 1];

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'comment:add',
        commentId: normalizeId(latestComment?._id),
        source: 'task:comment:add'
      }
    });

    return task;
  }

  /**
   * Cập nhật comment
   * @param {String} taskId - ID của task
   * @param {String} commentId - ID của comment
   * @param {String} userId - ID của user (để check ownership)
   * @param {String} content - Nội dung mới
   * @returns {Promise<Object>} { success, task, message, statusCode }
   */
  async updateComment(taskId, commentId, userId, content) {
    // Validate IDs
    if (!isValidObjectId(taskId) || !isValidObjectId(commentId)) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_ID,
        statusCode: 400
      };
    }

    // Tìm task
    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        message: ERROR_MESSAGES.TASK_NOT_FOUND,
        statusCode: 404
      };
    }

    // Tìm comment
    const comment = task.comments.id(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment không tồn tại',
        statusCode: 404
      };
    }

    // Check ownership
    if (comment.user.toString() !== userId.toString()) {
      return {
        success: false,
        message: 'Bạn không có quyền chỉnh sửa comment này',
        statusCode: 403
      };
    }

    // Update comment
    comment.content = content.trim();
    comment.updatedAt = new Date();
    comment.isEdited = true;

    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('comments.user', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('groupId', 'name description');

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'comment:update',
        commentId: normalizeId(commentId),
        source: 'task:comment:update'
      }
    });

    return {
      success: true,
      task
    };
  }

  /**
   * Xóa comment
   * @param {String} taskId - ID của task
   * @param {String} commentId - ID của comment
   * @param {String} userId - ID của user (để check ownership)
   * @returns {Promise<Object>} { success, task, message, statusCode }
   */
  async deleteComment(taskId, commentId, userId) {
    // Validate IDs
    if (!isValidObjectId(taskId) || !isValidObjectId(commentId)) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_ID,
        statusCode: 400
      };
    }

    // Tìm task
    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        message: ERROR_MESSAGES.TASK_NOT_FOUND,
        statusCode: 404
      };
    }

    // Tìm comment
    const comment = task.comments.id(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment không tồn tại',
        statusCode: 404
      };
    }

    // Check ownership (author hoặc task owner)
    const isAuthor = comment.user.toString() === userId.toString();
    const isTaskOwner = task.createdBy.toString() === userId.toString();

    if (!isAuthor && !isTaskOwner) {
      return {
        success: false,
        message: 'Bạn không có quyền xóa comment này',
        statusCode: 403
      };
    }

    // Delete attachment from Cloudinary if exists
    if (comment.attachment && comment.attachment.publicId) {
      try {
        await fileService.deleteFile(
          comment.attachment.publicId,
          comment.attachment.resourceType || 'raw'
        );
      } catch (error) {
        console.error('Error deleting comment attachment from Cloudinary:', error);
        // Continue with comment deletion even if Cloudinary deletion fails
      }
    }

    // Xóa comment
    task.comments.pull(commentId);
    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('comments.user', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('groupId', 'name description');

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'comment:remove',
        commentId: normalizeId(commentId),
        source: 'task:comment:delete'
      }
    });

    return {
      success: true,
      task
    };
  }

  /**
   * Lấy danh sách comments của task với pagination
   * @param {String} taskId - ID của task
   * @param {Number} page - Trang hiện tại
   * @param {Number} limit - Số lượng comments mỗi trang
   * @returns {Promise<Object>} { success, comments, pagination }
   */
  async getComments(taskId, page = 1, limit = 20) {
    // Validate taskId
    if (!isValidObjectId(taskId)) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_ID,
        statusCode: 400
      };
    }

    // Tìm task VỚI POPULATE
    const task = await Task.findById(taskId)
      .populate('comments.user', 'name email avatar')
      .populate('assignedTo.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('groupId', 'name description');

    if (!task) {
      return {
        success: false,
        message: ERROR_MESSAGES.TASK_NOT_FOUND,
        statusCode: 404
      };
    }

    // Calculate pagination
    const totalComments = task.comments.length;
    const totalPages = Math.ceil(totalComments / limit);
    const skip = (page - 1) * limit;

    // Get paginated comments (reverse để comment mới nhất ở trên)
    const comments = task.comments
      .reverse()
      .slice(skip, skip + limit);

    return {
      success: true,
      comments,
      pagination: {
        page,
        limit,
        totalComments,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Upload attachments to task
   * @param {String} taskId - ID của task
   * @param {String} userId - ID của user upload
   * @param {Array} files - Array files từ multer
   * @returns {Promise<Object>} Result object
   */
  async uploadAttachments(taskId, userId, files) {
    // Validate task ID
    if (!isValidObjectId(taskId)) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_TASK_ID,
        statusCode: 400
      };
    }

    // Get task
    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        message: ERROR_MESSAGES.TASK_NOT_FOUND,
        statusCode: 404
      };
    }

    // FIXED: No restrictions - file uploads are available for all tasks regardless of due date

    // Check attachment limit (max 20 attachments per task)
    if (task.attachments.length + files.length > 20) {
      return {
        success: false,
        message: 'Vượt quá giới hạn 20 attachments cho mỗi task',
        statusCode: 400
      };
    }

    try {
      // Upload files to Cloudinary
      const uploadedFiles = await fileService.uploadMultipleFiles(files);

      // Add to task attachments
      const newAttachments = uploadedFiles.map(file => ({
        filename: file.originalName,
        url: file.url,
        publicId: file.publicId,
        mimetype: file.mimetype,
        size: file.size,
        resourceType: file.resourceType,
        uploadedBy: userId,
        uploadedAt: new Date()
      }));

      task.attachments.push(...newAttachments);
      await task.save();

      // POPULATE USER INFO SAU KHI SAVE
      await task.populate('attachments.uploadedBy', 'name email avatar');
      await task.populate('assignedTo.userId', 'name email avatar');
      await task.populate('createdBy', 'name email avatar');
      await task.populate('comments.user', 'name email avatar');
      await task.populate('groupId', 'name description');

      const addedAttachments = newAttachments.length > 0
        ? task.attachments.slice(-newAttachments.length)
        : [];

      await emitTaskRealtime({
        taskDoc: task,
        eventKey: TASK_EVENTS.updated,
        meta: {
          mutationType: 'update',
          changeType: 'attachment:add',
          attachmentIds: addedAttachments.map((attachment) => normalizeId(attachment?._id)),
          source: 'task:attachment:add'
        }
      });

      return {
        success: true,
        task,
        uploadedFiles: newAttachments
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Lỗi khi upload attachments',
        statusCode: 500
      };
    }
  }

  /**
   * Delete attachment from task
   * @param {String} taskId - ID của task
   * @param {String} attachmentId - ID của attachment
   * @param {String} userId - ID của user (để check ownership)
   * @returns {Promise<Object>} Result object
   */
  async deleteAttachment(taskId, attachmentId, userId) {
    // Validate IDs
    if (!isValidObjectId(taskId) || !isValidObjectId(attachmentId)) {
      return {
        success: false,
        message: 'ID không hợp lệ',
        statusCode: 400
      };
    }

    // Get task
    const task = await Task.findById(taskId);
    if (!task) {
      return {
        success: false,
        message: ERROR_MESSAGES.TASK_NOT_FOUND,
        statusCode: 404
      };
    }

    // Find attachment
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return {
        success: false,
        message: 'Không tìm thấy attachment',
        statusCode: 404
      };
    }

    // Check ownership (only uploader or task creator can delete)
    if (attachment.uploadedBy.toString() !== userId.toString() &&
      task.createdBy.toString() !== userId.toString()) {
      return {
        success: false,
        message: 'Bạn không có quyền xóa attachment này',
        statusCode: 403
      };
    }

    try {
      // Delete from Cloudinary
      await fileService.deleteFile(attachment.publicId, attachment.resourceType);

      // Remove from task
      task.attachments.pull(attachmentId);
      await task.save();

      // POPULATE USER INFO SAU KHI SAVE
      await task.populate('attachments.uploadedBy', 'name email avatar');
      await task.populate('assignedTo.userId', 'name email avatar');
      await task.populate('createdBy', 'name email avatar');
      await task.populate('comments.user', 'name email avatar');
      await task.populate('groupId', 'name description');

      await emitTaskRealtime({
        taskDoc: task,
        eventKey: TASK_EVENTS.updated,
        meta: {
          mutationType: 'update',
          changeType: 'attachment:remove',
          attachmentId: normalizeId(attachmentId),
          source: 'task:attachment:delete'
        }
      });

      return {
        success: true,
        task
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Lỗi khi xóa attachment',
        statusCode: 500
      };
    }
  }

  /**
   * Add comment with optional file attachment
   * @param {String} taskId - ID của task
   * @param {String} userId - ID của user comment
   * @param {String} content - Nội dung comment
   * @param {Object} file - File từ multer (optional)
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async addCommentWithFile(taskId, userId, content, file = null) {
    // Validate task ID
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK_ID);
    }

    // Get task
    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // FIXED: No restrictions - comments with files are available for all tasks regardless of due date
    // Check comment limit
    if (task.comments.length >= 200) {
      throw new Error('Vượt quá giới hạn 200 comments cho mỗi task');
    }

    // Create comment object
    const newComment = {
      user: userId,
      content: content || '',
      createdAt: new Date()
    };

    // Upload file if provided
    if (file) {
      try {
        const uploadedFile = await fileService.uploadFile(
          file.buffer,
          {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          },
          'comments'
        );
        newComment.attachment = {
          filename: uploadedFile.filename,
          url: uploadedFile.url,
          publicId: uploadedFile.publicId,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          resourceType: uploadedFile.resourceType
        };
      } catch (error) {
        throw new Error(`Lỗi khi upload file: ${error.message}`);
      }
    }

    // Require either content or attachment
    if (!newComment.content && !newComment.attachment) {
      throw new Error('Comment phải có nội dung hoặc file đính kèm');
    }

    // Add comment
    task.comments.push(newComment);
    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('comments.user', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    const latestComment = task.comments[task.comments.length - 1];

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'comment:add',
        commentId: normalizeId(latestComment?._id),
        source: 'task:comment:add:file'
      }
    });

    return task;
  }

  /**
   * Start timer for task
   * @param {String} taskId - ID của task
   * @param {String} userId - ID của user
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async startTimer(taskId, userId) {
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK_ID);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // Cannot start timer for completed or incomplete tasks
    if (task.status === 'completed' || task.status === 'incomplete') {
      throw new Error('Cannot start timer for completed or incomplete tasks');
    }

    // Auto-change status from todo to in_progress when starting timer
    if (task.status === 'todo') {
      task.status = 'in_progress';
    }

    // Set start time
    task.startTime = new Date();
    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('comments.user', 'name email avatar');
    await task.populate('groupId', 'name description');

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'timer:start',
        source: 'task:timer:start'
      }
    });

    return task;
  }

  /**
   * Stop timer for task
   * @param {String} taskId - ID của task
   * @param {String} userId - ID của user
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async stopTimer(taskId, userId) {
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK_ID);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // Calculate elapsed time and add to time entries
    if (task.startTime) {
      const now = new Date();
      const elapsedMs = now.getTime() - task.startTime.getTime();
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

      // Add time entry
      task.timeEntries.push({
        user: userId,
        date: now,
        hours,
        minutes,
        description: 'Timer session',
        billable: true,
        startTime: task.startTime,
        endTime: now
      });

      // Clear start time
      task.startTime = null;
    }

    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('comments.user', 'name email avatar');
    await task.populate('groupId', 'name description');

    const latestEntry = task.timeEntries[task.timeEntries.length - 1];

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'timer:stop',
        timeEntryId: normalizeId(latestEntry?._id),
        source: 'task:timer:stop'
      }
    });

    return task;
  }

  /**
   * Set custom status for task
   * @param {String} taskId - ID của task
   * @param {String} name - Custom status name
   * @param {String} color - Custom status color
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async setCustomStatus(taskId, name, color) {
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK_ID);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // Set custom status (stored separately from main status enum)
    task.customStatus = {
      name,
      color
    };

    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('comments.user', 'name email avatar');
    await task.populate('groupId', 'name description');

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'status:custom',
        customStatus: task.customStatus,
        source: 'task:status:custom'
      }
    });

    return task;
  }

  /**
   * Set task repetition settings
   * @param {String} taskId - ID của task
   * @param {Object} repetitionSettings - Repetition settings
   * @returns {Promise<Object|null>} Task hoặc null
   */
  async setTaskRepetition(taskId, repetitionSettings) {
    if (!isValidObjectId(taskId)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK_ID);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return null;
    }

    // Update repetition settings
    task.repetition = {
      isRepeating: repetitionSettings.isRepeating,
      frequency: repetitionSettings.frequency,
      interval: repetitionSettings.interval,
      endDate: repetitionSettings.endDate,
      occurrences: repetitionSettings.occurrences
    };

    await task.save();

    // POPULATE USER INFO SAU KHI SAVE
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo.userId', 'name email avatar');
    await task.populate('comments.user', 'name email avatar');
    await task.populate('groupId', 'name description');

    await emitTaskRealtime({
      taskDoc: task,
      eventKey: TASK_EVENTS.updated,
      meta: {
        mutationType: 'update',
        changeType: 'repeat:update',
        repetition: task.repetition,
        source: 'task:repeat:update'
      }
    });

    return task;
  }
}

// Export singleton instance
module.exports = new TaskService();
const Group = require('../models/Group.model');
const Task = require('../models/Task.model');
const User = require('../models/User.model');
const Folder = require('../models/Folder.model');
const notificationService = require('./notification.service');
const {
  LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  GROUP_ROLE_KEYS,
  GROUP_ROLES
} = require('../config/constants');
const { emitGroupEvent, GROUP_EVENTS } = require('./group.realtime.gateway');
const {
  canManageRoles,
  canManageFolders,
  canAssignFolderMembers,
  isReadOnlyRole,
  canViewAllFolders
} = require('../utils/groupPermissions');
// const nodemailer = require('nodemailer'); // No longer needed - using notifications
const {
  isValidObjectId,
  validatePagination,
  validateSort
} = require('../utils/validationHelper');

const normalizeId = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

class GroupService {
  async createGroup({ name, description, creatorId, members = [], memberIds = [] }) {
    const sanitizedName = name.trim();
    const sanitizedDescription = description ? description.trim() : '';

    const creatorIdStr = normalizeId(creatorId);
    const normalizedMembersInput = Array.isArray(members) && members.length > 0
      ? members
      : (Array.isArray(memberIds) ? memberIds.map(userId => ({ userId, role: GROUP_ROLE_KEYS.BA })) : []);

    if (normalizedMembersInput.some(entry => entry && !entry.role)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Each member must include a role'
      };
    }

    const uniqueMemberIds = new Map();
    normalizedMembersInput
      .filter(Boolean)
      .forEach(entry => {
        const userId = normalizeId(entry.userId || entry);
        if (!userId || userId === creatorIdStr) {
          return;
        }
        if (!entry.role || !GROUP_ROLES.includes(entry.role)) {
          return;
        }
        if (entry.role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
          return;
        }
        uniqueMemberIds.set(userId, { userId, role: entry.role });
      });

    if (!creatorIdStr) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    if (uniqueMemberIds.size + 1 > LIMITS.MAX_MEMBERS_PER_GROUP) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.GROUP_MEMBER_LIMIT_REACHED
      };
    }

    const membersArray = Array.from(uniqueMemberIds.entries());

    if (membersArray.some(([id]) => !isValidObjectId(id))) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const users = await User.find({ _id: { $in: membersArray.map(([id]) => id) }, isActive: true })
      .select('_id name email avatar')
      .lean();
    const validMemberIds = new Set(users.map(user => user._id.toString()));

    const group = await Group.create({
      name: sanitizedName,
      description: sanitizedDescription,
      createdBy: creatorId,
      members: [
        { userId: creatorId, role: GROUP_ROLE_KEYS.PRODUCT_OWNER, joinedAt: new Date() },
        ...membersArray
          .filter(([id]) => validMemberIds.has(id))
          .map(([id, payload]) => ({
            userId: id,
            role: payload.role,
            joinedAt: new Date()
          }))
      ]
    });

    // Set this group as user's current group
    await User.findByIdAndUpdate(creatorId, { currentGroupId: group._id });

    await group.populate([
      { path: 'members.userId', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' }
    ]);

    // Emit realtime event
    const groupData = group.toObject ? group.toObject() : group;
    emitGroupEvent(GROUP_EVENTS.created, {
      group: groupData,
      recipients: group.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: SUCCESS_MESSAGES.GROUP_CREATED,
      data: group
    };
  }

  async updateMemberRole(groupId, requesterId, { memberId, role }) {
    if (!isValidObjectId(memberId) || !GROUP_ROLES.includes(role)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    if (role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Cannot assign Product Owner role'
      };
    }

    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const group = access.data;
    if (!group.isProductOwner(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    const normalizedMemberId = normalizeId(memberId);
    const memberRecord = group.members.find(member => normalizeId(member.userId) === normalizedMemberId);
    if (!memberRecord) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND
      };
    }

    if (memberRecord.role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Cannot change Product Owner role'
      };
    }

    if (memberRecord.role === role) {
      return {
        success: true,
        statusCode: HTTP_STATUS.OK,
        message: 'Role unchanged',
        data: group
      };
    }

    await Group.updateOne(
      { _id: groupId, 'members.userId': memberId },
      { $set: { 'members.$.role': role } }
    );

    const updatedGroup = await Group.findById(groupId)
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    try {
      await notificationService.createGroupRoleChangeNotification({
        groupId,
        senderId: requesterId,
        recipientId: memberId,
        newRole: role
      });
    } catch (notificationError) {
      console.error('Failed to send role change notification', notificationError);
    }

    // Emit realtime event
    const groupData = updatedGroup.toObject ? updatedGroup.toObject() : updatedGroup;
    emitGroupEvent(GROUP_EVENTS.memberRoleUpdated, {
      group: groupData,
      groupId: normalizeId(groupId),
      memberId: normalizeId(memberId),
      newRole: role,
      recipients: updatedGroup.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Role updated successfully',
      data: updatedGroup
    };
  }

  async getGroupsForUser(userId, options = {}) {
    const { page, limit, sortBy = 'updatedAt', order = 'desc', search } = options;
    const pagination = validatePagination(page, limit);

    const allowedSortFields = ['createdAt', 'updatedAt', 'name'];
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

    const query = {
      'members.userId': normalizeId(userId)
    };

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (pagination.sanitizedPage - 1) * pagination.sanitizedLimit;

    const [allGroups, total] = await Promise.all([
      Group.find(query)
        .populate('members.userId', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(pagination.sanitizedLimit)
        .lean(),
      Group.countDocuments(query)
    ]);

    // Separate groups into "My Groups" and "Shared with me"
    const myGroups = allGroups.filter(group => 
      normalizeId(group.createdBy?._id || group.createdBy) === normalizeId(userId)
    );
    
    const sharedGroups = allGroups.filter(group => 
      normalizeId(group.createdBy?._id || group.createdBy) !== normalizeId(userId)
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUPS_FETCHED,
      data: {
        myGroups,
        sharedGroups,
        allGroups,
        pagination: {
          total,
          page: pagination.sanitizedPage,
          limit: pagination.sanitizedLimit,
          totalPages: Math.ceil(total / pagination.sanitizedLimit)
        }
      }
    };
  }

  async getGroupById(groupId, requesterId) {
    if (!isValidObjectId(groupId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const group = await Group.findById(groupId)
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    if (!group.isMember(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_FETCHED,
      data: group
    };
  }

  async updateGroup(groupId, requesterId, updateData = {}) {
    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const group = access.data;
    const previousName = group.name;

    if (!group.isAdmin(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    const payload = {};
    if (updateData.name) {
      payload.name = updateData.name.trim();
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description ? updateData.description.trim() : '';
    }
    if (updateData.metadata && typeof updateData.metadata === 'object') {
      const metadataUpdates = {};
      if (updateData.metadata.color) {
        metadataUpdates['metadata.color'] = updateData.metadata.color;
      }
      if (updateData.metadata.icon) {
        metadataUpdates['metadata.icon'] = updateData.metadata.icon;
      }
      Object.assign(payload, metadataUpdates);
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: payload },
      { new: true, runValidators: true }
    )
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (updateData.name && previousName && updatedGroup && updateData.name.trim() !== previousName) {
      try {
        const actorRecord = group.members.find(member => normalizeId(member.userId) === normalizeId(requesterId));
        const actorName = actorRecord?.userId?.name || actorRecord?.name || null;

        await notificationService.createGroupNameChangeNotification(
          groupId,
          requesterId,
          previousName,
          updatedGroup.name,
          actorName
        );
      } catch (notificationError) {
        console.error('Failed to dispatch group name change notification:', notificationError);
      }
    }

    // Emit realtime event
    const groupData = updatedGroup.toObject ? updatedGroup.toObject() : updatedGroup;
    emitGroupEvent(GROUP_EVENTS.updated, {
      group: groupData,
      groupId: normalizeId(groupId),
      recipients: updatedGroup.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_UPDATED,
      data: updatedGroup
    };
  }

  async deleteGroup(groupId, requesterId) {
    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const group = access.data;
    if (normalizeId(group.createdBy?._id || group.createdBy) !== normalizeId(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    const groupData = group.toObject ? group.toObject() : group;
    const recipients = group.members.map(member => normalizeId(member.userId)).filter(Boolean);
    
    await Group.findByIdAndDelete(groupId);
    await Task.updateMany({ groupId }, { $set: { groupId: null } });

    // Emit realtime event
    emitGroupEvent(GROUP_EVENTS.deleted, {
      group: { ...groupData, _id: groupId },
      groupId: normalizeId(groupId),
      recipients
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_DELETED,
      data: { id: groupId }
    };
  }

  async addMembers(groupId, requesterId, members = []) {
    if (!Array.isArray(members) || members.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const group = access.data;

    if (!group.isProductOwner(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    const sanitizedEntries = members
      .map(entry => ({
        userId: normalizeId(entry?.userId || entry),
        role: entry?.role
      }))
      .filter(entry => entry.userId && entry.role);

    if (sanitizedEntries.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const invalidRole = sanitizedEntries.find(
      entry => !GROUP_ROLES.includes(entry.role) || entry.role === GROUP_ROLE_KEYS.PRODUCT_OWNER
    );

    if (invalidRole) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid role supplied for new member'
      };
    }

    const currentMemberIds = new Set(group.members.map(member => normalizeId(member.userId)));
    const newEntries = sanitizedEntries.filter(entry => !currentMemberIds.has(entry.userId));

    if (newEntries.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.CONFLICT,
        message: ERROR_MESSAGES.GROUP_MEMBER_EXISTS
      };
    }

    if (group.members.length + newEntries.length > LIMITS.MAX_MEMBERS_PER_GROUP) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.GROUP_MEMBER_LIMIT_REACHED
      };
    }

    const users = await User.find({ _id: { $in: newEntries.map(entry => entry.userId) }, isActive: true })
      .select('_id name email avatar')
      .lean();

    const activeIds = new Set(users.map(user => user._id.toString()));
    const validEntries = newEntries.filter(entry => activeIds.has(entry.userId));

    if (validEntries.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $push: {
          members: {
            $each: validEntries.map(entry => ({
              userId: entry.userId,
              role: entry.role,
              joinedAt: new Date()
            }))
          }
        }
      },
      { new: true }
    )
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    // Emit realtime event
    const groupData = updatedGroup.toObject ? updatedGroup.toObject() : updatedGroup;
    emitGroupEvent(GROUP_EVENTS.memberAdded, {
      group: groupData,
      groupId: normalizeId(groupId),
      addedMemberIds: validEntries.map(entry => entry.userId),
      recipients: updatedGroup.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_MEMBER_ADDED,
      data: {
        group: updatedGroup,
        addedMemberIds: validEntries.map(entry => entry.userId)
      }
    };
  }

  async removeMember(groupId, requesterId, memberId) {
    if (!isValidObjectId(memberId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const group = access.data;

    if (!group.isAdmin(requesterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
      };
    }

    const ownerId = normalizeId(group.createdBy?._id || group.createdBy);
    const targetMemberId = normalizeId(memberId);

    if (ownerId === targetMemberId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Cannot remove the group owner'
      };
    }

    const targetMember = group.members.find(
      member => normalizeId(member.userId) === targetMemberId
    );
    if (!targetMember) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND
      };
    }

    if (targetMember.role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      const adminCount = group.members.filter(member => member.role === GROUP_ROLE_KEYS.PRODUCT_OWNER).length;
      if (adminCount <= 1) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Group must maintain at least one product owner'
        };
      }
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: { userId: memberId } } },
      { new: true }
    )
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    await Task.updateMany(
      { groupId, 'assignedTo.userId': memberId },
      { $pull: { assignedTo: { userId: memberId } } }
    );

    // Emit realtime event
    const groupData = updatedGroup.toObject ? updatedGroup.toObject() : updatedGroup;
    emitGroupEvent(GROUP_EVENTS.memberRemoved, {
      group: groupData,
      groupId: normalizeId(groupId),
      removedMemberId: normalizeId(memberId),
      recipients: updatedGroup.members.map(member => normalizeId(member.userId)).filter(Boolean)
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_MEMBER_REMOVED,
      data: {
        group: updatedGroup,
        removedMemberId: memberId
      }
    };
  }

  async leaveGroup(groupId, memberId) {
    const access = await this.getGroupById(groupId, memberId);
    if (!access.success) {
      return access;
    }

    const group = access.data;

    const ownerId = normalizeId(group.createdBy?._id || group.createdBy);
    const memberIdStr = normalizeId(memberId);

    if (ownerId === memberIdStr) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Group owner cannot leave the group. Transfer ownership first.'
      };
    }

    const memberRecord = group.members.find(
      member => normalizeId(member.userId) === memberIdStr
    );
    if (!memberRecord) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND
      };
    }

    if (memberRecord.role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      const adminCount = group.members.filter(member => member.role === GROUP_ROLE_KEYS.PRODUCT_OWNER).length;
      if (adminCount <= 1) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Group must have at least one product owner'
        };
      }
    }

    await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: { userId: memberId } } }
    );

    await Task.updateMany(
      { groupId, 'assignedTo.userId': memberId },
      { $pull: { assignedTo: { userId: memberId } } }
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.GROUP_LEFT,
      data: {
        groupId,
        memberId
      }
    };
  }

  async getGroupTasks(groupId, requesterId, filters = {}, options = {}) {
    const access = await this.getGroupById(groupId, requesterId);
    if (!access.success) {
      return access;
    }

    const { status, priority, search } = filters;
    const { page, limit, sortBy = 'dueDate', order = 'asc' } = options;

    const pagination = validatePagination(page, limit);
    const allowedSortFields = ['dueDate', 'priority', 'createdAt', 'updatedAt', 'title'];
    const sortValidation = validateSort(sortBy, order, allowedSortFields);
    if (!sortValidation.isValid) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: sortValidation.error
      };
    }

    const query = { groupId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const sortOption = {
      [sortValidation.sanitizedSortBy]: sortValidation.sanitizedOrder === 'asc' ? 1 : -1
    };

    const skip = (pagination.sanitizedPage - 1) * pagination.sanitizedLimit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo.userId', 'name email avatar')
        .populate('comments.user', 'name email avatar')
        .populate('groupId', 'name description')
        .sort(sortOption)
        .skip(skip)
        .limit(pagination.sanitizedLimit)
        .lean(),
      Task.countDocuments(query)
    ]);

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.TASKS_FETCHED,
      data: {
        tasks,
        pagination: {
          total,
          page: pagination.sanitizedPage,
          limit: pagination.sanitizedLimit,
          totalPages: Math.ceil(total / pagination.sanitizedLimit)
        }
      }
    };
  }

  async joinGroup(groupId, userId) {
    if (!isValidObjectId(groupId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    // Check if user is already a member
    if (group.isMember(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.CONFLICT,
        message: 'You are already a member of this group'
      };
    }

    // Check if group has space for new members
    if (group.members.length >= LIMITS.MAX_MEMBERS_PER_GROUP) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.GROUP_MEMBER_LIMIT_REACHED
      };
    }

    // Add user to group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $push: {
          members: {
            userId: userId,
            role: GROUP_ROLE_KEYS.BA,
            joinedAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Successfully joined group',
      data: updatedGroup
    };
  }

  async switchToGroup(groupId, userId) {
    if (!isValidObjectId(groupId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    // Check if user is a member of this group
    if (!group.isMember(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'You are not a member of this group'
      };
    }

    // Update user's current group
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { currentGroupId: groupId },
      { new: true }
    ).select('-password -refreshToken -passwordResetToken -passwordResetExpires');

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Successfully switched to group',
      data: {
        user: updatedUser,
        group: group
      }
    };
  }

  async inviteUserToGroup(groupId, email, role, inviterId) {
    if (!isValidObjectId(groupId) || !isValidObjectId(inviterId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    if (!role || !GROUP_ROLES.includes(role) || role === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid role supplied for invitation'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid email format'
      };
    }

    const group = await Group.findById(groupId).populate('createdBy', 'name email');
    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    // Check if inviter is admin of the group
    const inviterMember = group.members.find(member => 
      member.userId.toString() === inviterId.toString()
    );

    if (!inviterMember || inviterMember.role !== GROUP_ROLE_KEYS.PRODUCT_OWNER) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Only the product owner can invite users'
      };
    }

  const inviterProfile = await User.findById(inviterId).select('name email');

  // Check if user with email exists
    const invitedUser = await User.findOne({ email, isActive: true });
    if (!invitedUser) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'User with this email not found'
      };
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(member => 
      member.userId.toString() === invitedUser._id.toString()
    );

    if (isAlreadyMember) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'User is already a member of this group'
      };
    }

    // Check group member limit
    if (group.members.length >= LIMITS.MAX_MEMBERS_PER_GROUP) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.GROUP_MEMBER_LIMIT_REACHED
      };
    }

    // Create notification instead of adding user directly
    try {
      const notificationResult = await notificationService.createGroupInvitationNotification(
        invitedUser._id,
        inviterId,
        groupId,
        group.name,
        inviterProfile?.name || null,
        role
      );
      
      if (!notificationResult.success) {
        return {
          success: false,
          statusCode: notificationResult.statusCode,
          message: notificationResult.message
        };
      }
    } catch (error) {
      console.error('Failed to create invitation notification:', error);
      return {
        success: false,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Failed to send invitation'
      };
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'User invited successfully',
      data: { group, invitedUser: { _id: invitedUser._id, name: invitedUser.name, email: invitedUser.email } }
    };
  }

  // Email functionality removed - using in-app notifications instead
}

module.exports = new GroupService();

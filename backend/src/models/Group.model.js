const mongoose = require('mongoose');
const { GROUP_ROLES, LIMITS } = require('../config/constants');

const normalizeId = value => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: GROUP_ROLES,
      default: null
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [LIMITS.MAX_GROUP_NAME_LENGTH, `Group name must not exceed ${LIMITS.MAX_GROUP_NAME_LENGTH} characters`]
    },
    isPersonalWorkspace: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        LIMITS.MAX_GROUP_DESCRIPTION_LENGTH,
        `Description must not exceed ${LIMITS.MAX_GROUP_DESCRIPTION_LENGTH} characters`
      ],
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: {
      type: [memberSchema],
      default: []
    },
    metadata: {
      color: { type: String, default: '#2563eb' },
      icon: { type: String, default: 'users' }
    },
    defaultFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'groups'
  }
);

// Ensure creator is always present as a member
groupSchema.pre('validate', function(next) {
  if (!this.createdBy) {
    return next();
  }

  const creatorId = this.createdBy.toString();
  const hasCreator = this.members.some(member => {
    const normalized = member?.toObject ? member.toObject() : member;
    return normalized?.userId && normalizeId(normalized.userId) === creatorId;
  });

  if (!hasCreator) {
    this.members.push({ userId: this.createdBy, role: null });
  }

  next();
});

// Enforce unique members and respect max limit
groupSchema.pre('save', function(next) {
  if (!Array.isArray(this.members)) {
    this.members = [];
  }

  const uniqueMap = new Map();
  this.members.forEach(member => {
    const normalized = member?.toObject ? member.toObject() : member;
    if (normalized?.userId) {
      const normalizedId = normalizeId(normalized.userId);
      if (normalizedId) {
        uniqueMap.set(normalizedId, normalized);
      }
    }
  });

  this.members = Array.from(uniqueMap.values());

  if (this.members.length > LIMITS.MAX_MEMBERS_PER_GROUP) {
    return next(new Error(`Group cannot have more than ${LIMITS.MAX_MEMBERS_PER_GROUP} members`));
  }

  next();
});

// Helpers
groupSchema.methods.isMember = function(userId) {
  if (!userId) return false;
  const targetId = normalizeId(userId);
  if (!targetId) return false;
  return this.members.some(member => normalizeId(member.userId) === targetId);
};

groupSchema.methods.getMemberRole = function(userId) {
  if (!userId) return null;
  const targetId = normalizeId(userId);
  if (!targetId) return null;
  const record = this.members.find(member => normalizeId(member.userId) === targetId);
  return record ? record.role : null;
};

groupSchema.methods.hasRole = function(userId, roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return false;
  }
  const role = this.getMemberRole(userId);
  return Boolean(role && roles.includes(role));
};

groupSchema.methods.isProductOwner = function(userId) {
  return false;
};

groupSchema.methods.isAdmin = function(userId) {
  return false;
};

// Indexes
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ name: 1, createdBy: 1 });

groupSchema.virtual('memberCount').get(function() {
  return Array.isArray(this.members) ? this.members.length : 0;
});

groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

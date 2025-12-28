const mongoose = require('mongoose');
const {
  LIMITS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENTS
} = require('../config/constants');

const DEFAULT_CHANNELS = ['in_app'];
const DEFAULT_CATEGORIES = ['system'];
const DEFAULT_STATUSES = ['pending', 'delivered', 'accepted', 'declined', 'failed', 'expired'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required']
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      trim: true
    },
    eventKey: {
      type: String,
      trim: true,
      default: null
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    categories: {
      type: [String],
      enum: NOTIFICATION_CATEGORIES,
      default: () => [...DEFAULT_CATEGORIES],
      validate: {
        validator: value => Array.isArray(value) && value.length > 0,
        message: 'Notification requires at least one category'
      }
    },
    channels: {
      type: [String],
      enum: NOTIFICATION_CHANNELS,
      default: () => [...DEFAULT_CHANNELS],
      validate: {
        validator: value => Array.isArray(value) && value.length > 0,
        message: 'Notification requires at least one channel'
      }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: DEFAULT_STATUSES,
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      default: null
    },
    // Count of consolidated messages (for grouping notifications from same source)
    messageCount: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, categories: 1, archived: 1, createdAt: -1 });
notificationSchema.index({ status: 1, expiresAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Index for consolidation lookups: find existing unread notifications for same type/source
notificationSchema.index({ recipient: 1, type: 1, 'data.groupId': 1, 'data.conversationId': 1, 'data.taskId': 1, isRead: 1 });

notificationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  if (!this.readAt) {
    this.readAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.accept = function () {
  if (this.type === 'group_invitation' && this.status === 'pending') {
    this.status = 'accepted';
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  throw new Error('Cannot accept this notification');
};

notificationSchema.methods.decline = function () {
  if (this.type === 'group_invitation' && this.status === 'pending') {
    this.status = 'declined';
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  throw new Error('Cannot decline this notification');
};

notificationSchema.statics.buildFromEvent = function (eventPayload = {}) {
  const ttlDays = eventPayload.ttlDays ?? LIMITS.NOTIFICATION_DEFAULT_TTL_DAYS;
  const baseDocument = {
    recipient: eventPayload.recipient,
    sender: eventPayload.sender ?? null,
    type: eventPayload.type || eventPayload.eventKey || 'system_event',
    eventKey: eventPayload.eventKey || eventPayload.type || null,
    title: eventPayload.title,
    message: eventPayload.message,
    data: eventPayload.data || {},
    metadata: eventPayload.metadata || {},
    categories: (eventPayload.categories && eventPayload.categories.length > 0)
      ? eventPayload.categories
      : [...DEFAULT_CATEGORIES],
    channels: (eventPayload.channels && eventPayload.channels.length > 0)
      ? eventPayload.channels
      : [...DEFAULT_CHANNELS],
    status: eventPayload.status || 'pending',
    archived: Boolean(eventPayload.archived),
    isRead: Boolean(eventPayload.isRead),
    deliveredAt: eventPayload.deliveredAt || new Date(),
    readAt: eventPayload.readAt || null
  };

  if (eventPayload.expiresAt) {
    baseDocument.expiresAt = eventPayload.expiresAt;
  } else if (ttlDays) {
    baseDocument.expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  if (baseDocument.isRead && !baseDocument.readAt) {
    baseDocument.readAt = new Date();
  }

  return new this(baseDocument);
};

notificationSchema.statics.archiveMany = async function (ids = [], userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { acknowledged: true, modifiedCount: 0 };
  }

  const now = new Date();
  return this.updateMany(
    {
      _id: { $in: ids },
      recipient: userId
    },
    {
      $set: {
        archived: true,
        isRead: true,
        readAt: now
      }
    }
  );
};

notificationSchema.statics.createGroupInvitation = function (recipientId, senderId, groupId, groupName) {
  const doc = this.buildFromEvent({
    recipient: recipientId,
    sender: senderId,
    type: 'group_invitation',
    eventKey: NOTIFICATION_EVENTS.GROUP_INVITATION_SENT,
    title: 'Group Invitation',
    message: `You've been invited to join the group "${groupName}"`,
    data: {
      groupId,
      groupName,
      action: 'group_invitation'
    },
    metadata: {
      actorId: senderId,
      groupId
    },
    categories: ['group'],
    channels: [...DEFAULT_CHANNELS],
    status: 'pending'
  });

  return doc.save();
};

notificationSchema.pre('save', function (next) {
  if (!this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  if (this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  if (!this.channels || this.channels.length === 0) {
    this.channels = [...DEFAULT_CHANNELS];
  }

  if (!this.categories || this.categories.length === 0) {
    this.categories = [...DEFAULT_CATEGORIES];
  }

  if (!this.expiresAt) {
    const ttlDays = LIMITS.NOTIFICATION_DEFAULT_TTL_DAYS || LIMITS.NOTIFICATION_RETENTION_DAYS || 30;
    this.expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }

  next();
});

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');
const {
  CONVERSATION_TYPES,
  MESSAGE_STATUSES
} = require('../config/constants');

const { Schema } = mongoose;

const participantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: null
    },
    lastDeliveredAt: {
      type: Date,
      default: null
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    }
  },
  { _id: false }
);

const lastMessageSchema = new Schema(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    contentPreview: {
      type: String,
      default: null,
      trim: true
    },
    attachmentCount: {
      type: Number,
      default: 0
    },
    sentAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: MESSAGE_STATUSES,
      default: 'sent'
    }
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: CONVERSATION_TYPES,
      required: true
    },
    title: {
      type: String,
      default: null,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: {
      type: [participantSchema],
      validate: {
        validator: value => Array.isArray(value) && value.length >= 2,
        message: 'Conversation requires at least two participants'
      }
    },
    lastMessage: {
      type: lastMessageSchema,
      default: () => ({})
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => ({})
    },
    directKey: {
      type: String,
      default: null,
      index: true
    },
    latestActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ 'participants.userId': 1, latestActivityAt: -1 });
conversationSchema.index(
  { directKey: 1 },
  {
    unique: true,
    partialFilterExpression: { directKey: { $exists: true, $ne: null } }
  }
);
conversationSchema.index({ groupId: 1, latestActivityAt: -1 });

conversationSchema.pre('save', function computeDirectKey(next) {
  if (this.type !== 'direct') {
    this.directKey = null;
    return next();
  }

  const participantIds = (this.participants || [])
    .map(participant => participant.userId)
    .filter(Boolean)
    .map(id => (typeof id === 'string' ? id : id.toString()))
    .sort();

  this.directKey = participantIds.join(':');
  next();
});

conversationSchema.methods.isParticipant = function isParticipant(userId) {
  if (!userId) {
    return false;
  }

  const target = typeof userId === 'string' ? userId : userId.toString();
  return this.participants.some(participant => {
    const participantId = participant.userId?.toString();
    return participantId === target;
  });
};

module.exports = mongoose.model('Conversation', conversationSchema);

const mongoose = require('mongoose');
const { MESSAGE_STATUSES } = require('../config/constants');

const { Schema } = mongoose;

const attachmentSchema = new Schema(
  {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      default: null
    },
    mimetype: {
      type: String,
      default: null
    },
    size: {
      type: Number,
      default: 0
    },
    resourceType: {
      type: String,
      default: 'raw'
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => ({})
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const readReceiptSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    attachments: {
      type: [attachmentSchema],
      default: () => []
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => ({})
    },
    status: {
      type: String,
      enum: MESSAGE_STATUSES,
      default: 'sent'
    },
    deletedAt: {
      type: Date,
      default: null
    },
    readBy: {
      type: [readReceiptSchema],
      default: () => []
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

messageSchema.methods.isDeleted = function isDeleted() {
  return this.status === 'deleted' || Boolean(this.deletedAt);
};

module.exports = mongoose.model('Message', messageSchema);

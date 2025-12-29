const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'file'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      default: ''
    },
    thumbnailUrl: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    resourceType: {
      type: String,
      enum: ['image', 'raw'],
      default: 'raw'
    }
  },
  { _id: false }
);

const directMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectConversation',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: [5000, 'Message content cannot exceed 5000 characters'],
      default: ''
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    reactions: {
      type: [reactionSchema],
      default: []
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectMessage',
      default: null
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    // Message type: 'text' for regular messages, 'call' for call messages
    messageType: {
      type: String,
      enum: ['text', 'call'],
      default: 'text'
    },
    // Call data for messageType === 'call'
    callData: {
      meetingId: { type: String },
      callType: { type: String, enum: ['group', 'direct'] },
      status: { type: String, enum: ['active', 'ended'], default: 'active' },
      startedAt: { type: Date },
      endedAt: { type: Date },
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    // Pin message data
    isPinned: {
      type: Boolean,
      default: false,
      index: true
    },
    pinnedAt: {
      type: Date,
      default: null
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'direct_messages'
  }
);

directMessageSchema.index({ conversationId: 1, createdAt: -1 });
directMessageSchema.index({ conversationId: 1, senderId: 1 });
directMessageSchema.index({ 'reactions.userId': 1 });
directMessageSchema.index({ replyTo: 1 });

directMessageSchema.virtual('reactionCounts').get(function () {
  const counts = {};
  if (!Array.isArray(this.reactions)) {
    return [];
  }

  this.reactions.forEach(reaction => {
    if (!counts[reaction.emoji]) {
      counts[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      };
    }
    counts[reaction.emoji].count += 1;
    counts[reaction.emoji].users.push(reaction.userId);
  });

  return Object.values(counts);
});

directMessageSchema.methods.addReaction = function (emoji, userId) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.emoji === emoji && reaction.userId.toString() === userId.toString())
  );

  this.reactions.push({ emoji, userId, createdAt: new Date() });
  return this.save();
};

directMessageSchema.methods.removeReaction = function (emoji, userId) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.emoji === emoji && reaction.userId.toString() === userId.toString())
  );
  return this.save();
};

directMessageSchema.methods.toggleReaction = function (emoji, userId) {
  const existingIndex = this.reactions.findIndex(
    reaction => reaction.emoji === emoji && reaction.userId.toString() === userId.toString()
  );

  if (existingIndex >= 0) {
    this.reactions.splice(existingIndex, 1);
    return this.save().then(() => ({ added: false, reaction: null }));
  }

  const newReaction = { emoji, userId, createdAt: new Date() };
  this.reactions.push(newReaction);
  return this.save().then(() => ({ added: true, reaction: newReaction }));
};

directMessageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.content = '[Message deleted]';
  this.attachments = [];
  return this.save();
};

directMessageSchema.set('toJSON', { virtuals: true });
directMessageSchema.set('toObject', { virtuals: true });

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

module.exports = DirectMessage;



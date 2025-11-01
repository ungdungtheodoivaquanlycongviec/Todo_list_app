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
    }
  },
  { _id: false }
);

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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
      maxlength: [5000, 'Message content cannot exceed 5000 characters']
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
      ref: 'GroupMessage',
      default: null
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'group_messages'
  }
);

// Indexes for performance
groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ groupId: 1, senderId: 1 });
groupMessageSchema.index({ 'reactions.userId': 1 });
groupMessageSchema.index({ replyTo: 1 });

// Virtual for reaction counts grouped by emoji
groupMessageSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    if (!counts[reaction.emoji]) {
      counts[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      };
    }
    counts[reaction.emoji].count++;
    counts[reaction.emoji].users.push(reaction.userId);
  });
  return Object.values(counts);
});

// Methods
groupMessageSchema.methods.addReaction = function(emoji, userId) {
  // Remove existing reaction from this user for this emoji
  this.reactions = this.reactions.filter(
    r => !(r.emoji === emoji && r.userId.toString() === userId.toString())
  );
  
  // Add new reaction
  this.reactions.push({ emoji, userId, createdAt: new Date() });
  return this.save();
};

groupMessageSchema.methods.removeReaction = function(emoji, userId) {
  this.reactions = this.reactions.filter(
    r => !(r.emoji === emoji && r.userId.toString() === userId.toString())
  );
  return this.save();
};

groupMessageSchema.methods.toggleReaction = function(emoji, userId) {
  const existingIndex = this.reactions.findIndex(
    r => r.emoji === emoji && r.userId.toString() === userId.toString()
  );
  
  if (existingIndex >= 0) {
    this.reactions.splice(existingIndex, 1);
    return this.save().then(() => ({ added: false, reaction: null }));
  } else {
    const newReaction = { emoji, userId, createdAt: new Date() };
    this.reactions.push(newReaction);
    return this.save().then(() => ({ added: true, reaction: newReaction }));
  }
};

groupMessageSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.content = '[Message deleted]';
  this.attachments = [];
  return this.save();
};

// Ensure virtuals are included in JSON
groupMessageSchema.set('toJSON', { virtuals: true });
groupMessageSchema.set('toObject', { virtuals: true });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage;


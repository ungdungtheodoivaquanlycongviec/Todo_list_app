const mongoose = require('mongoose');

const directConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        }
      ],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'Direct conversation must have exactly 2 participants'
      }
    },
    participantHash: {
      type: String,
      required: true,
      unique: true
    },
    lastMessagePreview: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: null
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    },
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true,
    collection: 'direct_conversations'
  }
);

directConversationSchema.pre('validate', function(next) {
  if (!Array.isArray(this.participants) || this.participants.length !== 2) {
    return next(new Error('Direct conversation must have exactly 2 participants'));
  }

  const participantIds = this.participants.map(participant => {
    if (!participant) return null;
    if (typeof participant === 'string') return participant;
    if (participant.toHexString) return participant.toHexString();
    if (participant._id) return participant._id.toString();
    if (participant.toString) return participant.toString();
    return null;
  });

  if (participantIds.some(id => !id)) {
    return next(new Error('Invalid participant identifier'));
  }

  participantIds.sort();
  this.participantHash = participantIds.join(':');
  next();
});

directConversationSchema.methods.getOtherParticipantId = function(userId) {
  if (!userId) return null;
  const normalized = userId.toString();
  const ids = this.participants.map(participant => participant.toString());
  return ids.find(id => id !== normalized) || null;
};

directConversationSchema.index({ participantHash: 1 }, { unique: true });
directConversationSchema.index({ participants: 1 });
directConversationSchema.index({ updatedAt: -1 });

const DirectConversation = mongoose.model('DirectConversation', directConversationSchema);

module.exports = DirectConversation;



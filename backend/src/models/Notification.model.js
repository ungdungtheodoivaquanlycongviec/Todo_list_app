const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  type: {
    type: String,
    enum: ['group_invitation', 'task_assignment', 'group_update'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ status: 1, expiresAt: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to accept invitation
notificationSchema.methods.accept = function() {
  if (this.type === 'group_invitation' && this.status === 'pending') {
    this.status = 'accepted';
    this.isRead = true;
    return this.save();
  }
  throw new Error('Cannot accept this notification');
};

// Method to decline invitation
notificationSchema.methods.decline = function() {
  if (this.type === 'group_invitation' && this.status === 'pending') {
    this.status = 'declined';
    this.isRead = true;
    return this.save();
  }
  throw new Error('Cannot decline this notification');
};

// Static method to create group invitation notification
notificationSchema.statics.createGroupInvitation = function(recipientId, senderId, groupId, groupName) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'group_invitation',
    title: 'Group Invitation',
    message: `You've been invited to join the group "${groupName}"`,
    data: {
      groupId: groupId,
      groupName: groupName,
      action: 'group_invitation'
    }
  });
};

// Pre-save middleware to check expiration
notificationSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin is required'],
    index: true
  },
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required'],
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'user_create',
      'user_update',
      'user_delete',
      'user_lock',
      'user_unlock',
      'user_role_change',
      'notification_send',
      'system_config_change',
      'admin_create',
      'admin_remove'
    ],
    index: true
  },
  targetType: {
    type: String,
    enum: ['user', 'notification', 'system', 'admin'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adminActionLogSchema.index({ admin: 1, createdAt: -1 });
adminActionLogSchema.index({ action: 1, createdAt: -1 });
adminActionLogSchema.index({ targetType: 1, targetId: 1 });
adminActionLogSchema.index({ createdAt: -1 });

const AdminActionLog = mongoose.model('AdminActionLog', adminActionLogSchema);

module.exports = AdminActionLog;


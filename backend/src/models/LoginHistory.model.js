const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked'],
    required: true,
    index: true
  },
  failureReason: {
    type: String,
    default: null
  },
  loginAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
loginHistorySchema.index({ user: 1, loginAt: -1 });
loginHistorySchema.index({ email: 1, loginAt: -1 });
loginHistorySchema.index({ status: 1, loginAt: -1 });
loginHistorySchema.index({ loginAt: -1 });

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

module.exports = LoginHistory;


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } = require('../config/environment');
const { NOTIFICATION_CHANNELS, NOTIFICATION_CATEGORIES } = require('../config/constants');

const channelPreferenceSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const buildDefaultCategoryPreferences = () => {
  return NOTIFICATION_CATEGORIES.reduce((acc, category) => {
    acc[category] = true;
    return acc;
  }, {});
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Invalid email format'
    }
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false  // Don't return password by default
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  refreshToken: {
    type: String,
    default: null,
    select: false
  },
  
  passwordResetToken: {
    type: String,
    default: null,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false
  },
  
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    beforeDue: { type: Number, default: 24 },
    quietHours: {
      start: { type: String, default: null },
      end: { type: String, default: null },
      timezone: { type: String, default: 'UTC' }
    },
    channels: {
      type: [channelPreferenceSchema],
      default: () => NOTIFICATION_CHANNELS.map(channel => ({
        key: channel,
        enabled: channel === 'in_app'
      }))
    },
    categories: {
      type: Map,
      of: Boolean,
      default: buildDefaultCategoryPreferences
    }
  },
  
  // Current active group for the user
  currentGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with salt rounds = 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate Access Token (short-lived)
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate Refresh Token (long-lived)
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// Method to get user object without sensitive data
userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

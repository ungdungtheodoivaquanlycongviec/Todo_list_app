const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Group = require('../models/Group.model');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/environment');
const admin = require('../config/firebaseAdmin');

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - { email, password, name }
   * @returns {Object} - { user, accessToken, refreshToken }
   */
  async register(userData) {
    const { email, password, name } = userData;
    
    // 1. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // 2. Validate password strength
    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }
    
    // 3. Create user (password will be hashed by pre-save middleware)
    const user = await User.create({
      email,
      password,
      name
    });
    
    // 4. Create Personal Workspace group
    const personalWorkspace = await Group.create({
      name: 'Personal Workspace',
      description: 'Your personal workspace for tasks and projects',
      createdBy: user._id,
      members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }]
    });
    
    // 5. Set Personal Workspace as user's current group and save
    user.currentGroupId = personalWorkspace._id;
    await user.save();
    
    // 6. Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // 7. Save refresh token to DB
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    
    // 8. Return user + tokens (without sensitive data)
    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    };
  }
  
  /**
   * Login user
   * @param {String} email
   * @param {String} password
   * @returns {Object} - { user, accessToken, refreshToken }
   */
  async login(email, password) {
    // 1. Find user by email (include password field)
    const user = await User.findOne({ email }).select('+password +refreshToken');
    
    // 2. Check if user exists
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // 3. Check if user is active
    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }
    
    // 4. Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // 5. Update lastLogin
    user.lastLogin = new Date();
    
    // 6. Generate new tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // 7. Save refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    // 8. Return user + tokens
    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    };
  }
  
  /**
   * Logout user (clear refresh token)
   * @param {String} userId
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null
    });
    
    return { message: 'Logged out successfully' };
  }
  
  /**
   * Login or register via Google ID token
   * @param {String} idToken - Google ID token from client
   * @returns {Object} - { user, accessToken, refreshToken }
   */
  async loginWithGoogle(idToken) {
    if (!idToken) {
      throw new Error('Google ID token is required');
    }

    // Verify token with Firebase Admin
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      throw new Error('Invalid Google ID token');
    }

    const email = decoded?.email;
    const name = decoded?.name || decoded?.given_name || 'Google User';
    const picture = decoded?.picture || null;

    if (!email) {
      throw new Error('Google account has no email');
    }

    // Find or create user
    let user = await User.findOne({ email }).select('+refreshToken');
    if (!user) {
      // Create a stub password because schema requires it; it will never be used
      const randomPassword = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}A!`;
      user = await User.create({
        email,
        password: randomPassword,
        name,
        avatar: picture,
        isEmailVerified: true
      });
      
      // Create Personal Workspace for new Google user
      const personalWorkspace = await Group.create({
        name: 'Personal Workspace',
        description: 'Your personal workspace for tasks and projects',
        createdBy: user._id,
        members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }]
      });
      
      // Set Personal Workspace as user's current group
      user.currentGroupId = personalWorkspace._id;
      await user.save();
    }

    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // Update profile picture if changed
    if (picture && user.avatar !== picture) {
      user.avatar = picture;
    }

    // Issue tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken
   * @returns {Object} - { accessToken, refreshToken }
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    
    // 1. Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
    
    // 2. Find user
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user) {
      throw new Error('User not found');
    }
    
    // 3. Check if user is active
    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }
    
    // 4. Check if refresh token matches DB
    if (user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }
    
    // 5. Generate new access token
    const newAccessToken = user.generateAccessToken();
    
    // 6. Optionally generate new refresh token (rotate)
    const newRefreshToken = user.generateRefreshToken();
    user.refreshToken = newRefreshToken;
    await user.save();
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
  
  /**
   * Verify JWT token
   * @param {String} token
   * @returns {Object} - Decoded payload
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
  
  /**
   * Validate password strength
   * @param {String} password
   * @returns {Object} - { isValid, errors }
   */
  validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AuthService();

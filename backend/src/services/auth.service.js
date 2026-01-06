const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Group = require('../models/Group.model');
const LoginHistory = require('../models/LoginHistory.model');
const { GROUP_ROLE_KEYS } = require('../config/constants');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/environment');
const admin = require('../config/firebaseAdmin');

class AuthService {
  async ensurePersonalWorkspace(user) {
    if (!user?._id) return null;

    // Prefer the new flag
    let workspace = await Group.findOne({
      createdBy: user._id,
      isPersonalWorkspace: true
    });

    // Backfill legacy personal workspace (created before isPersonalWorkspace existed)
    if (!workspace) {
      workspace = await Group.findOne({
        createdBy: user._id,
        name: 'Personal Workspace'
      });

      if (workspace) {
        workspace.isPersonalWorkspace = true;
        if (!Array.isArray(workspace.members) || workspace.members.length === 0) {
          workspace.members = [{ userId: user._id, role: null, joinedAt: new Date() }];
        }
        await workspace.save();
      }
    }

    // If still missing, create it
    if (!workspace) {
      workspace = await Group.create({
        name: 'Personal Workspace',
        description: 'Your personal workspace for tasks and projects',
        createdBy: user._id,
        isPersonalWorkspace: true,
        members: [{ userId: user._id, role: null, joinedAt: new Date() }]
      });
    }

    // Ensure user's currentGroupId points somewhere valid
    if (!user.currentGroupId) {
      user.currentGroupId = workspace._id;
      await user.save();
    }

    return workspace;
  }
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

    // 4. Create Personal Workspace group (single-user group)
    const personalWorkspace = await Group.create({
      name: 'Personal Workspace',
      description: 'Your personal workspace for tasks and projects',
      createdBy: user._id,
      isPersonalWorkspace: true,
      members: [{ userId: user._id, role: null, joinedAt: new Date() }]
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
   * @param {Object} req - Express request object (for IP and user agent)
   * @returns {Object} - { user, accessToken, refreshToken }
   */
  async login(email, password, req = null) {
    const getClientInfo = (req) => {
      if (!req) return { ipAddress: null, userAgent: null };
      return {
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || null
      };
    };

    const clientInfo = getClientInfo(req);

    // 1. Find user by email (include password field)
    const user = await User.findOne({ email }).select('+password +refreshToken');

    // 2. Check if user exists
    if (!user) {
      // Log failed login attempt
      await LoginHistory.create({
        email,
        status: 'failed',
        failureReason: 'User not found',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        loginAt: new Date()
      }).catch(err => console.error('Error logging failed login:', err));
      throw new Error('Invalid credentials');
    }

    // 3. Check if user is active
    if (!user.isActive) {
      // Log blocked login attempt
      await LoginHistory.create({
        user: user._id,
        email: user.email,
        status: 'blocked',
        failureReason: 'Account deactivated',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        loginAt: new Date()
      }).catch(err => console.error('Error logging blocked login:', err));
      throw new Error('Account has been deactivated');
    }

    // 4. Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await LoginHistory.create({
        user: user._id,
        email: user.email,
        status: 'failed',
        failureReason: 'Invalid password',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        loginAt: new Date()
      }).catch(err => console.error('Error logging failed login:', err));
      throw new Error('Invalid credentials');
    }

    // 5. Update lastLogin
    user.lastLogin = new Date();

    // Ensure personal workspace exists for legacy users
    await this.ensurePersonalWorkspace(user);

    // 6. Generate new tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // 7. Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // 8. Reload user from database to ensure we have the latest data (including avatar)
    const updatedUser = await User.findById(user._id);
    if (!updatedUser) {
      throw new Error('User not found after save');
    }

    // 9. Log successful login
    await LoginHistory.create({
      user: updatedUser._id,
      email: updatedUser.email,
      status: 'success',
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      loginAt: new Date()
    }).catch(err => console.error('Error logging successful login:', err));

    // 10. Return user + tokens
    return {
      user: updatedUser.toSafeObject(),
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
   * @param {Object} req - Express request object (for IP and user agent)
   * @returns {Object} - { user, accessToken, refreshToken }
   */
  async loginWithGoogle(idToken, req = null) {
    const getClientInfo = (req) => {
      if (!req) return { ipAddress: null, userAgent: null };
      return {
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || null
      };
    };

    const clientInfo = getClientInfo(req);
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

      // Create Personal Workspace for new Google user (single-user group)
      const personalWorkspace = await Group.create({
        name: 'Personal Workspace',
        description: 'Your personal workspace for tasks and projects',
        createdBy: user._id,
        isPersonalWorkspace: true,
        members: [{ userId: user._id, role: null, joinedAt: new Date() }]
      });

      // Set Personal Workspace as user's current group
      user.currentGroupId = personalWorkspace._id;
      await user.save();
    }

    // Ensure personal workspace exists for legacy users
    await this.ensurePersonalWorkspace(user);

    if (!user.isActive) {
      // Log blocked login attempt
      await LoginHistory.create({
        user: user._id,
        email: user.email,
        status: 'blocked',
        failureReason: 'Account deactivated',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        loginAt: new Date()
      }).catch(err => console.error('Error logging blocked login:', err));
      throw new Error('Account has been deactivated');
    }

    // Update profile picture from Google ONLY if user doesn't have a custom avatar yet
    // Điều này giúp avatar bạn đổi trong hệ thống không bị Google ghi đè lại mỗi lần đăng nhập
    if (picture && !user.avatar) {
      user.avatar = picture;
    }

    // Issue tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Reload user from database to ensure we have the latest data (including avatar)
    const updatedUser = await User.findById(user._id);
    if (!updatedUser) {
      throw new Error('User not found after save');
    }

    // Log successful login
    await LoginHistory.create({
      user: updatedUser._id,
      email: updatedUser.email,
      status: 'success',
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      loginAt: new Date()
    }).catch(err => console.error('Error logging successful login:', err));

    return {
      user: updatedUser.toSafeObject(),
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

  /**
   * Request password reset - sends 6-digit code to email
   * @param {String} email
   * @returns {Object} - { message }
   */
  async requestPasswordReset(email) {
    const emailService = require('./email.service');
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return { message: 'If an account exists with that email, a reset code has been sent.' };
    }

    // Check if user is active
    if (!user.isActive) {
      return { message: 'If an account exists with that email, a reset code has been sent.' };
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Hash the code before storing
    const hashedCode = await bcrypt.hash(code, 10);

    // Save to user with 10-minute expiry
    user.passwordResetToken = hashedCode;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send email with the code
    try {
      await emailService.sendPasswordResetCode(email, code, user.name);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Don't throw - we don't want to reveal if email exists
    }

    return { message: 'If an account exists with that email, a reset code has been sent.' };
  }

  /**
   * Verify reset code
   * @param {String} email
   * @param {String} code - 6-digit code
   * @returns {Object} - { valid: boolean }
   */
  async verifyResetCode(email, code) {
    const bcrypt = require('bcryptjs');

    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new Error('Invalid or expired reset code');
    }

    if (!user.passwordResetToken || !user.passwordResetExpires) {
      throw new Error('Invalid or expired reset code');
    }

    // Check if code has expired
    if (user.passwordResetExpires < new Date()) {
      throw new Error('Reset code has expired. Please request a new one.');
    }

    // Compare code with hashed token
    const isValid = await bcrypt.compare(code, user.passwordResetToken);

    if (!isValid) {
      throw new Error('Invalid or expired reset code');
    }

    return { valid: true };
  }

  /**
   * Reset password with verified code
   * @param {String} email
   * @param {String} code - 6-digit code
   * @param {String} newPassword
   * @returns {Object} - { message }
   */
  async resetPassword(email, code, newPassword) {
    const bcrypt = require('bcryptjs');

    // First verify the code is still valid
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      throw new Error('Invalid or expired reset code');
    }

    if (!user.passwordResetToken || !user.passwordResetExpires) {
      throw new Error('Invalid or expired reset code');
    }

    // Check if code has expired
    if (user.passwordResetExpires < new Date()) {
      throw new Error('Reset code has expired. Please request a new one.');
    }

    // Compare code with hashed token
    const isValid = await bcrypt.compare(code, user.passwordResetToken);

    if (!isValid) {
      throw new Error('Invalid or expired reset code');
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}

module.exports = new AuthService();

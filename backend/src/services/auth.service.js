const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/environment');

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
    
    // 4. Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // 5. Save refresh token to DB
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    
    // 6. Return user + tokens (without sensitive data)
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

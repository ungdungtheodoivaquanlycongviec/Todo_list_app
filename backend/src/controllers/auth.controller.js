const asyncHandler = require('../middlewares/asyncHandler');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const result = await authService.register({ email, password, name });
    
    sendSuccess(
      res, 
      result, 
      'Đăng ký tài khoản thành công', 
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    // Handle duplicate email error
    if (error.message === 'Email already exists') {
      return sendError(res, 'Email đã được sử dụng', 400);
    }
    throw error;
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await authService.login(email, password, req);
    
    sendSuccess(res, result, 'Đăng nhập thành công');
  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid credentials') {
      return sendError(res, 'Email hoặc mật khẩu không đúng', 401);
    }
    if (error.message === 'Account has been deactivated') {
      return sendError(res, 'Tài khoản đã bị vô hiệu hóa', 401);
    }
    throw error;
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear refresh token)
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user._id);
  
  sendSuccess(res, null, result.message);
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendError(res, 'Refresh token là bắt buộc', 400);
  }
  
  try {
    const result = await authService.refreshToken(refreshToken);
    
    sendSuccess(res, result, 'Token đã được làm mới');
  } catch (error) {
    if (error.message.includes('refresh token')) {
      return sendError(res, error.message, 401);
    }
    throw error;
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  
  sendSuccess(res, { user }, 'Lấy thông tin người dùng thành công');
});

/**
 * @route   POST /api/auth/google
 * @desc    Login/Register via Google ID token
 * @access  Public
 */
const loginWithGoogle = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return sendError(res, 'Thiếu Google ID token', 400);
  }

  try {
    const result = await authService.loginWithGoogle(idToken, req);
    sendSuccess(res, result, 'Đăng nhập Google thành công');
  } catch (error) {
    return sendError(res, error.message || 'Xác thực Google thất bại', 401);
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  loginWithGoogle
};

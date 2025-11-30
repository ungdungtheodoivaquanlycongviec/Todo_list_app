const authService = require('../../services/auth.service');
const User = require('../../models/User.model');

const SOCKET_ERROR_CODES = {
  unauthorized: 'socket_error:unauthorized',
  expired: 'socket_error:token_expired'
};

const buildSocketError = (code, message, meta = {}) => {
  const error = new Error(message);
  error.data = {
    code,
    message,
    ...meta
  };
  return error;
};

const extractTokenFromHandshake = (handshake = {}) => {
  const authPayload = handshake.auth;
  if (authPayload && typeof authPayload.token === 'string' && authPayload.token.trim()) {
    return authPayload.token.trim();
  }

  if (handshake.query && typeof handshake.query.token === 'string' && handshake.query.token.trim()) {
    return handshake.query.token.trim();
  }

  const authorization = handshake.headers?.authorization;
  if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = extractTokenFromHandshake(socket.handshake);
    if (!token) {
      return next(buildSocketError(SOCKET_ERROR_CODES.unauthorized, 'Authentication token is required'));
    }

    const decoded = await authService.verifyToken(token);
    if (!decoded || !decoded.id) {
      return next(buildSocketError(SOCKET_ERROR_CODES.unauthorized, 'Invalid authentication payload'));
    }

    socket.data.userId = decoded.id;
    socket.data.userEmail = decoded.email || null;
    socket.data.tokenIssuedAt = decoded.iat || null;

    // Get user name for notifications
    try {
      const user = await User.findById(decoded.id).select('name').lean();
      socket.data.userName = user?.name || decoded.email || 'User';
    } catch (error) {
      console.error('[Socket] Error fetching user name:', error);
      socket.data.userName = decoded.email || 'User';
    }

    return next();
  } catch (error) {
    const isExpired = error?.name === 'TokenExpiredError' || /expired/i.test(error?.message || '');
    const message = isExpired ? 'Authentication token expired' : 'Unable to authenticate socket connection';
    const code = isExpired ? SOCKET_ERROR_CODES.expired : SOCKET_ERROR_CODES.unauthorized;
    return next(buildSocketError(code, message));
  }
};

module.exports = {
  authenticateSocket,
  extractTokenFromHandshake,
  SOCKET_ERROR_CODES,
  buildSocketError
};

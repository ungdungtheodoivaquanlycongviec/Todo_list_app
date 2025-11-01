const express = require('express');
const router = express.Router();

// Import route modules
const taskRoutes = require('./task.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const noteRoutes = require('./note.routes');
const groupRoutes = require('./group.routes');
const notificationRoutes = require('./notification.routes');
const chatRoutes = require('./chat.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/notes', noteRoutes);
router.use('/groups', groupRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);

module.exports = router;

const express = require('express');
const router = express.Router();

// Import route modules
const taskRoutes = require('./task.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const noteRoutes = require('./note.routes');
const groupRoutes = require('./group.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/notes', noteRoutes);
router.use('/groups', groupRoutes);

// Future routes
// router.use('/notifications', notificationRoutes);

module.exports = router;

const express = require('express');
const router = express.Router();

// Import route modules
const taskRoutes = require('./task.routes');

// Mount routes
router.use('/tasks', taskRoutes);

// Future routes
// router.use('/groups', groupRoutes);
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;

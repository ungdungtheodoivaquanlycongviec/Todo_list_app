const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../src/models/Notification.model');
const User = require('../src/models/User.model');
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENTS,
  LIMITS
} = require('../src/config/constants');

const getMongoUri = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/todolist';

const TTL_DAYS = LIMITS.NOTIFICATION_DEFAULT_TTL_DAYS || LIMITS.NOTIFICATION_RETENTION_DAYS || 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const DEFAULT_CHANNELS = NOTIFICATION_CHANNELS.map(channel => ({
  key: channel,
  enabled: channel === 'in_app'
}));

const DEFAULT_CATEGORY_MAP = NOTIFICATION_CATEGORIES.reduce((acc, category) => {
  acc[category] = true;
  return acc;
}, {});

const CATEGORY_LOOKUP = {
  group_invitation: 'group',
  group_name_change: 'group',
  group_invite: 'group',
  task_due_soon: 'task',
  task_assigned: 'task',
  task_completed: 'task',
  task_created_in_group: 'task',
  new_task: 'task',
  comment_added: 'task',
  time_logged: 'task',
  work_scheduled: 'task'
};

const EVENT_LOOKUP = {
  group_invitation: NOTIFICATION_EVENTS.GROUP_INVITATION_SENT,
  group_name_change: NOTIFICATION_EVENTS.GROUP_NAME_CHANGED,
  new_task: NOTIFICATION_EVENTS.TASK_CREATED_IN_GROUP
};

const normalizeArray = (value, allowedValues) => {
  if (!value) {
    return [];
  }

  const asArray = Array.isArray(value) ? value : [value];
  const normalized = asArray
    .map(item => (item ? String(item).toLowerCase().trim() : ''))
    .filter(Boolean);

  if (!allowedValues) {
    return normalized;
  }

  const allowedSet = new Set(allowedValues);
  return normalized.filter(item => allowedSet.has(item));
};

async function migrateNotifications() {
  console.log('➡️  Starting notification migration...');

  const cursor = Notification.find({}).cursor();
  let inspected = 0;
  let updated = 0;

  for await (const notification of cursor) {
    inspected += 1;
    let dirty = false;

    const sanitizedChannels = normalizeArray(notification.channels, NOTIFICATION_CHANNELS);
    if (sanitizedChannels.length === 0) {
      notification.channels = ['in_app'];
      dirty = true;
    } else if (sanitizedChannels.length !== notification.channels?.length) {
      notification.channels = sanitizedChannels;
      dirty = true;
    }

    const rawCategories = normalizeArray(notification.categories, NOTIFICATION_CATEGORIES);
    if (rawCategories.length === 0) {
      const fallbackCategory = CATEGORY_LOOKUP[notification.type] || 'system';
      notification.categories = [fallbackCategory];
      dirty = true;
    } else if (rawCategories.length !== notification.categories?.length) {
      notification.categories = rawCategories;
      dirty = true;
    }

    if (!notification.metadata) {
      notification.metadata = {};
      dirty = true;
    }

    if (typeof notification.archived === 'undefined') {
      notification.archived = false;
      dirty = true;
    }

    if (!notification.deliveredAt) {
      notification.deliveredAt = notification.createdAt || new Date();
      dirty = true;
    }

    if (notification.isRead && !notification.readAt) {
      notification.readAt = notification.updatedAt || new Date();
      dirty = true;
    }

    if (!notification.expiresAt) {
      const baseDate = notification.createdAt || new Date();
      notification.expiresAt = new Date(baseDate.getTime() + TTL_MS);
      dirty = true;
    }

    if (!notification.status) {
      notification.status = 'pending';
      dirty = true;
    }

    if (!notification.eventKey && EVENT_LOOKUP[notification.type]) {
      notification.eventKey = EVENT_LOOKUP[notification.type];
      dirty = true;
    }

    if (dirty) {
      try {
        await notification.save();
        updated += 1;
      } catch (error) {
        console.error('❌ Failed to update notification', notification._id, error.message);
      }
    }
  }

  console.log(`ℹ️  Processed ${inspected} notifications, updated ${updated}.`);
}

const hasChannelsConfigured = settings => Array.isArray(settings?.channels) && settings.channels.length > 0;
const hasCategoriesConfigured = settings => {
  if (!settings?.categories) {
    return false;
  }
  if (settings.categories instanceof Map) {
    return settings.categories.size > 0;
  }
  return Object.keys(settings.categories || {}).length > 0;
};

async function migrateUserPreferences() {
  console.log('➡️  Normalizing user notification preferences...');

  const cursor = User.find({}).cursor();
  let inspected = 0;
  let updated = 0;

  for await (const user of cursor) {
    inspected += 1;
    const settings = user.notificationSettings || {};
    const updatePayload = {};

    if (!hasChannelsConfigured(settings)) {
      updatePayload['notificationSettings.channels'] = DEFAULT_CHANNELS;
    }

    if (!hasCategoriesConfigured(settings)) {
      updatePayload['notificationSettings.categories'] = DEFAULT_CATEGORY_MAP;
    }

    const quietHours = settings.quietHours || {};
    if (!quietHours.timezone) {
      quietHours.timezone = 'UTC';
    }
    if (typeof quietHours.start === 'undefined') {
      quietHours.start = null;
    }
    if (typeof quietHours.end === 'undefined') {
      quietHours.end = null;
    }
    updatePayload['notificationSettings.quietHours'] = quietHours;

    if (!settings.beforeDue || typeof settings.beforeDue !== 'number') {
      updatePayload['notificationSettings.beforeDue'] = 24;
    }

    if (typeof settings.email !== 'boolean') {
      updatePayload['notificationSettings.email'] = true;
    }

    if (typeof settings.push !== 'boolean') {
      updatePayload['notificationSettings.push'] = true;
    }

    if (Object.keys(updatePayload).length === 0) {
      continue;
    }

    try {
      await User.updateOne({ _id: user._id }, { $set: updatePayload });
      updated += 1;
    } catch (error) {
      console.error('❌ Failed to update user preferences for', user.email || user._id, error.message);
    }
  }

  console.log(`ℹ️  Processed ${inspected} users, updated ${updated} preference documents.`);
}

async function run() {
  const uri = getMongoUri();
  console.log(`🔌 Connecting to MongoDB at ${uri}`);

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    await migrateNotifications();
    await migrateUserPreferences();

    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

run();

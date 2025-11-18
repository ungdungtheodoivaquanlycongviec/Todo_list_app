const mongoose = require('mongoose');
const { LIMITS } = require('../config/constants');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [
        LIMITS.MAX_GROUP_NAME_LENGTH,
        `Folder name must not exceed ${LIMITS.MAX_GROUP_NAME_LENGTH} characters`
      ]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        LIMITS.MAX_GROUP_DESCRIPTION_LENGTH,
        `Description must not exceed ${LIMITS.MAX_GROUP_DESCRIPTION_LENGTH} characters`
      ],
      default: ''
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    },
    metadata: {
      color: { type: String, default: '#1d4ed8' },
      icon: { type: String, default: 'folder' }
    }
  },
  {
    timestamps: true,
    collection: 'folders'
  }
);

folderSchema.index({ groupId: 1, name: 1 }, { unique: true });
folderSchema.index(
  { groupId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;


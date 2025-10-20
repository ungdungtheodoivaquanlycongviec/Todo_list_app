const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    default: '',
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  lastEdited: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
noteSchema.index({ userId: 1, lastEdited: -1 });
noteSchema.index({ userId: 1, title: 'text', content: 'text' });

// Virtual for formatted lastEdited
noteSchema.virtual('formattedLastEdited').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.lastEdited);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return 'Today';
  } else if (diffDays === 2) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return this.lastEdited.toLocaleDateString();
  }
});

// Update lastEdited before saving
noteSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isModified('content')) {
    this.lastEdited = new Date();
  }
  next();
});

module.exports = mongoose.model('Note', noteSchema);

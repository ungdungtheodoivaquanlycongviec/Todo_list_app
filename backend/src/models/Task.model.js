const mongoose = require('mongoose');
const { TASK_STATUS, PRIORITY_LEVELS } = require('../config/constants');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề công việc là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự']
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUS,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: ' + TASK_STATUS.join(', ')
      },
      default: 'todo'
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: 'Độ ưu tiên không hợp lệ. Chỉ chấp nhận: ' + PRIORITY_LEVELS.join(', ')
      },
      default: 'medium'
    },
    dueDate: {
      type: Date,
      default: null
      // FIXED: Removed validation to allow any date (past, present, or future)
      // This allows tasks to have flexible due dates without restrictions
    },
    completedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người tạo công việc là bắt buộc']
    },
    assignedTo: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        assignedAt: { type: Date, default: Date.now }
      }
    ],
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, 'Mỗi tag không được vượt quá 30 ký tự']
      }
    ],
    category: {
      type: String,
      default: null,
      trim: true
    },
    // NEW: Task type (Operational, Strategic, Financial, etc.)
    type: {
      type: String,
      enum: ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'],
      default: 'Operational'
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required for task management']
    },
    attachments: {
      type: [
        {
          filename: { type: String, required: true },
          url: { type: String, required: true },
          size: { type: Number, required: true },
          mimetype: { type: String, required: true },
          publicId: { type: String, required: true },
          resourceType: { type: String, default: 'raw' },
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      validate: {
        validator: function(attachments) {
          return attachments.length <= 20;
        },
        message: 'Số lượng attachments không được vượt quá 20'
      },
      default: []
    },
    estimatedTime: {
      type: String,
      default: null,
      trim: true
    },
    // NEW: Time tracking fields
    timeEntries: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, required: true, default: Date.now },
        hours: { type: Number, required: true }, // Total hours spent
        minutes: { type: Number, required: true }, // Additional minutes
        description: { type: String, trim: true, maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'] },
        billable: { type: Boolean, default: true },
        startTime: { type: Date }, // For timer functionality
        endTime: { type: Date },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // NEW: Scheduled work
    scheduledWork: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        scheduledDate: { type: Date, required: true },
        estimatedHours: { type: Number, default: 0 },
        estimatedMinutes: { type: Number, default: 0 },
        description: { type: String, trim: true },
        status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled'], default: 'scheduled' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // NEW: Task repetition settings
    repetition: {
      isRepeating: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'weekly' },
      interval: { type: Number, default: 1 }, // Every X days/weeks/months
      endDate: { type: Date }, // When to stop repeating
      occurrences: { type: Number } // Number of times to repeat
    },
    // NEW: Start time for tasks
    startTime: {
      type: Date,
      default: null
    },
    // NEW: Custom status support
    customStatus: {
      name: { type: String, trim: true },
      color: { type: String, default: '#3B82F6' }
    },
    comments: {
      type: [
        {
          user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: [true, 'User comment là bắt buộc'] 
          },
          content: { 
            type: String, 
            default: '',
            maxlength: [2000, 'Comment không được vượt quá 2000 ký tự'],
            trim: true
          },
          attachment: {
            filename: { type: String },
            url: { type: String },
            size: { type: Number },
            mimetype: { type: String },
            publicId: { type: String },
            resourceType: { type: String, default: 'image' }
          },
          createdAt: { 
            type: Date, 
            default: Date.now 
          },
          updatedAt: { 
            type: Date 
          },
          isEdited: {
            type: Boolean,
            default: false
          }
        }
      ],
      validate: {
        validator: function(comments) {
          return comments.length <= 200;
        },
        message: 'Số lượng comments không được vượt quá 200'
      },
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'tasks'
  }
);

// Virtual for total logged time
taskSchema.virtual('totalLoggedTime').get(function() {
  return this.timeEntries.reduce((total, entry) => {
    return total + (entry.hours || 0) + (entry.minutes || 0) / 60;
  }, 0);
});

// Validate số lượng tags (max 10)
taskSchema.path('tags').validate(function(value) {
  return value.length <= 10;
}, 'Số lượng tags không được vượt quá 10');

// Validate số lượng comments (max 200)
taskSchema.path('comments').validate(function(value) {
  return value.length <= 200;
}, 'Số lượng comments không được vượt quá 200');

// Validate số lượng attachments (max 20)
taskSchema.path('attachments').validate(function(value) {
  return value.length <= 20;
}, 'Số lượng file đính kèm không được vượt quá 20');

// Validate số lượng assignedTo (max 50)
taskSchema.path('assignedTo').validate(function(value) {
  return value.length <= 50;
}, 'Số lượng người được gán không được vượt quá 50');

// Validate số lượng timeEntries (max 1000)
taskSchema.path('timeEntries').validate(function(value) {
  return value.length <= 1000;
}, 'Số lượng time entries không được vượt quá 1000');

// Validate số lượng scheduledWork (max 500)
taskSchema.path('scheduledWork').validate(function(value) {
  return value.length <= 500;
}, 'Số lượng scheduled work không được vượt quá 500');

// Middleware: Auto-set completedAt khi status = 'completed'
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

// Method: Populate user info
taskSchema.methods.populateUserInfo = function() {
  return this.populate([
    { path: 'createdBy', select: 'name email avatar' },
    { path: 'assignedTo.userId', select: 'name email avatar' },
    { path: 'comments.user', select: 'name email avatar' },
    { path: 'attachments.uploadedBy', select: 'name email avatar' },
    { path: 'groupId', select: 'name description members metadata' }
  ]);
};

// Method: Format total logged time
taskSchema.methods.getFormattedTotalTime = function() {
  const totalHours = this.totalLoggedTime;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
};

// Indexes cho performance
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ groupId: 1, status: 1 });
taskSchema.index({ 'assignedTo.userId': 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ type: 1 });
taskSchema.index({ 'timeEntries.date': 1 });
taskSchema.index({ 'scheduledWork.scheduledDate': 1 });

// Text search index
taskSchema.index({ title: 'text', description: 'text' });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
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
      default: null,
      validate: {
        validator: function(value) {
          // Cho phép null hoặc ngày trong tương lai
          if (!value) return true;
          return value >= new Date();
        },
        message: 'Ngày hết hạn phải là ngày trong tương lai'
      }
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
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'groups',
      default: null
    },
    attachments: {
      type: [
        {
          filename: { type: String, required: true },
          url: { type: String, required: true },
          size: { type: Number, required: true },
          mimetype: { type: String, required: true },
          publicId: { type: String, required: true }, // Cloudinary public_id for deletion
          resourceType: { type: String, default: 'raw' }, // 'image' or 'raw'
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
            default: '', // Không bắt buộc nếu có attachment
            maxlength: [2000, 'Comment không được vượt quá 2000 ký tự'],
            trim: true
          },
          // Comment attachment (image/file)
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
    timestamps: true, // Tự động tạo createdAt và updatedAt
    collection: 'tasks'
  }
);

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

// Validate số lượng assignees (max 50)
taskSchema.path('assignedTo').validate(function(value) {
  return value.length <= 50;
}, 'Số lượng người được gán không được vượt quá 50');

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

// Method: Populate user info cho createdBy
taskSchema.methods.populateUserInfo = function() {
  return this.populate('createdBy', 'name email avatar')
    .populate('assignedTo.userId', 'name email avatar')
    .populate('comments.userId', 'name email avatar')
    .populate('attachments.uploadedBy', 'name email avatar')
    .execPopulate();
};

// Indexes cho performance
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ groupId: 1, status: 1 });
taskSchema.index({ 'assignedTo.userId': 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

// Text search index
taskSchema.index({ title: 'text', description: 'text' });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;

const mongoose = require('mongoose');

const chatbotStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    // Danh sách các task được chatbot đề xuất ở lần gần nhất
    recommendedTaskIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      }
    ]
  },
  {
    timestamps: true,
    collection: 'chatbot_states'
  }
);

chatbotStateSchema.index({ userId: 1, groupId: 1 }, { unique: true });

const ChatbotState = mongoose.model('ChatbotState', chatbotStateSchema);

module.exports = ChatbotState;



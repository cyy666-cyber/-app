const mongoose = require('mongoose');

const teamMessageSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, '消息内容是必需的']
  },
  // 消息类型
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'ai'],
    default: 'text'
  },
  // AI 消息相关
  isAI: {
    type: Boolean,
    default: false
  },
  aiContext: {
    type: String,
    default: ''
  },
  // 文件相关（如果是文件类型）
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  // 回复的消息
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMessage',
    default: null
  },
  // 已读状态
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 索引：按队伍和时间查询（用于聊天室）
teamMessageSchema.index({ team: 1, createdAt: -1 });
teamMessageSchema.index({ sender: 1, createdAt: -1 });
teamMessageSchema.index({ team: 1, type: 1 });

module.exports = mongoose.model('TeamMessage', teamMessageSchema);


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

// 索引配置
// 复合索引（优化聊天室查询）
teamMessageSchema.index({ team: 1, createdAt: -1 }); // 队伍消息列表（按时间倒序）
teamMessageSchema.index({ team: 1, type: 1, createdAt: -1 }); // 队伍消息（按类型和时间）
teamMessageSchema.index({ team: 1, isAI: 1, createdAt: -1 }); // AI 消息查询
teamMessageSchema.index({ sender: 1, createdAt: -1 }); // 用户发送的消息

// 单字段索引
teamMessageSchema.index({ team: 1 }); // 按队伍查询
teamMessageSchema.index({ sender: 1 }); // 按发送者查询
teamMessageSchema.index({ type: 1 }); // 按消息类型查询
teamMessageSchema.index({ replyTo: 1 }); // 回复的消息
teamMessageSchema.index({ createdAt: -1 }); // 按时间排序

module.exports = mongoose.model('TeamMessage', teamMessageSchema);


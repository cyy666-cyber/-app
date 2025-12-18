const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: [true, '消息内容是必需的']
  },
  // 会话ID（用于分组聊天记录）
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  // 上下文信息
  context: {
    type: {
      type: String,
      enum: ['general', 'schedule', 'skill', 'forum', 'team'],
      default: 'general'
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  // AI 响应相关
  model: {
    type: String,
    default: 'deepseek-chat'
  },
  tokens: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  // 是否已整理到知识库
  addedToKnowledgeBase: {
    type: Boolean,
    default: false
  },
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
    default: null
  }
}, {
  timestamps: true
});

// 索引：按用户和会话查询
messageSchema.index({ user: 1, sessionId: 1, createdAt: 1 });
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);


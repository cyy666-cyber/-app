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
    required: true
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

// 索引配置
// 复合索引（优化聊天记录查询）
messageSchema.index({ user: 1, sessionId: 1, createdAt: 1 }); // 用户会话消息（按时间正序）
messageSchema.index({ user: 1, createdAt: -1 }); // 用户所有消息（按时间倒序）
messageSchema.index({ sessionId: 1, createdAt: 1 }); // 会话消息（按时间正序）
messageSchema.index({ user: 1, 'context.type': 1, createdAt: -1 }); // 用户+上下文类型

// 单字段索引
messageSchema.index({ user: 1 }); // 按用户查询
messageSchema.index({ sessionId: 1 }); // 按会话查询
messageSchema.index({ role: 1 }); // 按角色查询（user/assistant）
messageSchema.index({ 'context.type': 1 }); // 按上下文类型查询
messageSchema.index({ addedToKnowledgeBase: 1 }); // 查询已整理到知识库的消息
messageSchema.index({ createdAt: -1 }); // 按时间排序

module.exports = mongoose.model('Message', messageSchema);


const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '论坛名称是必需的'],
    trim: true,
    maxlength: [100, '论坛名称不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'social', 'project', 'hobby', 'other'],
    default: 'academic'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // 成员
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    }
  }],
  // 统计信息
  stats: {
    postCount: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now }
  },
  // 设置
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    aiEnabled: {
      type: Boolean,
      default: true // 是否启用 AI 助手
    }
  }
}, {
  timestamps: true
});

// 索引
forumSchema.index({ category: 1, createdAt: -1 });
forumSchema.index({ 'members.user': 1 });
forumSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Forum', forumSchema);


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

// 索引配置
// 复合索引
forumSchema.index({ category: 1, createdAt: -1 }); // 按分类和时间排序
forumSchema.index({ category: 1, 'stats.memberCount': -1 }); // 按分类和成员数排序
forumSchema.index({ creator: 1, createdAt: -1 }); // 用户创建的论坛
forumSchema.index({ 'settings.isPublic': 1, createdAt: -1 }); // 公开论坛

// 单字段索引
forumSchema.index({ creator: 1 }); // 按创建者查询
forumSchema.index({ 'stats.memberCount': -1 }); // 热门论坛（按成员数）
forumSchema.index({ 'stats.postCount': -1 }); // 热门论坛（按帖子数）
forumSchema.index({ 'stats.lastActivityAt': -1 }); // 活跃论坛
forumSchema.index({ createdAt: -1 }); // 按创建时间排序

// 嵌套字段索引
forumSchema.index({ 'members.user': 1 }); // 查询用户加入的论坛
forumSchema.index({ 'members.user': 1, 'members.role': 1 }); // 查询用户角色

// 全文搜索索引
forumSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Forum', forumSchema);


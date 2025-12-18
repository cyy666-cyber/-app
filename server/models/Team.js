const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '队伍名称是必需的'],
    trim: true,
    maxlength: [100, '队伍名称不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
      enum: ['member', 'co-leader'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active'
    }
  }],
  // 目标
  goals: [{
    title: String,
    description: String,
    deadline: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 标签和分类
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['study', 'project', 'competition', 'social', 'other'],
    default: 'study'
  },
  // AI 相关
  aiSuggested: {
    type: Boolean,
    default: false
  },
  aiReason: {
    type: String,
    default: ''
  },
  // 设置
  settings: {
    maxMembers: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    },
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
  },
  // 统计信息
  stats: {
    messageCount: { type: Number, default: 0 },
    completedGoals: { type: Number, default: 0 },
    totalGoals: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// 索引配置
// 复合索引
teamSchema.index({ leader: 1, createdAt: -1 }); // 队长创建的队伍
teamSchema.index({ category: 1, createdAt: -1 }); // 按分类和时间排序
teamSchema.index({ category: 1, 'settings.isPublic': 1 }); // 按分类和公开状态
teamSchema.index({ 'settings.isPublic': 1, createdAt: -1 }); // 公开队伍

// 单字段索引
teamSchema.index({ leader: 1 }); // 按队长查询
teamSchema.index({ category: 1 }); // 按分类查询
teamSchema.index({ 'settings.isPublic': 1 }); // 查询公开/私有队伍
teamSchema.index({ 'stats.lastActivityAt': -1 }); // 活跃队伍排序
teamSchema.index({ 'stats.completedGoals': -1 }); // 按完成目标数排序
teamSchema.index({ createdAt: -1 }); // 按创建时间排序

// 嵌套字段索引
teamSchema.index({ 'members.user': 1 }); // 查询用户加入的队伍
teamSchema.index({ 'members.user': 1, 'members.status': 1 }); // 查询用户状态
teamSchema.index({ 'members.user': 1, 'members.role': 1 }); // 查询用户角色

// 全文搜索索引
teamSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Team', teamSchema);


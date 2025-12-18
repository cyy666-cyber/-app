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

// 索引
teamSchema.index({ leader: 1, createdAt: -1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ category: 1, createdAt: -1 });
teamSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Team', teamSchema);


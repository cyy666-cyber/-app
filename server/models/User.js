const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [6, '密码至少需要6个字符'],
    select: false // 默认查询时不返回密码字段
  },
  avatar: {
    type: String,
    default: '' // 头像URL
  },
  school: {
    type: String,
    trim: true,
    default: '' // 学校名称
  },
  // 学习相关
  skillTree: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillTree',
    default: null
  },
  learningPlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  }],
  knowledgeBase: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  // 社交相关
  joinedForums: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forum'
  }],
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  teamHistory: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    role: {
      type: String,
      enum: ['member', 'leader'],
      default: 'member'
    }
  }],
  // 统计信息
  stats: {
    learningHours: { type: Number, default: 0 },
    completedPlans: { type: Number, default: 0 },
    forumPosts: { type: Number, default: 0 },
    teamCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 索引配置
// 注意：email 和 username 字段已有 unique: true，会自动创建唯一索引
// 这里只添加其他必要的索引

// 单字段索引
userSchema.index({ school: 1 }); // 按学校查询
userSchema.index({ createdAt: -1 }); // 按创建时间排序
userSchema.index({ 'stats.learningHours': -1 }); // 排行榜：学习时长
userSchema.index({ 'stats.completedPlans': -1 }); // 排行榜：完成计划数
userSchema.index({ 'stats.forumPosts': -1 }); // 排行榜：论坛发帖数

// 复合索引
userSchema.index({ school: 1, 'stats.learningHours': -1 }); // 按学校的学习排行榜

// 保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码的方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 转换为 JSON 时移除密码字段
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);


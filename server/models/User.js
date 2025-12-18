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


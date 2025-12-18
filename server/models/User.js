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
    required: function() {
      return !this.phone && !this.wechatOpenId; // 邮箱、手机号、微信至少需要一个
    },
    unique: true,
    sparse: true, // 允许 null，但如果有值则必须唯一
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址']
  },
  phone: {
    type: String,
    required: function() {
      return !this.email && !this.wechatOpenId; // 邮箱、手机号、微信至少需要一个
    },
    unique: true,
    sparse: true, // 允许 null，但如果有值则必须唯一
    trim: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号']
  },
  password: {
    type: String,
    required: function() {
      // 如果有邮箱但没有微信 OpenID，则需要密码
      return !!(this.email && !this.wechatOpenId);
    },
    minlength: [6, '密码至少需要6个字符'],
    select: false // 默认查询时不返回密码字段
  },
  // 微信相关
  wechatOpenId: {
    type: String,
    unique: true,
    sparse: true, // 允许 null，但如果有值则必须唯一
    default: undefined // 使用 undefined 而不是 null，避免 sparse 索引问题
  },
  wechatUnionId: {
    type: String,
    default: null
  },
  wechatNickname: {
    type: String,
    default: ''
  },
  wechatAvatar: {
    type: String,
    default: ''
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
  // 学校认证相关
  schoolVerified: {
    type: Boolean,
    default: false // 是否已认证学校
  },
  schoolVerification: {
    studentId: {
      type: String,
      default: null // 学号
    },
    verificationMethod: {
      type: String,
      enum: ['email', 'student_card', 'manual'],
      default: null
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    verificationProof: {
      type: String, // 认证材料 URL
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // 审核人员
      default: null
    }
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
  },
  // 密码重置相关
  passwordResetToken: {
    token: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  // 邮箱验证相关
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    token: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 索引配置
// 注意：email 和 username 字段已有 unique: true，会自动创建唯一索引
// 这里只添加其他必要的索引

// 单字段索引
userSchema.index({ school: 1 }); // 按学校查询
// phone 和 wechatOpenId 已有 unique: true 和 sparse: true，会自动创建唯一索引
userSchema.index({ createdAt: -1 }); // 按创建时间排序
userSchema.index({ 'stats.learningHours': -1 }); // 排行榜：学习时长
userSchema.index({ 'stats.completedPlans': -1 }); // 排行榜：完成计划数
userSchema.index({ 'stats.forumPosts': -1 }); // 排行榜：论坛发帖数
userSchema.index({ schoolVerified: 1 }); // 按学校认证状态查询
userSchema.index({ 'schoolVerification.verificationStatus': 1 }); // 按认证审核状态查询

// 复合索引
userSchema.index({ school: 1, 'stats.learningHours': -1 }); // 按学校的学习排行榜
userSchema.index({ school: 1, schoolVerified: 1 }); // 按学校和认证状态查询

// 保存前加密密码
userSchema.pre('save', async function() {
  // 如果密码未修改或没有密码（微信登录），跳过加密
  if (!this.isModified('password') || !this.password) {
    return;
  }
  
  // 加密密码
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 保存前验证：至少需要一种登录方式
userSchema.pre('save', async function() {
  if (!this.email && !this.phone && !this.wechatOpenId) {
    throw new Error('至少需要提供邮箱、手机号或微信 OpenID 中的一种');
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


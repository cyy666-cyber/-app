const mongoose = require('mongoose');

const skillNodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  level: {
    type: Number,
    default: 0, // 0-100 表示掌握程度
    min: 0,
    max: 100
  },
  category: {
    type: String,
    required: true // 如: 'programming', 'language', 'design', etc.
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillNode'
  }],
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillNode'
  }],
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['video', 'article', 'course', 'book', 'other']
    }
  }],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const skillTreeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  rootNodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillNode'
  }],
  // AI 推荐路径
  aiRecommendedPath: [{
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillNode'
    },
    order: Number,
    reason: String
  }],
  totalSkills: {
    type: Number,
    default: 0
  },
  completedSkills: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 创建 SkillNode 模型
const SkillNode = mongoose.model('SkillNode', skillNodeSchema);

module.exports = {
  SkillTree: mongoose.model('SkillTree', skillTreeSchema),
  SkillNode: SkillNode
};


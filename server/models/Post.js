const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  forum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forum',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, '标题是必需的'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符']
  },
  content: {
    type: String,
    required: [true, '内容是必需的']
  },
  tags: [{
    type: String,
    trim: true
  }],
  // 互动数据
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  favorites: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // AI 相关
  aiAnswers: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    helpful: {
      type: Number,
      default: 0
    }
  }],
  // 统计信息
  replyCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  // 状态
  status: {
    type: String,
    enum: ['published', 'draft', 'deleted'],
    default: 'published'
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 索引
postSchema.index({ forum: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' });
postSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);


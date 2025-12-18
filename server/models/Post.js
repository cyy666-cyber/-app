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

// 索引配置
// 复合索引（优化常用查询）
postSchema.index({ forum: 1, createdAt: -1 }); // 论坛帖子列表
postSchema.index({ forum: 1, status: 1, createdAt: -1 }); // 论坛帖子（过滤已删除）
postSchema.index({ forum: 1, isPinned: -1, createdAt: -1 }); // 置顶帖子优先
postSchema.index({ author: 1, createdAt: -1 }); // 用户发布的帖子
postSchema.index({ author: 1, status: 1 }); // 用户帖子状态

// 单字段索引
postSchema.index({ status: 1 }); // 按状态过滤
postSchema.index({ isPinned: -1 }); // 置顶帖子
postSchema.index({ createdAt: -1 }); // 按时间排序
postSchema.index({ viewCount: -1 }); // 热门帖子（按浏览量）
postSchema.index({ replyCount: -1 }); // 热门帖子（按回复数）

// 全文搜索索引
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

// 嵌套字段索引
postSchema.index({ 'likes.user': 1 }); // 查询用户点赞的帖子

module.exports = mongoose.model('Post', postSchema);


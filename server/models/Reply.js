const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, '回复内容是必需的']
  },
  // 回复的回复（嵌套回复）
  parentReply: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply',
    default: null
  },
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
  // AI 相关
  aiSuggested: {
    type: Boolean,
    default: false
  },
  // 状态
  status: {
    type: String,
    enum: ['published', 'deleted'],
    default: 'published'
  }
}, {
  timestamps: true
});

// 索引配置
// 复合索引
replySchema.index({ post: 1, createdAt: 1 }); // 帖子回复列表（按时间正序）
replySchema.index({ post: 1, status: 1, createdAt: 1 }); // 帖子回复（过滤已删除）
replySchema.index({ author: 1, createdAt: -1 }); // 用户回复列表
replySchema.index({ author: 1, status: 1 }); // 用户回复状态

// 单字段索引
replySchema.index({ post: 1 }); // 按帖子查询
replySchema.index({ author: 1 }); // 按作者查询
replySchema.index({ parentReply: 1 }); // 嵌套回复
replySchema.index({ status: 1 }); // 按状态过滤
replySchema.index({ createdAt: -1 }); // 按时间排序

module.exports = mongoose.model('Reply', replySchema);


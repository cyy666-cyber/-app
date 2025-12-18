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

// 索引
replySchema.index({ post: 1, createdAt: 1 });
replySchema.index({ author: 1, createdAt: -1 });
replySchema.index({ parentReply: 1 });

module.exports = mongoose.model('Reply', replySchema);


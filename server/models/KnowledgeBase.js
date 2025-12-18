const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  user: {
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
  category: {
    type: String,
    enum: ['ai-chat', 'schedule', 'skill', 'forum', 'team', 'other'],
    default: 'ai-chat'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // 来源信息
  source: {
    type: {
      type: String,
      enum: ['chat', 'schedule', 'skill', 'forum', 'team', 'manual'],
      default: 'chat'
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    sourceText: {
      type: String,
      default: ''
    }
  },
  // AI 整理的信息
  aiSummary: {
    type: String,
    default: ''
  },
  aiKeywords: [{
    type: String,
    trim: true
  }],
  // 重要性评分
  importance: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  // 访问统计
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 索引配置
// 复合索引
knowledgeBaseSchema.index({ user: 1, category: 1 }); // 按用户和分类查询
knowledgeBaseSchema.index({ user: 1, createdAt: -1 }); // 用户知识库（按时间）
knowledgeBaseSchema.index({ user: 1, importance: -1 }); // 用户知识库（按重要性）
knowledgeBaseSchema.index({ user: 1, category: 1, importance: -1 }); // 用户+分类+重要性

// 单字段索引
knowledgeBaseSchema.index({ user: 1 }); // 按用户查询
knowledgeBaseSchema.index({ category: 1 }); // 按分类查询
knowledgeBaseSchema.index({ importance: -1 }); // 按重要性排序
knowledgeBaseSchema.index({ viewCount: -1 }); // 热门知识（按浏览量）
knowledgeBaseSchema.index({ createdAt: -1 }); // 按创建时间排序
knowledgeBaseSchema.index({ lastViewedAt: -1 }); // 最近查看

// 全文搜索索引
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);


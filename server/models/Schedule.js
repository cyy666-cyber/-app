const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, '计划标题是必需的'],
    trim: true,
    maxlength: [100, '标题不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  date: {
    type: Date,
    required: [true, '日期是必需的']
  },
  startTime: {
    type: String, // 格式: "HH:mm"
    required: true
  },
  endTime: {
    type: String, // 格式: "HH:mm"
    required: true
  },
  type: {
    type: String,
    enum: ['study', 'exercise', 'project', 'meeting', 'other'],
    default: 'study'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // AI 建议相关
  aiSuggested: {
    type: Boolean,
    default: false
  },
  aiReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 索引：按用户和日期查询
scheduleSchema.index({ user: 1, date: 1 });
scheduleSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);


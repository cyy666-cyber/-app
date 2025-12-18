/**
 * 知识库控制器
 * 处理知识库的 CRUD 操作和 AI 整理功能
 */

const KnowledgeBase = require('../models/KnowledgeBase');
const Message = require('../models/Message');
const { getKnowledgeBaseLean } = require('../utils/queryHelpers');

/**
 * 创建知识库条目
 * @route POST /api/knowledge-base
 * @access Private
 */
const createKnowledgeBase = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, content, category, tags, source, sourceId, aiSummary, aiKeywords, importance } = req.body;

    // 输入验证
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '请提供标题和内容'
      });
    }

    // 创建知识库条目
    const knowledgeBase = new KnowledgeBase({
      user: userId,
      title,
      content,
      category: category || 'ai-chat',
      tags: tags || [],
      source: {
        type: source?.type || 'manual',
        sourceId: sourceId || null,
        sourceText: source?.sourceText || ''
      },
      aiSummary: aiSummary || '',
      aiKeywords: aiKeywords || [],
      importance: importance || 5
    });

    await knowledgeBase.save();

    // 如果来源是消息，更新消息的关联
    if (source?.type === 'chat' && sourceId) {
      await Message.findByIdAndUpdate(sourceId, {
        addedToKnowledgeBase: true,
        knowledgeBaseId: knowledgeBase._id
      });
    }

    res.status(201).json({
      success: true,
      message: '知识库条目创建成功',
      data: {
        knowledgeBase
      }
    });

  } catch (error) {
    console.error('创建知识库条目错误:', error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误，创建失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取知识库列表
 * @route GET /api/knowledge-base
 * @access Private
 */
const getKnowledgeBaseList = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, category, tags, search, importance, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = { user: userId };
    
    // 筛选条件
    if (category) filter.category = category;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagArray };
    }
    if (importance) filter.importance = parseInt(importance);
    
    // 搜索条件
    const searchOptions = {};
    if (search) {
      searchOptions.search = search;
    }

    // 排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const result = await getKnowledgeBaseLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      ...searchOptions
    });

    res.json({
      success: true,
      message: '获取知识库列表成功',
      data: result
    });

  } catch (error) {
    console.error('获取知识库列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个知识库条目
 * @route GET /api/knowledge-base/:id
 * @access Private
 */
const getKnowledgeBase = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const knowledgeBase = await KnowledgeBase.findOne({
      _id: id,
      user: userId
    });

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        message: '知识库条目不存在'
      });
    }

    // 增加浏览量
    knowledgeBase.viewCount += 1;
    knowledgeBase.lastViewedAt = new Date();
    await knowledgeBase.save();

    res.json({
      success: true,
      message: '获取知识库条目成功',
      data: {
        knowledgeBase
      }
    });

  } catch (error) {
    console.error('获取知识库条目错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新知识库条目
 * @route PUT /api/knowledge-base/:id
 * @access Private
 */
const updateKnowledgeBase = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const knowledgeBase = await KnowledgeBase.findOne({
      _id: id,
      user: userId
    });

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        message: '知识库条目不存在'
      });
    }

    // 更新允许的字段
    const allowedFields = ['title', 'content', 'category', 'tags', 'aiSummary', 'aiKeywords', 'importance'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        knowledgeBase[field] = updateData[field];
      }
    });

    await knowledgeBase.save();

    res.json({
      success: true,
      message: '知识库条目更新成功',
      data: {
        knowledgeBase
      }
    });

  } catch (error) {
    console.error('更新知识库条目错误:', error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误，更新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除知识库条目
 * @route DELETE /api/knowledge-base/:id
 * @access Private
 */
const deleteKnowledgeBase = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const knowledgeBase = await KnowledgeBase.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        message: '知识库条目不存在'
      });
    }

    // 如果来源是消息，更新消息的关联
    if (knowledgeBase.source.type === 'chat' && knowledgeBase.source.sourceId) {
      await Message.findByIdAndUpdate(knowledgeBase.source.sourceId, {
        addedToKnowledgeBase: false,
        knowledgeBaseId: null
      });
    }

    res.json({
      success: true,
      message: '知识库条目删除成功'
    });

  } catch (error) {
    console.error('删除知识库条目错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 从 AI 聊天记录整理到知识库
 * @route POST /api/knowledge-base/from-chat
 * @access Private
 */
const createFromChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId, title, aiSummary, aiKeywords, importance } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: '请提供消息 ID'
      });
    }

    // 查找消息
    const message = await Message.findOne({
      _id: messageId,
      user: userId,
      role: 'assistant' // 只整理 AI 回复
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在或无权访问'
      });
    }

    // 检查是否已整理
    if (message.addedToKnowledgeBase) {
      return res.status(400).json({
        success: false,
        message: '该消息已整理到知识库'
      });
    }

    // 创建知识库条目
    const knowledgeBase = new KnowledgeBase({
      user: userId,
      title: title || `AI 对话 - ${new Date(message.createdAt).toLocaleDateString()}`,
      content: message.content,
      category: 'ai-chat',
      tags: [],
      source: {
        type: 'chat',
        sourceId: message._id,
        sourceText: message.content.substring(0, 100) // 保存前100字符作为摘要
      },
      aiSummary: aiSummary || '',
      aiKeywords: aiKeywords || [],
      importance: importance || 5
    });

    await knowledgeBase.save();

    // 更新消息关联
    await Message.findByIdAndUpdate(messageId, {
      addedToKnowledgeBase: true,
      knowledgeBaseId: knowledgeBase._id
    });

    res.status(201).json({
      success: true,
      message: '知识库条目创建成功',
      data: {
        knowledgeBase
      }
    });

  } catch (error) {
    console.error('从聊天记录创建知识库错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，创建失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 搜索知识库
 * @route GET /api/knowledge-base/search
 * @access Private
 */
const searchKnowledgeBase = async (req, res) => {
  try {
    const userId = req.userId;
    const { q, category, tags, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }

    const filter = {
      user: userId,
      $text: { $search: q }
    };

    if (category) filter.category = category;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagArray };
    }

    const result = await getKnowledgeBaseLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { score: { $meta: 'textScore' } } // 按相关性排序
    });

    res.json({
      success: true,
      message: '搜索成功',
      data: result
    });

  } catch (error) {
    console.error('搜索知识库错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取知识库统计信息
 * @route GET /api/knowledge-base/stats
 * @access Private
 */
const getKnowledgeBaseStats = async (req, res) => {
  try {
    const userId = req.userId;

    // 获取所有知识库条目
    const allEntries = await KnowledgeBase.find({ user: userId });

    // 统计总数
    const total = allEntries.length;

    // 按分类统计
    const byCategory = {};
    allEntries.forEach(entry => {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = {
          total: 0,
          totalViews: 0,
          avgImportance: 0
        };
      }
      byCategory[entry.category].total += 1;
      byCategory[entry.category].totalViews += entry.viewCount || 0;
    });

    // 计算平均重要性
    Object.keys(byCategory).forEach(category => {
      const categoryEntries = allEntries.filter(e => e.category === category);
      const avgImportance = categoryEntries.reduce((sum, e) => sum + (e.importance || 5), 0) / categoryEntries.length;
      byCategory[category].avgImportance = parseFloat(avgImportance.toFixed(2));
    });

    // 按标签统计
    const byTags = {};
    allEntries.forEach(entry => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
          if (!byTags[tag]) {
            byTags[tag] = 0;
          }
          byTags[tag] += 1;
        });
      }
    });

    // 总浏览量
    const totalViews = allEntries.reduce((sum, e) => sum + (e.viewCount || 0), 0);

    // 平均重要性
    const avgImportance = total > 0
      ? parseFloat((allEntries.reduce((sum, e) => sum + (e.importance || 5), 0) / total).toFixed(2))
      : 0;

    res.json({
      success: true,
      message: '获取统计信息成功',
      data: {
        total,
        totalViews,
        avgImportance,
        byCategory,
        topTags: Object.entries(byTags)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }))
      }
    });

  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 批量整理 AI 聊天记录到知识库
 * @route POST /api/knowledge-base/batch-from-chat
 * @access Private
 */
const batchCreateFromChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageIds, category, importance } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供消息 ID 数组'
      });
    }

    // 查找消息
    const messages = await Message.find({
      _id: { $in: messageIds },
      user: userId,
      role: 'assistant',
      addedToKnowledgeBase: false
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有可整理的消息'
      });
    }

    // 批量创建知识库条目
    const knowledgeBaseEntries = [];
    for (const message of messages) {
      const knowledgeBase = new KnowledgeBase({
        user: userId,
        title: `AI 对话 - ${new Date(message.createdAt).toLocaleDateString()}`,
        content: message.content,
        category: category || 'ai-chat',
        tags: [],
        source: {
          type: 'chat',
          sourceId: message._id,
          sourceText: message.content.substring(0, 100)
        },
        aiSummary: '',
        aiKeywords: [],
        importance: importance || 5
      });

      await knowledgeBase.save();
      knowledgeBaseEntries.push(knowledgeBase);

      // 更新消息关联
      await Message.findByIdAndUpdate(message._id, {
        addedToKnowledgeBase: true,
        knowledgeBaseId: knowledgeBase._id
      });
    }

    res.status(201).json({
      success: true,
      message: `成功整理 ${knowledgeBaseEntries.length} 条消息到知识库`,
      data: {
        count: knowledgeBaseEntries.length,
        knowledgeBaseEntries
      }
    });

  } catch (error) {
    console.error('批量整理知识库错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，批量整理失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createKnowledgeBase,
  getKnowledgeBaseList,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  createFromChat,
  searchKnowledgeBase,
  getKnowledgeBaseStats,
  batchCreateFromChat
};


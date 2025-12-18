/**
 * 查询辅助工具
 * 提供优化的查询方法，使用 lean() 提高性能
 */

const { User, Schedule, Post, Forum, Team, KnowledgeBase } = require('../models');

/**
 * 使用 lean() 查询用户列表（用于列表展示，不需要修改）
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项 { page, limit, sort, fields }
 * @returns {Promise<Array>} 用户数组
 */
const getUsersLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    fields = 'username email avatar school stats'
  } = options;

  return await User.find(filter)
    .select(fields)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(); // 返回纯 JavaScript 对象，提高性能
};

/**
 * 使用 lean() 查询日程计划列表
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 日程计划数组
 */
const getSchedulesLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { date: 1, startTime: 1 },
    fields = 'title description date startTime endTime type priority status'
  } = options;

  return await Schedule.find(filter)
    .select(fields)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

/**
 * 使用 lean() 查询帖子列表（论坛页面）
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 帖子数组
 */
const getPostsLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { isPinned: -1, createdAt: -1 },
    populateAuthor = true
  } = options;

  let query = Post.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  // 如果需要填充作者信息，使用 lean(false) 或单独查询
  if (populateAuthor) {
    query = query.populate('author', 'username avatar');
  }

  return await query.lean();
};

/**
 * 使用 lean() 查询排行榜数据（高性能）
 * @param {String} type - 排行榜类型 ('learningHours', 'completedPlans', 'forumPosts')
 * @param {Number} limit - 返回数量
 * @returns {Promise<Array>} 排行榜数组
 */
const getLeaderboardLean = async (type = 'learningHours', limit = 10) => {
  const sortField = `stats.${type}`;
  
  return await User.find({})
    .select('username avatar school stats')
    .sort({ [sortField]: -1 })
    .limit(limit)
    .lean();
};

/**
 * 使用 lean() 查询知识库列表（搜索场景）
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 知识库数组
 */
const getKnowledgeBaseLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { importance: -1, createdAt: -1 },
    search = ''
  } = options;

  let query = KnowledgeBase.find(filter);

  // 如果有搜索关键词，使用文本搜索
  if (search) {
    query = query.find({ $text: { $search: search } });
  }

  return await query
    .select('title category tags aiSummary importance viewCount createdAt')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

/**
 * 使用 lean() 查询论坛列表
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 论坛数组
 */
const getForumsLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { 'stats.memberCount': -1, createdAt: -1 }
  } = options;

  return await Forum.find(filter)
    .select('name description category tags stats settings')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

/**
 * 使用 lean() 查询组队列表
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 组队数组
 */
const getTeamsLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 }
  } = options;

  return await Team.find(filter)
    .select('name description category tags settings stats members')
    .populate('leader', 'username avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

/**
 * 使用 lean() 进行统计查询（聚合场景）
 * @param {String} userId - 用户ID
 * @returns {Promise<Object>} 统计数据
 */
const getUserStatsLean = async (userId) => {
  const user = await User.findById(userId)
    .select('stats learningPlans teams joinedForums')
    .lean();

  if (!user) {
    return null;
  }

  // 可以在这里添加额外的统计计算
  return {
    ...user.stats,
    totalPlans: user.learningPlans?.length || 0,
    totalTeams: user.teams?.length || 0,
    totalForums: user.joinedForums?.length || 0
  };
};

/**
 * 使用 lean() 查询单个文档（只读场景）
 * @param {String} modelName - 模型名称
 * @param {String} id - 文档ID
 * @param {String} fields - 要返回的字段
 * @returns {Promise<Object>} 文档对象
 */
const getDocumentLean = async (modelName, id, fields = '') => {
  const models = {
    User,
    Schedule,
    Post,
    Forum,
    Team,
    KnowledgeBase
  };

  const Model = models[modelName];
  if (!Model) {
    throw new Error(`模型 ${modelName} 不存在`);
  }

  const query = Model.findById(id);
  if (fields) {
    query.select(fields);
  }

  return await query.lean();
};

module.exports = {
  getUsersLean,
  getSchedulesLean,
  getPostsLean,
  getLeaderboardLean,
  getKnowledgeBaseLean,
  getForumsLean,
  getTeamsLean,
  getUserStatsLean,
  getDocumentLean
};


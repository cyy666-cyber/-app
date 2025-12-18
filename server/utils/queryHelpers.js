/**
 * 查询辅助工具
 * 提供优化的查询方法，使用 lean() 提高性能
 * 包含 select() 字段限制、populate() 深度限制和 Redis 缓存
 */

const { User, Schedule, Post, Forum, Team, KnowledgeBase } = require('../models');
const { cacheQuery, clearUserCache, clearForumCache, clearLeaderboardCache } = require('./cache');

/**
 * 使用 lean() 查询用户列表（用于列表展示，不需要修改）
 * @param {Object} filter - 查询条件
 * @param {Object} options - 选项 { page, limit, sort, fields, useCache }
 * @returns {Promise<Array>} 用户数组
 */
const getUsersLean = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    fields = 'username email avatar school stats',
    useCache = true,
    cacheTTL = 300 // 5分钟
  } = options;

  const queryFn = async () => {
    return await User.find(filter)
      .select(fields) // 限制返回字段
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // 返回纯 JavaScript 对象，提高性能
  };

  // 使用缓存
  if (useCache) {
    return await cacheQuery('users', { filter, page, limit, sort, fields }, queryFn, cacheTTL);
  }

  return await queryFn();
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
    populateAuthor = true,
    populateDepth = 1, // populate 深度限制
    useCache = true,
    cacheTTL = 180 // 3分钟
  } = options;

  const queryFn = async () => {
    let query = Post.find(filter)
      .select('title content tags likes replyCount viewCount createdAt author forum') // 限制字段
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    // 如果需要填充作者信息，限制深度和字段
    if (populateAuthor && populateDepth > 0) {
      query = query.populate({
        path: 'author',
        select: 'username avatar', // 只选择需要的字段
        options: { limit: 1 } // 限制数量（如果是一对多）
      });
    }

    return await query.lean();
  };

  // 使用缓存
  if (useCache) {
    return await cacheQuery('posts', { filter, page, limit, sort }, queryFn, cacheTTL);
  }

  return await queryFn();
};

/**
 * 使用 lean() 查询排行榜数据（高性能）
 * @param {String} type - 排行榜类型 ('learningHours', 'completedPlans', 'forumPosts')
 * @param {Number} limit - 返回数量
 * @param {Object} options - 选项 { useCache, cacheTTL }
 * @returns {Promise<Array>} 排行榜数组
 */
const getLeaderboardLean = async (type = 'learningHours', limit = 10, options = {}) => {
  const {
    useCache = true,
    cacheTTL = 600 // 10分钟（排行榜变化不频繁）
  } = options;

  const sortField = `stats.${type}`;
  
  const queryFn = async () => {
    return await User.find({})
      .select('username avatar school stats') // 只选择需要的字段
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean();
  };

  // 使用缓存（排行榜数据变化不频繁，适合缓存）
  if (useCache) {
    return await cacheQuery('leaderboard', { type, limit }, queryFn, cacheTTL);
  }

  return await queryFn();
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
    sort = { createdAt: -1 },
    populateLeader = true,
    populateMembers = false, // 默认不填充成员（避免深度过深）
    populateDepth = 1, // populate 深度限制
    useCache = true,
    cacheTTL = 300
  } = options;

  const queryFn = async () => {
    let query = Team.find(filter)
      .select('name description category tags settings stats members leader createdAt') // 限制字段
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    // 填充队长信息（限制深度和字段）
    if (populateLeader && populateDepth > 0) {
      query = query.populate({
        path: 'leader',
        select: 'username avatar', // 只选择需要的字段
        options: { limit: 1 }
      });
    }

    // 填充成员信息（谨慎使用，避免深度过深）
    if (populateMembers && populateDepth > 0) {
      query = query.populate({
        path: 'members.user',
        select: 'username avatar', // 只选择需要的字段
        options: { limit: 10 } // 限制成员数量
      });
    }

    return await query.lean();
  };

  // 使用缓存
  if (useCache) {
    return await cacheQuery('teams', { filter, page, limit, sort }, queryFn, cacheTTL);
  }

  return await queryFn();
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


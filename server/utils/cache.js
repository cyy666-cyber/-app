/**
 * Redis 缓存工具
 * 提供查询结果缓存功能，提高性能
 */

const { getRedisClient } = require('../config/redis');

/**
 * 生成缓存键
 * @param {String} prefix - 前缀
 * @param {Object} params - 参数对象
 * @returns {String} 缓存键
 */
const generateCacheKey = (prefix, params) => {
  const paramsStr = JSON.stringify(params);
  return `${prefix}:${Buffer.from(paramsStr).toString('base64')}`;
};

/**
 * 从缓存获取数据
 * @param {String} key - 缓存键
 * @returns {Promise<Object|null>} 缓存数据或 null
 */
const getCache = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('❌ 获取缓存失败:', error.message);
    return null;
  }
};

/**
 * 设置缓存
 * @param {String} key - 缓存键
 * @param {Object} data - 要缓存的数据
 * @param {Number} ttl - 过期时间（秒），默认 300 秒（5分钟）
 * @returns {Promise<Boolean>} 是否成功
 */
const setCache = async (key, data, ttl = 300) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.setEx(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('❌ 设置缓存失败:', error.message);
    return false;
  }
};

/**
 * 删除缓存
 * @param {String} key - 缓存键
 * @returns {Promise<Boolean>} 是否成功
 */
const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error('❌ 删除缓存失败:', error.message);
    return false;
  }
};

/**
 * 删除匹配模式的缓存
 * @param {String} pattern - 匹配模式（如 'user:*'）
 * @returns {Promise<Number>} 删除的数量
 */
const deleteCachePattern = async (pattern) => {
  try {
    const client = getRedisClient();
    if (!client) return 0;

    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    return await client.del(keys);
  } catch (error) {
    console.error('❌ 删除缓存模式失败:', error.message);
    return 0;
  }
};

/**
 * 缓存查询结果
 * @param {String} prefix - 缓存前缀
 * @param {Object} params - 查询参数
 * @param {Function} queryFn - 查询函数
 * @param {Number} ttl - 过期时间（秒）
 * @returns {Promise<Object>} 查询结果
 */
const cacheQuery = async (prefix, params, queryFn, ttl = 300) => {
  const cacheKey = generateCacheKey(prefix, params);

  // 尝试从缓存获取
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`📦 缓存命中: ${cacheKey}`);
    return cached;
  }

  // 缓存未命中，执行查询
  console.log(`🔍 缓存未命中，执行查询: ${cacheKey}`);
  const result = await queryFn();

  // 将结果存入缓存
  await setCache(cacheKey, result, ttl);

  return result;
};

/**
 * 清除用户相关缓存
 * @param {String} userId - 用户ID
 */
const clearUserCache = async (userId) => {
  await deleteCachePattern(`user:${userId}:*`);
  await deleteCachePattern(`users:*`);
};

/**
 * 清除帖子相关缓存
 * @param {String} forumId - 论坛ID
 */
const clearForumCache = async (forumId) => {
  await deleteCachePattern(`forum:${forumId}:*`);
  await deleteCachePattern(`forums:*`);
};

/**
 * 清除排行榜缓存
 */
const clearLeaderboardCache = async () => {
  await deleteCachePattern('leaderboard:*');
};

module.exports = {
  generateCacheKey,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  cacheQuery,
  clearUserCache,
  clearForumCache,
  clearLeaderboardCache
};


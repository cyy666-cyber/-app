const redis = require('redis');

let redisClient = null;

/**
 * 初始化 Redis 客户端
 */
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis 重连失败次数过多');
            return new Error('Redis 连接失败');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis 客户端错误:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis 连接成功');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis 客户端就绪');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    console.log('⚠️  将不使用缓存功能');
    return null;
  }
};

/**
 * 获取 Redis 客户端
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * 关闭 Redis 连接
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis 连接已关闭');
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis
};


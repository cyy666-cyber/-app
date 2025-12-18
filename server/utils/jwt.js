/**
 * JWT 工具函数
 * 用于生成和验证 JWT token
 */

const jwt = require('jsonwebtoken');

// JWT 密钥（应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d'; // 默认7天过期

/**
 * 生成 JWT token
 * @param {Object} payload - token 载荷（用户信息）
 * @param {String} expiresIn - 过期时间（默认7天）
 * @returns {String} JWT token
 */
const generateToken = (payload, expiresIn = JWT_EXPIRE) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'deepseek-app',
    audience: 'deepseek-app-users'
  });
};

/**
 * 验证 JWT token
 * @param {String} token - JWT token
 * @returns {Object} 解码后的 token 数据
 * @throws {Error} 如果 token 无效或过期
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'deepseek-app',
      audience: 'deepseek-app-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token 已过期');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token 无效');
    } else {
      throw new Error('Token 验证失败');
    }
  }
};

/**
 * 解码 token（不验证）
 * @param {String} token - JWT token
 * @returns {Object} 解码后的 token 数据
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};


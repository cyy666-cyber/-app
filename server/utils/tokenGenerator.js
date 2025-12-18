/**
 * Token 生成工具
 * 用于生成密码重置 token 等一次性 token
 */

const crypto = require('crypto');

/**
 * 生成随机 token
 * @param {Number} length - token 长度（字节），默认 32
 * @returns {String} 十六进制 token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * 生成密码重置 token（带过期时间）
 * @param {String} userId - 用户 ID
 * @returns {Object} { token, expiresAt }
 */
const generatePasswordResetToken = (userId) => {
  const token = generateRandomToken(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1小时后过期

  return {
    token,
    expiresAt
  };
};

/**
 * 生成邮箱验证 token
 * @param {String} userId - 用户 ID
 * @returns {Object} { token, expiresAt }
 */
const generateEmailVerificationToken = (userId) => {
  const token = generateRandomToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

  return {
    token,
    expiresAt
  };
};

/**
 * 创建 token 哈希（用于存储）
 * @param {String} token - 原始 token
 * @returns {String} 哈希值
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateRandomToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  hashToken
};


/**
 * 认证中间件
 * 用于保护需要认证的路由
 */

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * JWT 认证中间件
 * 验证请求中的 JWT token，并将用户信息添加到 req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. 从请求头获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证 token，请先登录'
      });
    }

    // 2. 提取 token（格式：Bearer <token>）
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token 格式错误'
      });
    }

    // 3. 验证 token
    const decoded = verifyToken(token);

    // 4. 查找用户（确保用户仍然存在）
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被删除'
      });
    }

    // 5. 将用户信息添加到请求对象
    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    // Token 验证失败
    return res.status(401).json({
      success: false,
      message: error.message || 'Token 验证失败，请重新登录'
    });
  }
};

/**
 * 可选的认证中间件
 * 如果提供了 token 则验证，否则继续（不强制要求认证）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        try {
          const decoded = verifyToken(token);
          const user = await User.findById(decoded.userId).select('-password');
          if (user) {
            req.user = user;
            req.userId = decoded.userId;
          }
        } catch (error) {
          // Token 无效，但不阻止请求继续
          console.log('可选认证失败:', error.message);
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};


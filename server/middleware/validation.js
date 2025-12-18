/**
 * 输入验证中间件
 * 提供通用的输入验证功能
 */

/**
 * 验证注册输入
 */
const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = {};

  // 验证用户名
  if (!username) {
    errors.username = '用户名是必需的';
  } else if (username.length < 3 || username.length > 20) {
    errors.username = '用户名长度必须在3-20个字符之间';
  } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    errors.username = '用户名只能包含字母、数字、下划线和中文';
  }

  // 验证邮箱
  if (!email) {
    errors.email = '邮箱是必需的';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = '请输入有效的邮箱地址';
    }
  }

  // 验证密码
  if (!password) {
    errors.password = '密码是必需的';
  } else if (password.length < 6) {
    errors.password = '密码至少需要6个字符';
  } else if (password.length > 128) {
    errors.password = '密码不能超过128个字符';
  }

  // 如果有错误，返回错误响应
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors
    });
  }

  next();
};

module.exports = {
  validateRegister
};


/**
 * 用户认证控制器
 * 处理用户注册、登录等认证相关操作
 */

const User = require('../models/User');

/**
 * 用户注册
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
  try {
    const { username, email, password, school } = req.body;

    // 1. 输入验证
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名、邮箱和密码',
        errors: {
          username: !username ? '用户名是必需的' : undefined,
          email: !email ? '邮箱是必需的' : undefined,
          password: !password ? '密码是必需的' : undefined
        }
      });
    }

    // 2. 验证用户名长度
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: '用户名长度必须在3-20个字符之间'
      });
    }

    // 3. 验证邮箱格式
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }

    // 4. 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少需要6个字符'
      });
    }

    // 5. 检查用户名是否已存在
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(409).json({
        success: false,
        message: '用户名已被使用',
        field: 'username'
      });
    }

    // 6. 检查邮箱是否已存在
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        message: '邮箱已被注册',
        field: 'email'
      });
    }

    // 7. 创建新用户
    // 注意：密码会在 User 模型的 pre('save') hook 中自动加密
    const user = new User({
      username,
      email: email.toLowerCase().trim(),
      password, // 明文密码，保存时会自动加密
      school: school || ''
    });

    // 8. 保存用户到数据库
    await user.save();

    // 9. 返回成功响应（不包含密码）
    // user.toJSON() 会自动移除密码字段
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          school: user.school,
          avatar: user.avatar,
          createdAt: user.createdAt,
          stats: user.stats
        }
      }
    });

  } catch (error) {
    console.error('注册错误:', error);

    // 处理 Mongoose 验证错误
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

    // 处理重复键错误（虽然我们已经检查过，但以防万一）
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'username' ? '用户名' : '邮箱'}已被使用`,
        field
      });
    }

    // 其他错误
    res.status(500).json({
      success: false,
      message: '服务器错误，注册失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register
};


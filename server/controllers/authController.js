/**
 * 用户认证控制器
 * 处理用户注册、登录等认证相关操作
 */

const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/jwt');
const { generatePasswordResetToken, hashToken } = require('../utils/tokenGenerator');
const { generateVerificationCode, sendVerificationCode } = require('../utils/sms');
const { verifyWechatCode } = require('../utils/wechat');
const crypto = require('crypto');

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

/**
 * 用户登录
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 输入验证
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱和密码',
        errors: {
          email: !email ? '邮箱是必需的' : undefined,
          password: !password ? '密码是必需的' : undefined
        }
      });
    }

    // 2. 查找用户（需要包含密码字段）
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password'); // 显式选择密码字段

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 3. 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 4. 生成 JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      phone: user.phone,
      wechatOpenId: user.wechatOpenId
    };

    const token = generateToken(tokenPayload, '7d'); // Access token，7天过期
    const refreshTokenValue = generateToken(tokenPayload, '30d'); // Refresh token，30天过期

    // 5. 返回成功响应（包含 token 和用户信息）
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token, // Access token
        refreshToken: refreshTokenValue, // Refresh token
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          school: user.school,
          avatar: user.avatar,
          stats: user.stats
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);

    res.status(500).json({
      success: false,
      message: '服务器错误，登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 请求密码重置
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱地址'
      });
    }

    // 查找用户
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // 为了安全，无论用户是否存在都返回成功消息
    if (!user) {
      return res.json({
        success: true,
        message: '如果该邮箱已注册，密码重置链接已发送'
      });
    }

    // 生成密码重置 token
    const resetTokenData = generatePasswordResetToken(user._id.toString());
    const hashedToken = hashToken(resetTokenData.token);

    // 保存重置 token（哈希后存储）
    user.passwordResetToken = {
      token: hashedToken,
      expiresAt: resetTokenData.expiresAt
    };
    await user.save();

    // TODO: 在实际应用中，这里应该发送邮件
    // 现在直接返回 token（仅用于开发测试）
    if (process.env.NODE_ENV === 'development') {
      console.log('密码重置 Token:', resetTokenData.token);
      console.log('重置链接:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetTokenData.token}`);
    }

    res.json({
      success: true,
      message: '如果该邮箱已注册，密码重置链接已发送',
      // 开发环境返回 token（生产环境应移除）
      ...(process.env.NODE_ENV === 'development' && {
        resetToken: resetTokenData.token,
        expiresAt: resetTokenData.expiresAt
      })
    });

  } catch (error) {
    console.error('密码重置请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 重置密码
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供重置 token 和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少需要6个字符'
      });
    }

    // 哈希 token 用于查找
    const hashedToken = hashToken(token);

    // 查找用户（token 匹配且未过期）
    const user = await User.findOne({
      'passwordResetToken.token': hashedToken,
      'passwordResetToken.expiresAt': { $gt: new Date() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '重置 token 无效或已过期'
      });
    }

    // 更新密码（会自动加密）
    user.password = newPassword;
    user.passwordResetToken = {
      token: null,
      expiresAt: null
    };
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });

  } catch (error) {
    console.error('密码重置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，密码重置失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新用户信息
 * @route PUT /api/auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, school, avatar } = req.body;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新允许的字段
    if (username !== undefined) {
      // 检查用户名是否已被其他用户使用
      if (username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: '用户名已被使用'
          });
        }
        user.username = username;
      }
    }

    if (school !== undefined) {
      user.school = school;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          school: user.school,
          avatar: user.avatar,
          stats: user.stats
        }
      }
    });

  } catch (error) {
    console.error('更新用户信息错误:', error);

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
 * 修改密码
 * @route PUT /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6个字符'
      });
    }

    // 查找用户（需要密码字段）
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码（会自动加密）
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，密码修改失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 刷新 Token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '请提供 refresh token'
      });
    }

    // 验证 refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token 无效或已过期'
      });
    }

    // 查找用户
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 生成新的 access token
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email
    };

    const newAccessToken = generateToken(tokenPayload);

    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        token: newAccessToken
      }
    });

  } catch (error) {
    console.error('刷新 Token 错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，Token 刷新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 手机号注册/登录（发送验证码）
 * @route POST /api/auth/phone/send-code
 * @access Public
 */
const sendPhoneCode = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号'
      });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的手机号'
      });
    }

    // 生成验证码
    const code = generateVerificationCode();
    
    // 存储验证码（使用 Redis 或内存存储，5分钟过期）
    // 这里简化处理，实际应该使用 Redis
    const codeKey = `phone_code_${phone}`;
    const codeExpiry = Date.now() + 5 * 60 * 1000; // 5分钟过期
    
    // TODO: 使用 Redis 存储验证码
    // await setCache(codeKey, { code, phone, expiresAt: codeExpiry }, 300);

    // 发送验证码
    const sent = await sendVerificationCode(phone, code);
    
    if (!sent) {
      return res.status(500).json({
        success: false,
        message: '发送验证码失败，请稍后重试'
      });
    }

    // 开发环境返回验证码
    res.json({
      success: true,
      message: '验证码已发送',
      ...(process.env.NODE_ENV === 'development' && {
        code, // 仅开发环境返回
        expiresIn: 300 // 5分钟
      })
    });

  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 手机号注册/登录（验证码登录）
 * @route POST /api/auth/phone/login
 * @access Public
 */
const phoneLogin = async (req, res) => {
  try {
    const { phone, code, username } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号和验证码'
      });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的手机号'
      });
    }

    // TODO: 从 Redis 验证验证码
    // const storedCode = await getCache(`phone_code_${phone}`);
    // if (!storedCode || storedCode.code !== code) {
    //   return res.status(400).json({
    //     success: false,
    //     message: '验证码错误或已过期'
    //   });
    // }

    // 开发环境：简单验证（实际应该从 Redis 获取）
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️  开发环境：跳过验证码验证，手机号: ${phone}, 验证码: ${code}`);
    }

    // 查找或创建用户
    let user = await User.findOne({ phone });

    if (!user) {
      // 新用户注册
      if (!username) {
        return res.status(400).json({
          success: false,
          message: '新用户需要提供用户名'
        });
      }

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '用户名已被使用'
        });
      }

      const isNewUser = true;
      user = new User({
        username,
        phone,
        school: req.body.school || ''
      });
      await user.save();
      var isNew = true;
    } else {
      var isNew = false;
    }

    // 生成 JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      phone: user.phone
    };

    const token = generateToken(tokenPayload, '7d');
    const refreshTokenValue = generateToken(tokenPayload, '30d');

    res.json({
      success: true,
      message: isNew ? '注册成功' : '登录成功',
      data: {
        token,
        refreshToken: refreshTokenValue,
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          school: user.school,
          avatar: user.avatar,
          schoolVerified: user.schoolVerified,
          stats: user.stats
        }
      }
    });

  } catch (error) {
    console.error('手机号登录错误:', error);

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

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'phone' ? '手机号' : '用户名'}已被使用`,
        field
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误，登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 微信登录
 * @route POST /api/auth/wechat/login
 * @access Public
 */
const wechatLogin = async (req, res) => {
  try {
    const { code, nickname, avatar } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '请提供微信登录 code'
      });
    }

    // 验证微信 code 并获取 OpenID
    const wechatInfo = await verifyWechatCode(code);
    const { openid, unionid } = wechatInfo;

    // 查找或创建用户
    let user = await User.findOne({ wechatOpenId: openid });

    if (!user) {
      // 新用户注册
      const username = nickname || `微信用户_${openid.slice(-8)}`;
      
      // 确保用户名唯一
      let finalUsername = username;
      let counter = 1;
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${username}_${counter}`;
        counter++;
      }

      var isNew = true;
      user = new User({
        username: finalUsername,
        wechatOpenId: openid,
        wechatUnionId: unionid,
        wechatNickname: nickname || '',
        wechatAvatar: avatar || '',
        school: req.body.school || ''
      });
      await user.save();
    } else {
      var isNew = false;
      // 更新微信信息
      if (nickname) user.wechatNickname = nickname;
      if (avatar) user.wechatAvatar = avatar;
      if (unionid && !user.wechatUnionId) user.wechatUnionId = unionid;
      await user.save();
    }

    // 生成 JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      wechatOpenId: user.wechatOpenId
    };

    const token = generateToken(tokenPayload, '7d');
    const refreshTokenValue = generateToken(tokenPayload, '30d');

    res.json({
      success: true,
      message: isNew ? '注册成功' : '登录成功',
      data: {
        token,
        refreshToken: refreshTokenValue,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          school: user.school,
          avatar: user.wechatAvatar || user.avatar,
          wechatNickname: user.wechatNickname,
          schoolVerified: user.schoolVerified,
          stats: user.stats
        }
      }
    });

  } catch (error) {
    console.error('微信登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 提交学校认证
 * @route POST /api/auth/school/verify
 * @access Private
 */
const submitSchoolVerification = async (req, res) => {
  try {
    const userId = req.userId;
    const { studentId, verificationMethod, verificationProof } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已认证
    if (user.schoolVerified) {
      return res.status(400).json({
        success: false,
        message: '您已经完成学校认证'
      });
    }

    if (!user.school) {
      return res.status(400).json({
        success: false,
        message: '请先设置学校信息'
      });
    }

    if (!studentId || !verificationMethod) {
      return res.status(400).json({
        success: false,
        message: '请提供学号和认证方式'
      });
    }

    // 更新认证信息
    user.schoolVerification = {
      studentId,
      verificationMethod,
      verificationStatus: 'pending',
      verificationProof: verificationProof || null,
      verifiedAt: null,
      verifiedBy: null
    };

    await user.save();

    res.json({
      success: true,
      message: '学校认证申请已提交，请等待审核',
      data: {
        verification: user.schoolVerification
      }
    });

  } catch (error) {
    console.error('提交学校认证错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，提交失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取学校认证状态
 * @route GET /api/auth/school/verify
 * @access Private
 */
const getSchoolVerification = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '获取认证状态成功',
      data: {
        schoolVerified: user.schoolVerified,
        school: user.school,
        verification: user.schoolVerification
      }
    });

  } catch (error) {
    console.error('获取学校认证状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  refreshToken,
  sendPhoneCode,
  phoneLogin,
  wechatLogin,
  submitSchoolVerification,
  getSchoolVerification
};


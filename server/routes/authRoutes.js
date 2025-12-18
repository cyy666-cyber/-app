/**
 * 用户认证路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
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
} = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    请求密码重置
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    刷新 Token
 * @access  Public
 */
router.post('/refresh-token', refreshToken);

/**
 * @route   PUT /api/auth/profile
 * @desc    更新用户信息
 * @access  Private
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.put('/change-password', authenticate, changePassword);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    message: '获取用户信息成功',
    data: {
      user: req.user
    }
  });
});

/**
 * @route   POST /api/auth/phone/send-code
 * @desc    发送手机验证码
 * @access  Public
 */
router.post('/phone/send-code', sendPhoneCode);

/**
 * @route   POST /api/auth/phone/login
 * @desc    手机号验证码登录/注册
 * @access  Public
 */
router.post('/phone/login', phoneLogin);

/**
 * @route   POST /api/auth/wechat/login
 * @desc    微信登录/注册
 * @access  Public
 */
router.post('/wechat/login', wechatLogin);

/**
 * @route   POST /api/auth/school/verify
 * @desc    提交学校认证
 * @access  Private
 */
router.post('/school/verify', authenticate, submitSchoolVerification);

/**
 * @route   GET /api/auth/school/verify
 * @desc    获取学校认证状态
 * @access  Private
 */
router.get('/school/verify', authenticate, getSchoolVerification);

module.exports = router;


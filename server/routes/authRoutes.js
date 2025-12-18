/**
 * 用户认证路由
 */

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

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

module.exports = router;


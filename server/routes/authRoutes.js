/**
 * 用户认证路由
 */

const express = require('express');
const router = express.Router();
const { register } = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', register);

module.exports = router;


/**
 * 短信服务工具
 * 用于发送验证码短信
 */

const axios = require('axios');

// 这里使用模拟短信服务，实际项目中应该接入真实的短信服务商（如阿里云、腾讯云等）
const SMS_API_URL = process.env.SMS_API_URL || '';
const SMS_API_KEY = process.env.SMS_API_KEY || '';

/**
 * 生成6位数字验证码
 * @returns {String} 验证码
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 发送验证码短信（模拟实现）
 * @param {String} phone - 手机号
 * @param {String} code - 验证码
 * @returns {Promise<Boolean>} 是否发送成功
 */
const sendVerificationCode = async (phone, code) => {
  try {
    // 开发环境：直接打印验证码
    if (process.env.NODE_ENV === 'development' || !SMS_API_URL) {
      console.log(`📱 短信验证码 [${phone}]: ${code}`);
      console.log(`⏰ 验证码有效期: 5分钟`);
      return true;
    }

    // 生产环境：调用真实短信服务
    const response = await axios.post(SMS_API_URL, {
      phone,
      code,
      template: 'verification'
    }, {
      headers: {
        'Authorization': `Bearer ${SMS_API_KEY}`
      }
    });

    return response.status === 200;
  } catch (error) {
    console.error('发送短信验证码失败:', error);
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationCode
};


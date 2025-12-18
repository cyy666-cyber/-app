/**
 * 微信登录工具
 * 用于处理微信登录相关操作
 */

const axios = require('axios');

// 微信小程序配置
const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_SECRET = process.env.WECHAT_SECRET || '';

/**
 * 通过 code 获取微信 OpenID 和 SessionKey
 * @param {String} code - 微信登录 code
 * @returns {Promise<Object>} { openid, session_key, unionid }
 */
const getWechatOpenId = async (code) => {
  try {
    if (!WECHAT_APPID || !WECHAT_SECRET) {
      throw new Error('微信配置未设置');
    }

    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WECHAT_APPID,
        secret: WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (response.data.errcode) {
      throw new Error(response.data.errmsg || '获取微信 OpenID 失败');
    }

    return {
      openid: response.data.openid,
      session_key: response.data.session_key,
      unionid: response.data.unionid || null
    };
  } catch (error) {
    console.error('获取微信 OpenID 错误:', error);
    throw error;
  }
};

/**
 * 验证微信登录凭证（开发环境模拟）
 * @param {String} code - 微信登录 code
 * @returns {Promise<Object>} { openid, unionid }
 */
const verifyWechatCode = async (code) => {
  // 开发环境：模拟返回
  if (process.env.NODE_ENV === 'development' && !WECHAT_APPID) {
    console.log('⚠️  开发环境：模拟微信登录');
    console.log('  Code:', code);
    // 返回模拟的 OpenID
    return {
      openid: `mock_openid_${code}`,
      unionid: null
    };
  }

  // 生产环境：调用真实 API
  return await getWechatOpenId(code);
};

module.exports = {
  getWechatOpenId,
  verifyWechatCode
};


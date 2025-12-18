/**
 * 测试完整的认证流程
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/jwt');

const testAuthFlow = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    console.log('\n📋 测试完整认证流程...\n');

    // 清理测试用户
    await User.deleteMany({ email: { $regex: /^test.*@test\.com$/ } });
    await User.deleteMany({ phone: { $regex: /^138/ } });
    await User.deleteMany({ username: { $regex: /^testuser/ } });
    console.log('✅ 清理旧的测试用户\n');

    // 测试1: 邮箱注册
    console.log('1️⃣  测试邮箱注册...');
    const timestamp = Date.now().toString().slice(-8);
    const testEmail = `test_${timestamp}@test.com`;
    const testUser = new User({
      username: 'testuser_' + timestamp,
      email: testEmail,
      password: 'password123',
      school: '测试大学'
    });
    await testUser.save();
    console.log('  ✅ 邮箱注册成功');
    console.log('  - 用户名:', testUser.username);
    console.log('  - 邮箱:', testUser.email);
    console.log('  - 学校:', testUser.school);

    // 测试2: 邮箱登录
    console.log('\n2️⃣  测试邮箱登录...');
    const loginUser = await User.findOne({ email: testEmail }).select('+password');
    const isValid = await loginUser.comparePassword('password123');
    if (isValid) {
      const token = generateToken({ userId: loginUser._id.toString(), username: loginUser.username, email: loginUser.email });
      console.log('  ✅ 邮箱登录成功');
      console.log('  - Token 生成成功');
      const decoded = verifyToken(token);
      console.log('  - Token 验证成功，用户ID:', decoded.userId);
    }

    // 测试3: 手机号注册（无密码）
    console.log('\n3️⃣  测试手机号注册...');
    const testPhone = '138' + timestamp;
    const phoneUser = new User({
      username: 'phoneuser_' + timestamp,
      phone: testPhone,
      school: '测试大学'
    });
    await phoneUser.save();
    console.log('  ✅ 手机号注册成功');
    console.log('  - 用户名:', phoneUser.username);
    console.log('  - 手机号:', phoneUser.phone);
    console.log('  - 无密码:', !phoneUser.password ? '✅' : '❌');

    // 测试4: 微信登录（无密码）
    console.log('\n4️⃣  测试微信登录...');
    const wechatOpenId = 'mock_openid_' + timestamp;
    const wechatUser = new User({
      username: 'wechatuser_' + timestamp,
      wechatOpenId: wechatOpenId,
      wechatNickname: '微信用户',
      school: '测试大学'
    });
    await wechatUser.save();
    console.log('  ✅ 微信登录成功');
    console.log('  - 用户名:', wechatUser.username);
    console.log('  - 微信 OpenID:', wechatUser.wechatOpenId);
    console.log('  - 无密码:', !wechatUser.password ? '✅' : '❌');

    // 测试5: 学校认证
    console.log('\n5️⃣  测试学校认证...');
    testUser.schoolVerification = {
      studentId: '2021001',
      verificationMethod: 'email',
      verificationStatus: 'pending',
      verificationProof: null
    };
    await testUser.save();
    console.log('  ✅ 学校认证申请已提交');
    console.log('  - 学号:', testUser.schoolVerification.studentId);
    console.log('  - 认证状态:', testUser.schoolVerification.verificationStatus);

    // 测试6: 按学校查询
    console.log('\n6️⃣  测试按学校查询...');
    const schoolUsers = await User.find({ school: '测试大学' });
    console.log('  ✅ 找到', schoolUsers.length, '个同校用户');

    // 清理测试用户
    await User.deleteMany({ _id: { $in: [testUser._id, phoneUser._id, wechatUser._id] } });
    console.log('\n✅ 测试用户已清理');

    console.log('\n✅ 所有认证流程测试完成！\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAuthFlow();


/**
 * 测试用户认证流程
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/jwt');

const testAuth = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    console.log('\n📋 测试用户认证流程...\n');

    // 清理测试用户
    await User.deleteMany({ email: { $regex: /^test.*@test\.com$/ } });
    await User.deleteMany({ username: { $regex: /^testuser/ } });
    console.log('✅ 清理旧的测试用户\n');

    // 测试1: 用户注册
    console.log('1️⃣  测试用户注册...');
    try {
      const testUser = new User({
        username: 'testuser_' + Date.now().toString().slice(-8),
        email: `test_${Date.now().toString().slice(-8)}@test.com`,
        password: 'password123',
        school: '测试大学'
      });

      await testUser.save();
      console.log('  ✅ 用户注册成功');
      console.log('  - 用户名:', testUser.username);
      console.log('  - 邮箱:', testUser.email);
      console.log('  - 学校:', testUser.school);
      console.log('  - 密码已加密:', testUser.password.substring(0, 20) + '...');

      // 测试2: 用户登录（密码验证）
      console.log('\n2️⃣  测试用户登录（密码验证）...');
      const user = await User.findOne({ email: testUser.email }).select('+password');
      const isPasswordValid = await user.comparePassword('password123');
      const isWrong = await user.comparePassword('wrongpassword');

      if (isPasswordValid && !isWrong) {
        console.log('  ✅ 密码验证成功');
      } else {
        console.log('  ❌ 密码验证失败');
      }

      // 测试3: JWT Token 生成和验证
      console.log('\n3️⃣  测试 JWT Token...');
      const tokenPayload = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email
      };

      const token = generateToken(tokenPayload);
      console.log('  ✅ Token 生成成功');
      console.log('  - Token 长度:', token.length);

      const decoded = verifyToken(token);
      console.log('  ✅ Token 验证成功');
      console.log('  - User ID:', decoded.userId);
      console.log('  - Username:', decoded.username);

      // 清理测试用户
      await User.deleteOne({ _id: user._id });
      console.log('\n✅ 测试用户已清理');

    } catch (error) {
      console.log('  ❌ 测试失败:', error.message);
    }

    // 测试4: 检查 User 模型字段
    console.log('\n4️⃣  检查 User 模型字段...');
    const sampleUser = new User({
      username: 'sample',
      email: 'sample@test.com',
      password: 'password123'
    });
    
    const fields = Object.keys(sampleUser.schema.paths);
    console.log('  ✅ User 模型字段:', fields.length, '个');
    console.log('  - 基础字段:', ['username', 'email', 'password', 'avatar', 'school'].every(f => fields.includes(f)) ? '✅' : '❌');
    console.log('  - 认证相关:', ['passwordResetToken', 'emailVerified'].every(f => fields.includes(f)) ? '✅' : '❌');

    console.log('\n✅ 所有测试完成！\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAuth();


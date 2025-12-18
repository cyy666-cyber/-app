/**
 * 测试用户登录接口
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../utils/jwt');

const testLogin = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    console.log('\n📋 测试用户登录功能...\n');

    // 创建测试用户
    const timestamp = Date.now().toString().slice(-8);
    const testUser = new User({
      username: 'login' + timestamp,
      email: `login${timestamp}@example.com`,
      password: 'password123',
      school: '测试大学'
    });

    await testUser.save();
    console.log('✅ 测试用户创建成功');
    console.log('  - 用户名:', testUser.username);
    console.log('  - 邮箱:', testUser.email);

    // 测试1: JWT token 生成
    console.log('\n1️⃣  测试 JWT token 生成...');
    try {
      const tokenPayload = {
        userId: testUser._id.toString(),
        username: testUser.username,
        email: testUser.email
      };

      const token = generateToken(tokenPayload);
      console.log('  ✅ Token 生成成功');
      console.log('  - Token 长度:', token.length);
      console.log('  - Token 前缀:', token.substring(0, 20) + '...');

      // 测试2: JWT token 验证
      console.log('\n2️⃣  测试 JWT token 验证...');
      try {
        const decoded = verifyToken(token);
        console.log('  ✅ Token 验证成功');
        console.log('  - User ID:', decoded.userId);
        console.log('  - Username:', decoded.username);
        console.log('  - Email:', decoded.email);
        console.log('  - Expires:', new Date(decoded.exp * 1000).toLocaleString());
      } catch (error) {
        console.log('  ❌ Token 验证失败:', error.message);
      }

      // 测试3: 密码验证
      console.log('\n3️⃣  测试密码验证...');
      try {
        const user = await User.findById(testUser._id).select('+password');
        const isMatch = await user.comparePassword('password123');
        const isWrong = await user.comparePassword('wrongpassword');

        if (isMatch && !isWrong) {
          console.log('  ✅ 密码验证功能正常');
        } else {
          console.log('  ❌ 密码验证功能异常');
        }
      } catch (error) {
        console.log('  ❌ 测试失败:', error.message);
      }

      // 测试4: 登录流程模拟
      console.log('\n4️⃣  测试完整登录流程...');
      try {
        // 模拟登录：查找用户并验证密码
        const user = await User.findOne({ email: testUser.email })
          .select('+password');

        if (!user) {
          console.log('  ❌ 用户未找到');
        } else {
          const isPasswordValid = await user.comparePassword('password123');
          if (isPasswordValid) {
            const loginToken = generateToken({
              userId: user._id.toString(),
              username: user.username,
              email: user.email
            });
            console.log('  ✅ 登录流程成功');
            console.log('  - 用户验证通过');
            console.log('  - Token 已生成');
          } else {
            console.log('  ❌ 密码验证失败');
          }
        }
      } catch (error) {
        console.log('  ❌ 测试失败:', error.message);
      }

    } catch (error) {
      console.log('  ❌ Token 生成失败:', error.message);
    }

    // 清理测试用户
    await User.deleteOne({ _id: testUser._id });
    console.log('\n✅ 测试用户已清理');

    console.log('\n✅ 所有测试完成！\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testLogin();


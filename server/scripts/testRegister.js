/**
 * 测试用户注册接口
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');

const testRegister = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    console.log('\n📋 测试用户注册功能...\n');

    // 测试1: 正常注册
    console.log('1️⃣  测试正常注册...');
    try {
      const timestamp = Date.now().toString().slice(-8); // 只取后8位
      const testUser = new User({
        username: 'test' + timestamp,
        email: `test${timestamp}@example.com`,
        password: 'password123',
        school: '测试大学'
      });

      await testUser.save();
      console.log('  ✅ 用户创建成功');
      console.log('  - 用户名:', testUser.username);
      console.log('  - 邮箱:', testUser.email);
      console.log('  - 密码已加密:', testUser.password.substring(0, 20) + '...');
      console.log('  - 密码长度:', testUser.password.length);

      // 验证密码已加密（bcrypt 哈希通常以 $2a$ 或 $2b$ 开头）
      if (testUser.password.startsWith('$2')) {
        console.log('  ✅ 密码已正确加密（bcrypt）');
      } else {
        console.log('  ⚠️  密码可能未加密');
      }

      // 清理测试用户
      await User.deleteOne({ _id: testUser._id });
      console.log('  ✅ 测试用户已清理\n');
    } catch (error) {
      console.log('  ❌ 测试失败:', error.message);
    }

    // 测试2: 验证密码比较功能
    console.log('2️⃣  测试密码比较功能...');
    try {
      const timestamp = Date.now().toString().slice(-8);
      const testUser = new User({
        username: 'pwd' + timestamp,
        email: `pwd${timestamp}@example.com`,
        password: 'password123'
      });

      await testUser.save();
      const isMatch = await testUser.comparePassword('password123');
      const isWrong = await testUser.comparePassword('wrongpassword');

      if (isMatch && !isWrong) {
        console.log('  ✅ 密码比较功能正常');
      } else {
        console.log('  ❌ 密码比较功能异常');
      }

      await User.deleteOne({ _id: testUser._id });
      console.log('  ✅ 测试用户已清理\n');
    } catch (error) {
      console.log('  ❌ 测试失败:', error.message);
    }

    // 测试3: 验证唯一性约束
    console.log('3️⃣  测试唯一性约束...');
    try {
      const timestamp = Date.now().toString().slice(-8);
      const username = 'uni' + timestamp;
      const email = `uni${timestamp}@example.com`;

      const user1 = new User({ username, email, password: 'password123' });
      await user1.save();
      console.log('  ✅ 第一个用户创建成功');

      try {
        const user2 = new User({ username, email, password: 'password123' });
        await user2.save();
        console.log('  ❌ 应该失败但成功了（唯一性约束未生效）');
      } catch (error) {
        if (error.code === 11000) {
          console.log('  ✅ 唯一性约束正常工作');
        } else {
          console.log('  ⚠️  其他错误:', error.message);
        }
      }

      await User.deleteOne({ _id: user1._id });
      console.log('  ✅ 测试用户已清理\n');
    } catch (error) {
      console.log('  ❌ 测试失败:', error.message);
    }

    // 测试4: 验证 toJSON 方法（密码不应返回）
    console.log('4️⃣  测试 toJSON 方法（密码不应返回）...');
    try {
      const timestamp = Date.now().toString().slice(-8);
      const testUser = new User({
        username: 'json' + timestamp,
        email: `json${timestamp}@example.com`,
        password: 'password123'
      });

      await testUser.save();
      const userJSON = testUser.toJSON();

      if (!userJSON.password) {
        console.log('  ✅ 密码已从 JSON 中移除');
      } else {
        console.log('  ❌ 密码仍然在 JSON 中');
      }

      await User.deleteOne({ _id: testUser._id });
      console.log('  ✅ 测试用户已清理\n');
    } catch (error) {
      console.log('  ❌ 测试失败:', error.message);
    }

    console.log('✅ 所有测试完成！\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testRegister();


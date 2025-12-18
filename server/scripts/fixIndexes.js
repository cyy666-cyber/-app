/**
 * 修复数据库索引
 * 删除旧的重复索引并重新创建正确的索引
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

const fixIndexes = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    console.log('\n📋 检查当前索引...');
    const indexes = await collection.indexes();
    console.log('当前索引:', indexes.map(i => `${i.name} (${JSON.stringify(i.key)})`).join('\n  - '));

    console.log('\n🗑️  删除旧的索引...');
    const indexesToDrop = ['email_1', 'phone_1', 'wechatOpenId_1'];
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`  ✅ 删除 ${indexName}`);
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          console.log(`  ⚠️  ${indexName} 不存在`);
        } else {
          console.log(`  ⚠️  删除 ${indexName} 失败: ${error.message}`);
        }
      }
    }

    console.log('\n📊 重新创建索引...');
    // 重新创建索引（Mongoose 会自动创建）
    const User = require('../models/User');
    await User.createIndexes();
    console.log('  ✅ 索引创建完成');

    console.log('\n📋 验证索引...');
    const newIndexes = await collection.indexes();
    console.log('新索引:', newIndexes.map(i => `${i.name} (${JSON.stringify(i.key)}, sparse: ${i.sparse || false})`).join('\n  - '));

    console.log('\n✅ 索引修复完成！\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复索引出错:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixIndexes();


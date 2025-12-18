/**
 * 创建数据库索引脚本
 * 用于在数据库中创建所有必要的索引
 */

require('dotenv').config();
const { connectDB } = require('../config/database');
const {
  User,
  Schedule,
  SkillTree,
  SkillNode,
  KnowledgeBase,
  Forum,
  Post,
  Reply,
  Team,
  TeamMessage,
  Message
} = require('../models');

const createIndexes = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();

    console.log('\n📊 开始创建索引...\n');

    // User 索引
    console.log('创建 User 索引...');
    await User.createIndexes();
    console.log('✅ User 索引创建完成');

    // Schedule 索引
    console.log('创建 Schedule 索引...');
    await Schedule.createIndexes();
    console.log('✅ Schedule 索引创建完成');

    // SkillTree 索引
    console.log('创建 SkillTree 索引...');
    await SkillTree.createIndexes();
    console.log('✅ SkillTree 索引创建完成');

    // SkillNode 索引
    console.log('创建 SkillNode 索引...');
    await SkillNode.createIndexes();
    console.log('✅ SkillNode 索引创建完成');

    // KnowledgeBase 索引
    console.log('创建 KnowledgeBase 索引...');
    await KnowledgeBase.createIndexes();
    console.log('✅ KnowledgeBase 索引创建完成');

    // Forum 索引
    console.log('创建 Forum 索引...');
    await Forum.createIndexes();
    console.log('✅ Forum 索引创建完成');

    // Post 索引
    console.log('创建 Post 索引...');
    await Post.createIndexes();
    console.log('✅ Post 索引创建完成');

    // Reply 索引
    console.log('创建 Reply 索引...');
    await Reply.createIndexes();
    console.log('✅ Reply 索引创建完成');

    // Team 索引
    console.log('创建 Team 索引...');
    await Team.createIndexes();
    console.log('✅ Team 索引创建完成');

    // TeamMessage 索引
    console.log('创建 TeamMessage 索引...');
    await TeamMessage.createIndexes();
    console.log('✅ TeamMessage 索引创建完成');

    // Message 索引
    console.log('创建 Message 索引...');
    await Message.createIndexes();
    console.log('✅ Message 索引创建完成');

    console.log('\n✅ 所有索引创建完成！\n');

    // 显示索引统计
    console.log('📊 索引统计:');
    const collections = ['users', 'schedules', 'forums', 'posts', 'replies', 'teams', 'teammessages', 'messages', 'knowledgebases'];
    for (const collection of collections) {
      try {
        const indexes = await User.db.collection(collection).indexes();
        console.log(`  ${collection}: ${indexes.length} 个索引`);
      } catch (err) {
        // 集合可能不存在，跳过
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    process.exit(1);
  }
};

createIndexes();


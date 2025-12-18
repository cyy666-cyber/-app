/**
 * Lean() 查询使用示例
 * 展示如何在实际代码中使用 lean() 优化查询性能
 */

const {
  getUsersLean,
  getSchedulesLean,
  getPostsLean,
  getLeaderboardLean,
  getKnowledgeBaseLean,
  getForumsLean,
  getTeamsLean,
  getUserStatsLean
} = require('../utils/queryHelpers');

const { User, Schedule, Post } = require('../models');

// ==================== 示例 1: 用户列表查询 ====================
async function example1_getUserList() {
  console.log('示例 1: 用户列表查询');
  
  // ✅ 使用 lean() - 只读场景，性能更好
  const users = await getUsersLean(
    { school: '示例大学' },
    {
      page: 1,
      limit: 20,
      sort: { createdAt: -1 },
      fields: 'username email avatar school'
    }
  );
  
  console.log('用户数量:', users.length);
  console.log('第一个用户:', users[0]);
  // users[0] 是纯 JavaScript 对象，没有 save() 等方法
}

// ==================== 示例 2: 排行榜查询 ====================
async function example2_getLeaderboard() {
  console.log('示例 2: 排行榜查询');
  
  // ✅ 使用 lean() - 排行榜只需要读取数据
  const leaderboard = await getLeaderboardLean('learningHours', 10);
  
  leaderboard.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} - ${user.stats.learningHours} 小时`);
  });
}

// ==================== 示例 3: 日程计划查询 ====================
async function example3_getSchedules(userId) {
  console.log('示例 3: 日程计划查询');
  
  // ✅ 使用 lean() - 列表展示，不需要修改
  const schedules = await getSchedulesLean(
    { user: userId, status: 'pending' },
    {
      page: 1,
      limit: 10,
      sort: { date: 1, startTime: 1 }
    }
  );
  
  console.log('待办日程:', schedules.length);
  schedules.forEach(schedule => {
    console.log(`- ${schedule.title} (${schedule.date})`);
  });
}

// ==================== 示例 4: 帖子列表查询 ====================
async function example4_getPosts(forumId) {
  console.log('示例 4: 帖子列表查询');
  
  // ✅ 使用 lean() - 论坛帖子列表，只读
  const posts = await getPostsLean(
    { forum: forumId, status: 'published' },
    {
      page: 1,
      limit: 20,
      populateAuthor: true
    }
  );
  
  console.log('帖子数量:', posts.length);
  posts.forEach(post => {
    console.log(`- ${post.title} by ${post.author?.username}`);
  });
}

// ==================== 示例 5: 知识库搜索 ====================
async function example5_searchKnowledgeBase(userId, keyword) {
  console.log('示例 5: 知识库搜索');
  
  // ✅ 使用 lean() - 搜索功能，只读
  const results = await getKnowledgeBaseLean(
    { user: userId },
    {
      page: 1,
      limit: 10,
      search: keyword,
      sort: { importance: -1 }
    }
  );
  
  console.log('搜索结果:', results.length);
  results.forEach(item => {
    console.log(`- ${item.title} (重要性: ${item.importance})`);
  });
}

// ==================== 示例 6: 用户统计查询 ====================
async function example6_getUserStats(userId) {
  console.log('示例 6: 用户统计查询');
  
  // ✅ 使用 lean() - 统计数据，只读
  const stats = await getUserStatsLean(userId);
  
  console.log('用户统计:', stats);
  // {
  //   learningHours: 120,
  //   completedPlans: 15,
  //   forumPosts: 8,
  //   teamCount: 3,
  //   totalPlans: 20,
  //   totalTeams: 3,
  //   totalForums: 5
  // }
}

// ==================== 示例 7: 对比：lean() vs 不使用 lean() ====================
async function example7_performanceComparison() {
  console.log('示例 7: 性能对比');
  
  // ❌ 不使用 lean() - 返回 Mongoose 文档
  const start1 = Date.now();
  const users1 = await User.find({}).limit(1000);
  const time1 = Date.now() - start1;
  console.log(`不使用 lean(): ${time1}ms, 内存占用较大`);
  
  // ✅ 使用 lean() - 返回纯 JavaScript 对象
  const start2 = Date.now();
  const users2 = await User.find({}).limit(1000).lean();
  const time2 = Date.now() - start2;
  console.log(`使用 lean(): ${time2}ms, 内存占用较小`);
  console.log(`性能提升: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
}

// ==================== 示例 8: 需要修改时，不使用 lean() ====================
async function example8_updateUser(userId) {
  console.log('示例 8: 更新用户（不使用 lean()）');
  
  // ❌ 错误：使用 lean() 后无法保存
  // const user = await User.findById(userId).lean();
  // user.username = 'newName';
  // await user.save(); // ❌ 错误！lean() 返回的对象没有 save() 方法
  
  // ✅ 正确：需要修改时，不使用 lean()
  const user = await User.findById(userId);
  user.username = 'newName';
  await user.save(); // ✅ 正确
  console.log('用户已更新');
}

// ==================== 示例 9: 混合使用策略 ====================
async function example9_mixedStrategy(forumId) {
  console.log('示例 9: 混合使用策略');
  
  // 第一步：使用 lean() 快速查询列表
  const posts = await getPostsLean(
    { forum: forumId },
    { page: 1, limit: 20 }
  );
  
  console.log('帖子列表（lean）:', posts.length);
  
  // 第二步：用户点击某个帖子时，查询完整文档（不使用 lean()）
  if (posts.length > 0) {
    const postId = posts[0]._id;
    const postDetail = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate('replies');
    
    console.log('帖子详情（完整文档）:', postDetail.title);
    // 现在可以使用 postDetail.save() 等方法
  }
}

// ==================== 示例 10: 实际 API 路由使用 ====================
async function example10_apiRouteExample(req, res) {
  // 在 Express 路由中使用 lean() 查询
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // ✅ 使用 lean() - API 返回数据，只读
    const users = await getUsersLean(
      {},
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      }
    );
    
    res.json({
      success: true,
      data: users,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 导出所有示例
module.exports = {
  example1_getUserList,
  example2_getLeaderboard,
  example3_getSchedules,
  example4_getPosts,
  example5_searchKnowledgeBase,
  example6_getUserStats,
  example7_performanceComparison,
  example8_updateUser,
  example9_mixedStrategy,
  example10_apiRouteExample
};


# 工具函数说明

## queryHelpers.js

提供使用 `lean()` 优化的查询方法，适用于只读场景，提高查询性能。

### 使用方法

```javascript
const {
  getUsersLean,
  getSchedulesLean,
  getPostsLean,
  getLeaderboardLean,
  getKnowledgeBaseLean,
  getForumsLean,
  getTeamsLean,
  getUserStatsLean,
  getDocumentLean
} = require('./utils/queryHelpers');

// 查询用户列表
const users = await getUsersLean(
  { school: '示例大学' },
  { page: 1, limit: 20, sort: { createdAt: -1 } }
);

// 查询排行榜
const leaderboard = await getLeaderboardLean('learningHours', 10);

// 查询用户统计
const stats = await getUserStatsLean(userId);
```

### 性能优势

- 使用 `lean()` 返回纯 JavaScript 对象，减少内存占用
- 结合 `select()` 只查询需要的字段
- 适合列表查询、排行榜、统计数据等只读场景

### 注意事项

- 这些方法返回的对象没有 `save()`、`validate()` 等 Mongoose 方法
- 如果需要修改数据，请使用模型的常规查询方法


# 查询优化指南

## 1. 使用 select() 限制返回字段

### 为什么使用 select()？

- ✅ **减少数据传输量**：只查询需要的字段
- ✅ **提高查询速度**：减少数据库处理时间
- ✅ **降低内存占用**：减少内存使用

### 使用方法

```javascript
// ❌ 不推荐：查询所有字段
const users = await User.find({});

// ✅ 推荐：只查询需要的字段
const users = await User.find({})
  .select('username email avatar'); // 只返回这三个字段
```

### 实际应用

```javascript
// 用户列表 - 只需要基本信息
const users = await User.find({})
  .select('username email avatar school')
  .lean();

// 帖子列表 - 不需要完整内容
const posts = await Post.find({ forum: forumId })
  .select('title author createdAt replyCount viewCount')
  .lean();

// 排行榜 - 只需要统计信息
const leaderboard = await User.find({})
  .select('username avatar stats')
  .sort({ 'stats.learningHours': -1 })
  .limit(10)
  .lean();
```

## 2. 使用 populate() 时限制深度

### 为什么限制深度？

- ✅ **避免性能问题**：深度 populate 会导致多次查询
- ✅ **减少数据传输**：避免查询不必要的数据
- ✅ **防止循环引用**：避免无限嵌套

### 深度限制策略

```javascript
// ❌ 不推荐：无限制的 populate
const post = await Post.findById(postId)
  .populate('author')
  .populate('forum')
  .populate('replies')
  .populate('replies.author'); // 可能很深

// ✅ 推荐：限制深度和字段
const post = await Post.findById(postId)
  .populate({
    path: 'author',
    select: 'username avatar', // 只选择需要的字段
    options: { limit: 1 }
  })
  .populate({
    path: 'replies',
    select: 'content author createdAt',
    options: { limit: 10 }, // 限制数量
    populate: {
      path: 'author',
      select: 'username avatar' // 限制嵌套深度
    }
  });
```

### 最佳实践

```javascript
// 1. 限制 populate 深度（最多 2 层）
const getPostWithReplies = async (postId) => {
  return await Post.findById(postId)
    .populate({
      path: 'author',
      select: 'username avatar' // 第1层
    })
    .populate({
      path: 'replies',
      select: 'content createdAt',
      populate: {
        path: 'author',
        select: 'username avatar' // 第2层，不再深入
      }
    });
};

// 2. 使用 select() 限制每个 populate 的字段
const getTeamWithMembers = async (teamId) => {
  return await Team.findById(teamId)
    .populate({
      path: 'leader',
      select: 'username avatar school' // 只选择需要的字段
    })
    .populate({
      path: 'members.user',
      select: 'username avatar', // 限制成员字段
      options: { limit: 20 } // 限制成员数量
    });
};

// 3. 避免循环 populate
// ❌ 错误示例
const user = await User.findById(userId)
  .populate('teams')
  .populate('teams.members.user'); // 可能很深

// ✅ 正确：分步查询
const user = await User.findById(userId)
  .select('teams')
  .lean();
const teams = await Team.find({ _id: { $in: user.teams } })
  .populate('leader', 'username avatar')
  .lean();
```

## 3. 添加查询缓存（Redis）

### 为什么使用缓存？

- ✅ **提高响应速度**：缓存热点数据
- ✅ **减少数据库压力**：减少数据库查询次数
- ✅ **改善用户体验**：快速返回结果

### Redis 缓存配置

```javascript
// config/redis.js
const redis = require('redis');

const initRedis = async () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  await client.connect();
  return client;
};
```

### 缓存策略

#### 1. 缓存热点数据

```javascript
// 排行榜 - 变化不频繁，适合缓存
const getLeaderboard = async () => {
  return await cacheQuery(
    'leaderboard',
    { type: 'learningHours' },
    async () => {
      return await User.find({})
        .select('username avatar stats')
        .sort({ 'stats.learningHours': -1 })
        .limit(10)
        .lean();
    },
    600 // 缓存10分钟
  );
};
```

#### 2. 缓存用户数据

```javascript
// 用户信息 - 变化不频繁
const getUser = async (userId) => {
  return await cacheQuery(
    `user:${userId}`,
    {},
    async () => {
      return await User.findById(userId)
        .select('username email avatar school stats')
        .lean();
    },
    300 // 缓存5分钟
  );
};
```

#### 3. 缓存列表数据

```javascript
// 帖子列表 - 变化较频繁，缓存时间短
const getPosts = async (forumId, page = 1) => {
  return await cacheQuery(
    'posts',
    { forumId, page },
    async () => {
      return await Post.find({ forum: forumId })
        .select('title author createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean();
    },
    180 // 缓存3分钟
  );
};
```

### 缓存失效策略

```javascript
// 当数据更新时，清除相关缓存
const updateUser = async (userId, data) => {
  const user = await User.findByIdAndUpdate(userId, data);
  
  // 清除用户相关缓存
  await clearUserCache(userId);
  await clearLeaderboardCache(); // 排行榜可能受影响
  
  return user;
};

// 创建帖子时，清除论坛缓存
const createPost = async (postData) => {
  const post = await Post.create(postData);
  
  // 清除论坛相关缓存
  await clearForumCache(post.forum);
  
  return post;
};
```

### 缓存最佳实践

1. **选择合适的缓存时间**
   - 排行榜：10-30分钟（变化不频繁）
   - 用户信息：5-10分钟（变化较少）
   - 列表数据：1-5分钟（变化较频繁）
   - 实时数据：不缓存

2. **缓存键命名规范**
   ```javascript
   // 格式：prefix:identifier:params
   'user:12345'
   'posts:forum:67890:page:1'
   'leaderboard:learningHours:limit:10'
   ```

3. **避免缓存穿透**
   ```javascript
   // 缓存空结果，避免频繁查询数据库
   const getUser = async (userId) => {
     const cached = await getCache(`user:${userId}`);
     if (cached === null) {
       // 缓存空结果，避免缓存穿透
       await setCache(`user:${userId}`, null, 60);
       return null;
     }
     return cached;
   };
   ```

4. **监控缓存命中率**
   ```javascript
   // 记录缓存命中情况
   const cacheQuery = async (key, queryFn, ttl) => {
     const cached = await getCache(key);
     if (cached) {
       console.log(`✅ 缓存命中: ${key}`);
       return cached;
     }
     
     console.log(`❌ 缓存未命中: ${key}`);
     const result = await queryFn();
     await setCache(key, result, ttl);
     return result;
   };
   ```

## 综合优化示例

```javascript
// 完整的优化查询示例
const getOptimizedPosts = async (forumId, page = 1) => {
  return await cacheQuery(
    'posts',
    { forumId, page },
    async () => {
      return await Post.find({ forum: forumId, status: 'published' })
        .select('title content author createdAt replyCount viewCount') // 1. 限制字段
        .populate({
          path: 'author',
          select: 'username avatar', // 2. 限制 populate 字段和深度
          options: { limit: 1 }
        })
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean(); // 3. 使用 lean()
    },
    180 // 4. 缓存3分钟
  );
};
```

## 性能对比

| 优化方法 | 查询时间 | 内存占用 | 适用场景 |
|---------|---------|---------|---------|
| 无优化 | 100ms | 100% | - |
| + select() | 80ms | 60% | 所有查询 |
| + lean() | 50ms | 40% | 只读查询 |
| + populate限制 | 40ms | 30% | 关联查询 |
| + 缓存 | 5ms | 30% | 热点数据 |

## 总结

1. **select()**：始终使用，只查询需要的字段
2. **populate() 限制**：限制深度和字段，避免过度查询
3. **lean()**：只读场景使用，提高性能
4. **缓存**：热点数据使用，显著提升响应速度

通过综合使用这些优化方法，可以显著提高应用的查询性能！


# Lean() 查询使用指南

## 什么是 lean()？

`lean()` 是 Mongoose 提供的一个查询方法，它返回纯 JavaScript 对象而不是 Mongoose 文档。这样可以：

- ✅ **提高性能**：减少内存占用和 CPU 使用
- ✅ **加快查询速度**：不需要 Mongoose 文档的额外开销
- ✅ **适合只读场景**：当你只需要读取数据而不需要修改时

## 何时使用 lean()

### ✅ 适合使用 lean() 的场景：

1. **列表查询**：显示用户列表、帖子列表等
2. **排行榜**：只需要读取数据展示
3. **统计数据**：聚合查询、统计信息
4. **搜索功能**：全文搜索、筛选结果
5. **API 响应**：返回给前端的只读数据

### ❌ 不适合使用 lean() 的场景：

1. **需要修改数据**：需要调用 `save()`, `update()` 等方法
2. **需要验证**：需要 Mongoose 的验证功能
3. **需要中间件**：需要触发 `pre/post` 钩子
4. **需要虚拟字段**：需要访问虚拟属性
5. **需要实例方法**：需要调用模型的自定义方法

## 使用示例

### 基础用法

```javascript
// ❌ 不使用 lean() - 返回 Mongoose 文档
const users = await User.find({});
// users[0] 是 Mongoose 文档，有 save(), validate() 等方法

// ✅ 使用 lean() - 返回纯 JavaScript 对象
const users = await User.find({}).lean();
// users[0] 是普通对象，性能更好
```

### 性能对比

```javascript
// 不使用 lean() - 较慢
const start1 = Date.now();
const users1 = await User.find({}).limit(1000);
console.log(`不使用 lean(): ${Date.now() - start1}ms`);

// 使用 lean() - 较快
const start2 = Date.now();
const users2 = await User.find({}).limit(1000).lean();
console.log(`使用 lean(): ${Date.now() - start2}ms`);
// 通常 lean() 版本快 2-3 倍
```

### 实际应用场景

#### 1. 用户列表查询

```javascript
// 使用 lean() 查询用户列表
const getUsers = async (page = 1, limit = 20) => {
  return await User.find({})
    .select('username email avatar school')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(); // 只读场景，使用 lean()
};
```

#### 2. 排行榜查询

```javascript
// 使用 lean() 查询排行榜
const getLeaderboard = async () => {
  return await User.find({})
    .select('username avatar stats')
    .sort({ 'stats.learningHours': -1 })
    .limit(10)
    .lean(); // 只读场景，使用 lean()
};
```

#### 3. 帖子列表查询

```javascript
// 使用 lean() 查询帖子列表
const getPosts = async (forumId, page = 1) => {
  return await Post.find({ forum: forumId })
    .populate('author', 'username avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * 20)
    .limit(20)
    .lean(); // 只读场景，使用 lean()
};
```

#### 4. 需要修改时，不使用 lean()

```javascript
// ❌ 错误：使用 lean() 后无法保存
const user = await User.findById(userId).lean();
user.username = 'newName';
await user.save(); // ❌ 错误！lean() 返回的对象没有 save() 方法

// ✅ 正确：需要修改时，不使用 lean()
const user = await User.findById(userId);
user.username = 'newName';
await user.save(); // ✅ 正确
```

#### 5. 混合使用：先 lean() 查询，需要时再查询完整文档

```javascript
// 先使用 lean() 快速查询列表
const posts = await Post.find({ forum: forumId })
  .select('title author createdAt')
  .lean();

// 用户点击某个帖子时，再查询完整文档
const getPostDetail = async (postId) => {
  return await Post.findById(postId)
    .populate('author', 'username avatar')
    .populate('replies'); // 需要完整功能，不使用 lean()
};
```

## 与 populate() 一起使用

```javascript
// lean() 可以与 populate() 一起使用
const posts = await Post.find({})
  .populate('author', 'username avatar')
  .populate('forum', 'name')
  .lean(); // ✅ 可以一起使用
```

## 与 select() 一起使用

```javascript
// lean() 与 select() 结合，只返回需要的字段
const users = await User.find({})
  .select('username email avatar') // 只选择需要的字段
  .lean(); // 返回纯对象，性能最优
```

## 注意事项

### 1. lean() 返回的对象没有 Mongoose 方法

```javascript
const user = await User.findById(userId).lean();

// ❌ 这些方法不存在
user.save(); // undefined
user.validate(); // undefined
user.toJSON(); // undefined（但对象本身已经是 JSON）

// ✅ 可以直接操作对象属性
user.username = 'newName'; // 可以，但不会保存到数据库
```

### 2. lean() 不影响 populate()

```javascript
// populate() 仍然可以正常工作
const post = await Post.findById(postId)
  .populate('author')
  .lean();

console.log(post.author.username); // ✅ 可以访问
```

### 3. lean() 与虚拟字段

```javascript
// ❌ lean() 不包含虚拟字段
const user = await User.findById(userId).lean();
console.log(user.fullName); // undefined（如果是虚拟字段）

// ✅ 需要虚拟字段时，不使用 lean()
const user = await User.findById(userId);
console.log(user.fullName); // ✅ 可以访问虚拟字段
```

## 最佳实践

1. **默认使用 lean()**：在只读场景中，优先使用 lean()
2. **明确字段**：使用 `select()` 只查询需要的字段
3. **分页查询**：结合 `skip()` 和 `limit()` 进行分页
4. **索引优化**：确保查询字段有索引
5. **需要修改时**：不使用 lean()，使用完整的 Mongoose 文档

## 性能优化建议

```javascript
// ✅ 最佳实践：lean() + select() + 索引
const getUsers = async () => {
  return await User.find({})
    .select('username email avatar') // 只选择需要的字段
    .sort({ createdAt: -1 }) // 使用索引字段排序
    .limit(20) // 限制返回数量
    .lean(); // 使用 lean() 提高性能
};
```

## 总结

- **使用 lean()**：列表查询、排行榜、统计数据、搜索功能
- **不使用 lean()**：需要修改数据、需要验证、需要中间件、需要虚拟字段

通过合理使用 `lean()`，可以显著提高应用的查询性能！


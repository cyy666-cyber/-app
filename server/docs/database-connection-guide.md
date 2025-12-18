# 数据库连接配置指南

## 连接池配置

### 为什么需要连接池？

- ✅ **提高性能**：复用连接，减少连接建立开销
- ✅ **控制资源**：限制最大连接数，防止资源耗尽
- ✅ **提高稳定性**：自动管理连接，处理连接断开和重连
- ✅ **优化并发**：支持高并发请求

### 配置参数说明

#### 1. 连接池大小

```javascript
maxPoolSize: 10  // 最大连接数（默认 10）
minPoolSize: 2   // 最小连接数（默认 2）
```

**建议值**：
- 小型应用：5-10
- 中型应用：10-20
- 大型应用：20-50

#### 2. 超时配置

```javascript
serverSelectionTimeoutMS: 5000   // 服务器选择超时（5秒）
socketTimeoutMS: 45000          // Socket 超时（45秒）
connectTimeoutMS: 10000         // 连接超时（10秒）
```

#### 3. 空闲连接管理

```javascript
maxIdleTimeMS: 30000  // 最大空闲时间（30秒）
```

空闲连接超过此时间会被关闭，释放资源。

#### 4. 重试配置

```javascript
retryWrites: true  // 启用重试写入
retryReads: true   // 启用重试读取
```

自动重试失败的读写操作，提高可靠性。

## 环境变量配置

在 `server/.env` 中配置：

```env
# MongoDB 连接地址
MONGODB_URI=mongodb://localhost:27017/deepseek-app

# 连接池配置
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME=30000

# 超时配置
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_CONNECT_TIMEOUT=10000
```

## 连接池监控

### 获取连接状态

```javascript
const { getConnectionStatus } = require('./utils/dbMonitor');

const status = getConnectionStatus();
console.log(status);
// {
//   status: 'connected',
//   isConnected: true,
//   readyState: 1
// }
```

### 获取连接池统计

```javascript
const { getPoolStats } = require('./utils/dbMonitor');

const stats = getPoolStats();
console.log(stats);
// {
//   host: 'localhost',
//   port: 27017,
//   name: 'deepseek-app',
//   poolSize: 10,
//   collections: 10,
//   models: 10
// }
```

### 获取性能指标

```javascript
const { getPerformanceMetrics } = require('./utils/dbMonitor');

const metrics = await getPerformanceMetrics();
console.log(metrics);
// {
//   latency: '5ms',
//   status: 'excellent'
// }
```

### 健康检查 API

```bash
# 检查数据库健康状态
curl http://localhost:3001/api/health/db
```

响应示例：
```json
{
  "status": "ok",
  "connection": {
    "status": "connected",
    "isConnected": true
  },
  "pool": {
    "host": "localhost",
    "poolSize": 10
  },
  "performance": {
    "latency": "5ms",
    "status": "excellent"
  }
}
```

## 最佳实践

### 1. 根据应用规模调整连接池大小

```javascript
// 小型应用（< 1000 并发用户）
maxPoolSize: 10
minPoolSize: 2

// 中型应用（1000-10000 并发用户）
maxPoolSize: 20
minPoolSize: 5

// 大型应用（> 10000 并发用户）
maxPoolSize: 50
minPoolSize: 10
```

### 2. 监控连接池使用情况

```javascript
// 定期检查连接池状态
const { startMonitoring } = require('./utils/dbMonitor');

// 每60秒检查一次
const stopMonitoring = startMonitoring(60000);

// 应用关闭时停止监控
process.on('SIGTERM', () => {
  stopMonitoring();
});
```

### 3. 优雅关闭连接

```javascript
const { disconnectDB } = require('./config/database');

// 应用关闭时关闭连接
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});
```

### 4. 处理连接错误

```javascript
mongoose.connection.on('error', (err) => {
  console.error('数据库连接错误:', err);
  // 可以在这里添加错误处理逻辑，如发送告警
});

mongoose.connection.on('disconnected', () => {
  console.warn('数据库连接断开，尝试重连...');
  // Mongoose 会自动重连
});
```

## 性能优化建议

### 1. 合理设置连接池大小

- **太小**：可能导致请求等待，影响性能
- **太大**：浪费资源，可能导致数据库压力过大
- **建议**：根据实际并发量设置，通常为 CPU 核心数的 2-4 倍

### 2. 使用连接池监控

定期检查连接池使用情况，及时发现问题：

```javascript
const stats = getPoolStats();
if (stats.activeConnections > stats.maxPoolSize * 0.8) {
  console.warn('⚠️  连接池使用率超过 80%');
}
```

### 3. 优化查询性能

结合其他优化方法：

```javascript
// 使用 lean() + select() + 缓存
const users = await User.find({})
  .select('username email')
  .lean();
```

### 4. 生产环境配置

```env
# 生产环境推荐配置
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_IDLE_TIME=60000
MONGODB_SERVER_SELECTION_TIMEOUT=10000
MONGODB_SOCKET_TIMEOUT=60000
```

## 故障排查

### 连接池耗尽

**症状**：请求超时，日志显示连接等待

**解决方案**：
1. 增加 `maxPoolSize`
2. 检查是否有连接泄漏
3. 优化查询性能，减少连接占用时间

### 连接超时

**症状**：`serverSelectionTimeoutMS` 超时

**解决方案**：
1. 检查网络连接
2. 增加超时时间
3. 检查 MongoDB 服务器状态

### 连接断开

**症状**：频繁断开重连

**解决方案**：
1. 检查 MongoDB 服务器日志
2. 检查网络稳定性
3. 调整 `maxIdleTimeMS`

## 总结

通过合理配置连接池，可以：

- ✅ 提高应用性能
- ✅ 提高系统稳定性
- ✅ 优化资源使用
- ✅ 支持高并发

记住：连接池大小不是越大越好，要根据实际需求调整！


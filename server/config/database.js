const mongoose = require('mongoose');

/**
 * 连接 MongoDB 数据库
 * 配置了连接池以提高性能和稳定性
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deepseek-app';
    
    const conn = await mongoose.connect(mongoURI, {
      // 连接池配置
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10, // 最大连接数
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,  // 最小连接数
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000, // 最大空闲时间（30秒）
      
      // 服务器选择配置
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000, // 服务器选择超时（5秒）
      
      // Socket 配置
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000, // Socket 超时（45秒）
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000, // 连接超时（10秒）
      
      // 其他配置
      retryWrites: true, // 启用重试写入
      retryReads: true,  // 启用重试读取
      
      // 心跳配置
      heartbeatFrequencyMS: 10000, // 心跳频率（10秒）
    });

    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`📊 数据库名称: ${conn.connection.name}`);
    console.log(`🔗 连接池配置: 最大 ${conn.connection.db?.serverConfig?.options?.maxPoolSize || 10} 个连接`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

/**
 * 优雅关闭数据库连接
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB 连接已关闭');
  } catch (error) {
    console.error('❌ 关闭 MongoDB 连接失败:', error.message);
  }
};

// 处理连接断开事件
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB 连接已断开');
});

// 处理连接错误事件
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err);
});

// 处理连接重连事件
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB 重连成功');
});

// 处理连接打开事件
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB 连接已建立');
});

// 处理连接池满事件
mongoose.connection.on('fullsetup', () => {
  console.log('✅ MongoDB 连接池已满');
});

// 进程退出时关闭连接
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = { connectDB, disconnectDB };


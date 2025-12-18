const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deepseek-app', {
      // MongoDB 8.0 不再需要这些选项，但保留以兼容旧版本
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`📊 数据库名称: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
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

module.exports = connectDB;


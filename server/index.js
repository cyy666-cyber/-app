require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { connectDB } = require('./config/database');
const { initRedis } = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3001;

// 连接数据库（带连接池配置）
connectDB();

// 初始化 Redis（可选，如果 Redis 不可用会继续运行）
initRedis().catch(err => {
  console.log('⚠️  Redis 初始化失败，将不使用缓存功能');
});

// 中间件配置
app.use(cors());
app.use(express.json());

// 路由配置
const authRoutes = require('./routes/authRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);

// 初始化 OpenAI 客户端（DeepSeek API 与 OpenAI 格式完全兼容）
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com', // DeepSeek API 地址
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 数据库健康检查接口
app.get('/api/health/db', async (req, res) => {
  try {
    const { getHealthReport } = require('./utils/dbMonitor');
    const report = await getHealthReport();
    res.json({
      status: report.connection.isConnected ? 'ok' : 'error',
      ...report
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// 获取当前用户信息（已移到 authRoutes.js）

// DeepSeek AI 聊天接口示例
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: message }
      ],
    });

    res.json({
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/deepseek-app'}`);
});


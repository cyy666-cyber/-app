/**
 * 数据库连接监控工具
 * 监控连接池状态和性能指标
 */

const mongoose = require('mongoose');

/**
 * 获取数据库连接状态
 */
const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: states[state] || 'unknown',
    isConnected: state === 1,
    readyState: state
  };
};

/**
 * 获取连接池统计信息
 */
const getPoolStats = () => {
  const connection = mongoose.connection;
  
  return {
    host: connection.host,
    port: connection.port,
    name: connection.name,
    readyState: connection.readyState,
    // 连接池信息（如果可用）
    poolSize: connection.db?.serverConfig?.options?.maxPoolSize || 'N/A',
    // 数据库统计
    collections: Object.keys(connection.collections || {}).length,
    models: Object.keys(connection.models || {}).length
  };
};

/**
 * 监控数据库性能
 */
const getPerformanceMetrics = async () => {
  const connection = mongoose.connection;
  
  try {
    // 执行简单的 ping 操作测试延迟
    const start = Date.now();
    await connection.db.admin().ping();
    const latency = Date.now() - start;

    return {
      latency: `${latency}ms`,
      status: latency < 50 ? 'excellent' : latency < 100 ? 'good' : 'slow'
    };
  } catch (error) {
    return {
      latency: 'N/A',
      status: 'error',
      error: error.message
    };
  }
};

/**
 * 获取完整的数据库健康报告
 */
const getHealthReport = async () => {
  const status = getConnectionStatus();
  const poolStats = getPoolStats();
  const performance = await getPerformanceMetrics();

  return {
    connection: status,
    pool: poolStats,
    performance,
    timestamp: new Date().toISOString()
  };
};

/**
 * 定期监控数据库连接（用于日志记录）
 */
const startMonitoring = (intervalMs = 60000) => {
  const interval = setInterval(async () => {
    const report = await getHealthReport();
    
    if (!report.connection.isConnected) {
      console.warn('⚠️  数据库连接异常:', report);
    }
    
    // 可以在这里添加更多的监控逻辑，如发送到监控系统
  }, intervalMs);

  return () => clearInterval(interval);
};

module.exports = {
  getConnectionStatus,
  getPoolStats,
  getPerformanceMetrics,
  getHealthReport,
  startMonitoring
};


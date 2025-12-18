import { CapacitorConfig } from '@capacitor/cli';

// 开发模式配置 - 连接到 Vite 开发服务器实现实时预览
const config: CapacitorConfig = {
  appId: 'com.deepseek.mobileapp',
  appName: 'DeepSeek Mobile App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 开发服务器地址
    // iOS 模拟器使用 localhost（因为模拟器共享 Mac 的网络）
    // 真实设备需要使用 Mac 的 IP 地址
    url: 'http://localhost:5173',
    cleartext: true // 允许 HTTP 连接（开发环境）
  }
};

export default config;


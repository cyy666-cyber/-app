import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deepseek.mobileapp',
  appName: 'DeepSeek Mobile App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;


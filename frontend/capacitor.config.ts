import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yuvina.app',
  appName: 'Five Cards',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#EAB308'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#040814',
      overlaysWebView: false
    }
  }
};

export default config;

import { Capacitor } from '@capacitor/core';

// On native Android/iOS, always use the production Railway URL.
// On web (browser / Electron), use the env variable or localhost fallback.
export const API_BASE_URL = Capacitor.isNativePlatform() || import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'https://app.remaindo.com')
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001');
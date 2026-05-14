// Central API Configuration
// This ensures that the app always has a valid backend URL, 
// especially when running as a mobile APK.

const VITE_API_URL = import.meta.env.VITE_API_URL;
const PRODUCTION_URL = 'https://remindo-production.up.railway.app';

// In Capacitor/Production, we prefer the production URL if the env var is missing
export const API_URL = VITE_API_URL || PRODUCTION_URL;

console.log('App is using API_URL:', API_URL);

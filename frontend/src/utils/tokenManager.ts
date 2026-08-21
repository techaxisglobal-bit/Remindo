import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
  async setTokens(token: string, refreshToken: string) {
    // Store in capacitor preferences for native mobile persistency
    await Preferences.set({ key: TOKEN_KEY, value: token });
    await Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
    
    // Also store in localStorage as fallback / synchronous access for web
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value || localStorage.getItem(TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    return value || localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async clearTokens() {
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

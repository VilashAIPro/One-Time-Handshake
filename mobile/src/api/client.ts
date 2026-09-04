/**
 * OTH Mobile API Client
 * Axios instance with JWT interceptor, offline detection, and retry logic
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

export const OTHApiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-OTH-Client': 'mobile-v1',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────
OTHApiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('oth_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add device ID header
    const deviceId = await SecureStore.getItemAsync('oth_device_id');
    if (deviceId) {
      config.headers['X-OTH-Device-ID'] = deviceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor (JWT refresh) ──────────────────────────
OTHApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('oth_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const resp = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = resp.data;

        await SecureStore.setItemAsync('oth_access_token', accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return OTHApiClient(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('oth_access_token');
        await SecureStore.deleteItemAsync('oth_refresh_token');
        // Navigate to login — handled by auth store listener
      }
    }

    return Promise.reject(error);
  }
);

// ─── Network Check ────────────────────────────────────────────────
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
}

// ─── Secure Token Storage ─────────────────────────────────────────
export const TokenStorage = {
  async saveTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync('oth_access_token', access),
      SecureStore.setItemAsync('oth_refresh_token', refresh),
    ]);
  },
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync('oth_access_token');
  },
  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync('oth_access_token'),
      SecureStore.deleteItemAsync('oth_refresh_token'),
    ]);
  },
};

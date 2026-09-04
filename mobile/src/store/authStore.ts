/**
 * OTH Auth Store — Zustand
 * Manages authentication state, handshake, and session
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  uid: string;
  phone: string;
  email?: string;
  fullName?: string;
  role: string;
  status: string;
}

export interface AuthState {
  // Auth status
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;

  // Device info
  deviceId: string | null;
  isDeviceBound: boolean;
  isTrustedDevice: boolean;

  // Security
  lastAuthMethod: 'handshake' | 'qr' | 'offline' | 'emergency' | null;
  lastAuthAt: number | null;
  riskScore: number;

  // Offline
  isOfflineMode: boolean;
  offlineToken: string | null;
  offlineExpiresAt: number | null;

  // Actions
  setAuthenticated: (
    user: User,
    accessToken: string,
    refreshToken: string,
    method: AuthState['lastAuthMethod']
  ) => void;
  setDeviceId: (deviceId: string) => void;
  setDeviceBound: (bound: boolean, trusted?: boolean) => void;
  setOfflineToken: (token: string, expiresAt: number) => void;
  setOfflineMode: (offline: boolean) => void;
  setRiskScore: (score: number) => void;
  logout: () => void;
  refreshAccessToken: (newToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      deviceId: null,
      isDeviceBound: false,
      isTrustedDevice: false,
      lastAuthMethod: null,
      lastAuthAt: null,
      riskScore: 0,
      isOfflineMode: false,
      offlineToken: null,
      offlineExpiresAt: null,

      setAuthenticated: (user, accessToken, refreshToken, method) =>
        set({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken,
          tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
          lastAuthMethod: method,
          lastAuthAt: Date.now(),
        }),

      setDeviceId: (deviceId) => set({ deviceId }),

      setDeviceBound: (bound, trusted = false) =>
        set({ isDeviceBound: bound, isTrustedDevice: trusted }),

      setOfflineToken: (token, expiresAt) =>
        set({ offlineToken: token, offlineExpiresAt: expiresAt }),

      setOfflineMode: (offline) => set({ isOfflineMode: offline }),

      setRiskScore: (score) => set({ riskScore: score }),

      refreshAccessToken: (newToken) =>
        set({
          accessToken: newToken,
          tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          lastAuthMethod: null,
          riskScore: 0,
          offlineToken: null,
          offlineExpiresAt: null,
          isOfflineMode: false,
        }),
    }),
    {
      name: 'oth-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist only non-sensitive state
        user: state.user,
        deviceId: state.deviceId,
        isDeviceBound: state.isDeviceBound,
        isTrustedDevice: state.isTrustedDevice,
        lastAuthAt: state.lastAuthAt,
      }),
    }
  )
);

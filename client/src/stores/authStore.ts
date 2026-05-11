import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { useChatStore } from './chatStore';

interface User {
  id: string;
  username: string;
  publicKey?: string;
  friendCode: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User | null, accessToken: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, publicKey?: string) => Promise<{ recoveryKey: string }>;
  recoverAccount: (username: string, recoveryKey: string, newPassword: string) => Promise<void>;
  deviceLogin: () => Promise<void>;
  logout: () => Promise<void>;
  clearData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      
      deviceLogin: async () => {
        let deviceId = localStorage.getItem('tod-device-id');
        if (!deviceId) {
          deviceId = window.crypto.randomUUID();
          localStorage.setItem('tod-device-id', deviceId);
        }

        const response = await api.post('/auth/device-login', { deviceId });
        const { user, accessToken } = response.data;
        set({ user, accessToken });
      },

      login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        const { user, accessToken } = response.data;
        set({ user, accessToken });
      },

      register: async (username, password, publicKey) => {
        const response = await api.post('/auth/register', { username, password, publicKey });
        const { user, accessToken, recoveryKey } = response.data;
        set({ user, accessToken });
        return { recoveryKey };
      },

      recoverAccount: async (username, recoveryKey, newPassword) => {
        await api.post('/auth/recover', { username, recoveryKey, newPassword });
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        useChatStore.getState().reset();
        set({ user: null, accessToken: null });
      },

      clearData: async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        localStorage.removeItem('tod-device-id');
        useChatStore.getState().reset();
        set({ user: null, accessToken: null });
      },

      deleteAccount: async () => {
        await api.delete('/auth/account');
        useChatStore.getState().reset();
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'tod-auth',
    }
  )
);

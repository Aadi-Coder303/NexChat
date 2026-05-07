import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User | null, accessToken: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<{ recoveryKey: string }>;
  recoverAccount: (username: string, recoveryKey: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      
      login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        const { user, accessToken } = response.data;
        set({ user, accessToken });
      },

      register: async (username, password) => {
        const response = await api.post('/auth/register', { username, password });
        const { user, accessToken, recoveryKey } = response.data;
        set({ user, accessToken });
        return { recoveryKey };
      },

      recoverAccount: async (username, recoveryKey, newPassword) => {
        await api.post('/auth/recover', { username, recoveryKey, newPassword });
      },

      logout: async () => {
        await api.post('/auth/logout');
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'nexchat-auth',
    }
  )
);

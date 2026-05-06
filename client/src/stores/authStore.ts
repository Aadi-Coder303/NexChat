import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User | null, accessToken: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken } = response.data;
    set({ user, accessToken });
  },

  register: async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    const { user, accessToken } = response.data;
    set({ user, accessToken });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, accessToken: null });
  },
}));

import { create } from 'zustand';
import api from '../lib/api';

export interface Channel {
  id: string;
  name: string;
  type: 'direct' | 'group';
  inviteCode?: string | null;
  createdById?: string | null;
  members?: {
    user: {
      id: string;
      username: string;
      publicKey?: string;
    };
  }[];
  _count?: { messages: number };
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  isEncrypted?: boolean;
  encryptionData?: any;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | null;
    publicKey?: string;
  };
  clientTempId?: string;
}

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: Record<string, 'online' | 'offline'>;
  isLoadingChannels: boolean;

  fetchChannels: () => Promise<void>;
  setActiveChannel: (id: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessageId: (channelId: string, clientTempId: string, serverId: string) => void;
  setOnlineStatus: (userId: string, status: 'online' | 'offline') => void;
  createChannel: (name: string, type: 'direct' | 'group', memberIds: string[]) => Promise<void>;
  connectByCode: (code: string) => Promise<void>;
  joinByInviteCode: (code: string) => Promise<void>;
  generateInviteCode: (channelId: string) => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  activeChannelId: null,
  messages: {},
  onlineUsers: {},
  isLoadingChannels: false,

  fetchChannels: async () => {
    set({ isLoadingChannels: true });
    try {
      const response = await api.get('/channels');
      set({ channels: response.data, isLoadingChannels: false });
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      set({ isLoadingChannels: false });
    }
  },

  setActiveChannel: (id) => {
    set({ activeChannelId: id });
    const { messages } = get();
    if (!messages[id]) {
      get().fetchMessages(id);
    }
  },

  fetchMessages: async (channelId) => {
    try {
      const response = await api.get(`/channels/${channelId}/messages`);
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.data.reverse(),
        },
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  addMessage: (channelId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    }));
  },

  updateMessageId: (channelId, clientTempId, serverId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId].map((msg) =>
          msg.clientTempId === clientTempId ? { ...msg, id: serverId, clientTempId: undefined } : msg
        ),
      },
    }));
  },

  setOnlineStatus: (userId, status) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: status,
      },
    }));
  },

  createChannel: async (name, type, memberIds) => {
    try {
      const response = await api.post('/channels', { name, type, memberIds });
      set((state) => ({
        channels: [response.data, ...state.channels],
      }));
      get().setActiveChannel(response.data.id);
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  },

  connectByCode: async (code: string) => {
    try {
      const response = await api.post('/channels/connect', { code });
      set((state) => ({
        channels: [response.data, ...state.channels],
      }));
      get().setActiveChannel(response.data.id);
    } catch (error: any) {
      console.error('Failed to connect by code:', error);
      throw error;
    }
  },

  joinByInviteCode: async (code: string) => {
    try {
      const response = await api.post('/channels/join', { code });
      set((state) => ({
        channels: [response.data, ...state.channels],
      }));
      get().setActiveChannel(response.data.id);
    } catch (error: any) {
      console.error('Failed to join by invite code:', error);
      throw error;
    }
  },

  generateInviteCode: async (channelId: string) => {
    const response = await api.post(`/channels/${channelId}/invite`);
    // Update channel in store with new invite code
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, inviteCode: response.data.code } : c
      ),
    }));
    return response.data.code;
  },
}));

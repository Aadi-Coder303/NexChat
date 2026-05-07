import { create } from 'zustand';
import api from '../lib/api';

export interface Channel {
  id: string;
  name: string;
  type: 'direct' | 'group';
  _count?: { messages: number };
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  clientTempId?: string;
}

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Record<string, Message[]>; // channelId -> Message[]
  onlineUsers: Record<string, 'online' | 'offline'>;
  isLoadingChannels: boolean;
  
  fetchChannels: () => Promise<void>;
  setActiveChannel: (id: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessageId: (channelId: string, clientTempId: string, serverId: string) => void;
  setOnlineStatus: (userId: string, status: 'online' | 'offline') => void;
  createChannel: (name: string, type: 'direct' | 'group', memberIds: string[]) => Promise<void>;
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
          [channelId]: response.data.reverse(), // Reverse because API returns desc, we want asc for chat UI
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
}));

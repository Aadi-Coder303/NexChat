import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { username: string };
}

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
  deletedAt?: string | null;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    deletedAt?: string | null;
    sender: { id: string; username: string };
  } | null;
  reactions?: Reaction[];
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
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, string[]>; // channelId -> userIds typing
  hasMoreMessages: Record<string, boolean>;
  isLoadingChannels: boolean;
  sessionSyncToggle: boolean;

  fetchChannels: () => Promise<void>;
  setActiveChannel: (id: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  loadMoreMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  handleNewSession: (channelId: string, session: any) => void;
  deleteMessageLocally: (channelId: string, messageId: string, updatedMessage: Message) => void;
  updateReactions: (channelId: string, messageId: string, reactions: Reaction[]) => void;
  updateMessageId: (channelId: string, clientTempId: string, serverId: string, serverMessage?: Message) => void;
  setOnlineStatus: (userId: string, status: 'online' | 'offline') => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  markChannelRead: (channelId: string) => void;
  incrementUnread: (channelId: string) => void;
  createChannel: (name: string, type: 'direct' | 'group', memberIds: string[]) => Promise<void>;
  connectByCode: (code: string) => Promise<void>;
  joinByInviteCode: (code: string) => Promise<void>;
  generateInviteCode: (channelId: string) => Promise<string>;
  leaveChannel: (channelId: string) => Promise<void>;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      channels: [],
      activeChannelId: null,
      messages: {},
      onlineUsers: {},
      unreadCounts: {},
      typingUsers: {},
      hasMoreMessages: {},
      isLoadingChannels: false,
      sessionSyncToggle: false,

      fetchChannels: async () => {
        set({ isLoadingChannels: true });
        try {
          const response = await api.get('/channels');
          const channels = response.data;
          set({ channels, isLoadingChannels: false });
          // Prefetch messages for ALL channels so they're ready after re-login
          for (const ch of channels) {
            if (!get().messages[ch.id]) {
              try {
                const msgRes = await api.get(`/channels/${ch.id}/messages`);
                const msgs: Message[] = msgRes.data.reverse();
                set((state) => ({
                  messages: { ...state.messages, [ch.id]: msgs },
                  hasMoreMessages: { ...state.hasMoreMessages, [ch.id]: msgs.length === 50 },
                }));
              } catch { /* skip failed channel */ }
            }
          }
        } catch (error) {
          console.error('Failed to fetch channels:', error);
          set({ isLoadingChannels: false });
        }
      },

      setActiveChannel: (id) => {
        set({ activeChannelId: id });
        get().markChannelRead(id);
        if (!get().messages[id]) {
          get().fetchMessages(id);
        }
      },

      fetchMessages: async (channelId) => {
        try {
          const response = await api.get(`/channels/${channelId}/messages`);
          const msgs: Message[] = response.data.reverse();
          set((state) => ({
            messages: { ...state.messages, [channelId]: msgs },
            hasMoreMessages: { ...state.hasMoreMessages, [channelId]: msgs.length === 50 },
          }));
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      },

      loadMoreMessages: async (channelId) => {
        const existing = get().messages[channelId] || [];
        if (existing.length === 0) return;
        const cursor = existing[0].id;
        try {
          const response = await api.get(`/channels/${channelId}/messages?cursor=${cursor}&limit=50`);
          const older: Message[] = response.data.reverse();
          set((state) => ({
            messages: { ...state.messages, [channelId]: [...older, ...existing] },
            hasMoreMessages: { ...state.hasMoreMessages, [channelId]: older.length === 50 },
          }));
        } catch (error) {
          console.error('Failed to load more messages:', error);
        }
      },

      addMessage: (channelId, message) => {
        const activeId = get().activeChannelId;
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: [...(state.messages[channelId] || []), message],
          },
          unreadCounts: {
            ...state.unreadCounts,
            [channelId]: activeId === channelId ? 0 : (state.unreadCounts[channelId] || 0) + 1,
          },
        }));
      },

      handleNewSession: (channelId, session) => {
        // Toggle the sync state so ChatLayout's useEffect gets re-triggered
        set((state) => ({ sessionSyncToggle: !state.sessionSyncToggle }));
      },

      deleteMessageLocally: (channelId, messageId, updatedMessage) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) =>
              m.id === messageId ? { ...m, ...updatedMessage } : m
            ),
          },
        }));
      },

      updateReactions: (channelId, messageId, reactions) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          },
        }));
      },

      updateMessageId: (channelId, clientTempId, serverId, serverMessage) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((msg) =>
              msg.clientTempId === clientTempId
                ? serverMessage
                  ? { ...serverMessage, clientTempId: undefined }
                  : { ...msg, id: serverId, clientTempId: undefined }
                : msg
            ),
          },
        }));
      },

      setOnlineStatus: (userId, status) => {
        set((state) => ({ onlineUsers: { ...state.onlineUsers, [userId]: status } }));
      },

      setTyping: (channelId, userId, isTyping) => {
        set((state) => {
          const current = state.typingUsers[channelId] || [];
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: isTyping
                ? current.includes(userId) ? current : [...current, userId]
                : current.filter((id) => id !== userId),
            },
          };
        });
      },

      markChannelRead: (channelId) => {
        set((state) => ({ unreadCounts: { ...state.unreadCounts, [channelId]: 0 } }));
      },

      incrementUnread: (channelId) => {
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [channelId]: (state.unreadCounts[channelId] || 0) + 1 },
        }));
      },

      createChannel: async (name, type, memberIds) => {
        const response = await api.post('/channels', { name, type, memberIds });
        set((state) => ({ channels: [response.data, ...state.channels] }));
        get().setActiveChannel(response.data.id);
      },

      connectByCode: async (code) => {
        const response = await api.post('/channels/connect', { code });
        set((state) => ({ channels: [response.data, ...state.channels] }));
        get().setActiveChannel(response.data.id);
      },

      joinByInviteCode: async (code) => {
        const response = await api.post('/channels/join', { code });
        set((state) => ({ channels: [response.data, ...state.channels] }));
        get().setActiveChannel(response.data.id);
      },

      generateInviteCode: async (channelId) => {
        const response = await api.post(`/channels/${channelId}/invite`);
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channelId ? { ...c, inviteCode: response.data.code } : c
          ),
        }));
        return response.data.code;
      },

      leaveChannel: async (channelId) => {
        await api.delete(`/channels/${channelId}/leave`);
        set((state) => {
          const channels = state.channels.filter((c) => c.id !== channelId);
          return {
            channels,
            activeChannelId: state.activeChannelId === channelId ? (channels[0]?.id || null) : state.activeChannelId,
          };
        });
      },

      reset: () => set({
        channels: [],
        activeChannelId: null,
        messages: {},
        onlineUsers: {},
        unreadCounts: {},
        typingUsers: {},
        hasMoreMessages: {},
        isLoadingChannels: false,
      }),
    }),
    {
      name: 'nexchat-chat',
      // Only persist channels list — messages are always re-fetched fresh
      partialize: (state) => ({ channels: state.channels }),
    }
  )
);

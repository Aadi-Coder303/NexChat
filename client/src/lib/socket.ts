import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { CryptoEngine } from './crypto';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.socket) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      const activeChannel = useChatStore.getState().activeChannelId;
      if (activeChannel) this.joinChannel(activeChannel);
    });

    // New message from another user
    this.socket.on('message:new', (message) => {
      useChatStore.getState().addMessage(message.channelId, message);
    });

    // ACK from server after our optimistic send — update temp ID with real data
    this.socket.on('message:ack', ({ clientTempId, serverId, message }) => {
      const activeChannel = useChatStore.getState().activeChannelId;
      if (activeChannel) {
        useChatStore.getState().updateMessageId(activeChannel, clientTempId, serverId, message);
      }
    });

    // Message deleted
    this.socket.on('message:deleted', ({ channelId, messageId, message }) => {
      useChatStore.getState().deleteMessageLocally(channelId, messageId, message);
    });

    // Channel created (DM) — refresh sidebar AND join the new socket room immediately
    // so we receive messages sent before we re-open the app
    this.socket.on('channel:created', (channel: { id: string }) => {
      useChatStore.getState().fetchChannels();
      if (channel?.id) {
        // Emit join so the server adds this socket to the channel room
        this.socket?.emit('channel:join', { channelId: channel.id });
      }
    });

    // New member joined channel
    this.socket.on('channel:member_joined', () => {
      useChatStore.getState().fetchChannels(); // Refresh channel members
    });

    // Bulk message delete (from delete-all-messages setting)
    this.socket.on('messages:bulk_deleted', ({ userId }: { userId: string }) => {
      useChatStore.getState().bulkDeleteUserMessages(userId);
    });

    // New session key published by a peer
    this.socket.on('session:new', async ({ channelId, session }) => {
      const { user } = useAuthStore.getState();
      // Only act on keys published by OTHER users (not echoes of our own publish)
      if (session.userId !== user?.id) {
        // Invalidate our cached session key so initSession re-derives from the new peer key
        await CryptoEngine.clearSessionKey(channelId);
        // Re-trigger session negotiation in ChatLayout
        useChatStore.getState().handleNewSession(channelId, session);
      }
    });

    // Reaction toggled
    this.socket.on('message:reaction', ({ channelId, messageId, reactions }) => {
      useChatStore.getState().updateReactions(channelId, messageId, reactions);
    });

    // Typing indicators
    this.socket.on('typing:update', ({ channelId, userId, isTyping }) => {
      useChatStore.getState().setTyping(channelId, userId, isTyping);
    });

    this.socket.on('presence:update', ({ userId, status }) => {
      useChatStore.getState().setOnlineStatus(userId, status);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChannel(channelId: string) {
    this.socket?.connected && this.socket.emit('channel:join', { channelId });
  }

  leaveChannel(channelId: string) {
    this.socket?.connected && this.socket.emit('channel:leave', { channelId });
  }

  sendMessage(channelId: string, content: string, encryptionData?: any, replyToId?: string) {
    if (!this.socket?.connected) return;
    const clientTempId = Math.random().toString(36).substring(7);

    this.socket.emit('message:send', { channelId, content, clientTempId, isEncrypted: !!encryptionData, encryptionData, replyToId });

    // Optimistic UI — show plaintext immediately for the sender.
    // The server message:ack will replace this with the real encrypted message.
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useChatStore.getState().addMessage(channelId, {
        id: clientTempId,
        content,          // raw plaintext — only ever shown to sender pre-ack
        channelId,
        senderId: currentUser.id,
        isEncrypted: false,  // never try to decrypt the optimistic copy
        encryptionData: undefined,
        replyToId: replyToId || null,
        createdAt: new Date().toISOString(),
        reactions: [],
        sender: { id: currentUser.id, username: currentUser.username, avatarUrl: null },
        clientTempId,
      });
    }
  }

  deleteMessage(channelId: string, messageId: string) {
    this.socket?.emit('message:delete', { channelId, messageId });
  }

  reactToMessage(channelId: string, messageId: string, emoji: string) {
    this.socket?.emit('message:react', { channelId, messageId, emoji });
  }

  // Debounced typing indicator — auto-stops after 2s of no keystrokes
  emitTyping(channelId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', { channelId });
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.socket?.emit('typing:stop', { channelId });
    }, 2000);
  }

  stopTyping(channelId: string) {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.socket?.emit('typing:stop', { channelId });
  }

  setPresence(status: 'online' | 'idle' | 'offline') {
    this.socket?.connected && this.socket.emit('presence:set', { status });
  }
}

export const socketService = new SocketService();

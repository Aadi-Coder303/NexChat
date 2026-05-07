import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      // Re-join active channel on reconnect
      const activeChannel = useChatStore.getState().activeChannelId;
      if (activeChannel) {
        this.joinChannel(activeChannel);
      }
    });

    this.socket.on('message:new', (message) => {
      useChatStore.getState().addMessage(message.channelId, message);
    });

    this.socket.on('message:ack', ({ clientTempId, serverId }) => {
      const activeChannel = useChatStore.getState().activeChannelId;
      if (activeChannel) {
        useChatStore.getState().updateMessageId(activeChannel, clientTempId, serverId);
      }
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
    if (this.socket?.connected) {
      this.socket.emit('channel:join', { channelId });
    }
  }

  leaveChannel(channelId: string) {
    if (this.socket?.connected) {
      this.socket.emit('channel:leave', { channelId });
    }
  }

  sendMessage(channelId: string, content: string) {
    if (!this.socket?.connected) return;

    const clientTempId = Math.random().toString(36).substring(7);
    
    // Emit to server
    this.socket.emit('message:send', { channelId, content, clientTempId });

    // Optimistic UI update
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useChatStore.getState().addMessage(channelId, {
        id: clientTempId, // Temporary ID until server ACKs
        content,
        channelId,
        senderId: currentUser.id,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          username: currentUser.username,
          avatarUrl: null,
        },
        clientTempId,
      });
    }
  }
}

export const socketService = new SocketService();

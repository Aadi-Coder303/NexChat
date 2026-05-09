import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { MessageService } from '../services/message.service';
import { PresenceService, type PresenceStatus } from '../services/presence.service';

const rateLimitTracker = new Map<string, number[]>();

const checkRateLimit = (socketId: string) => {
  const now = Date.now();
  let timestamps = rateLimitTracker.get(socketId) || [];
  timestamps = timestamps.filter(t => now - t < 10000); // last 10 seconds
  timestamps.push(now);
  rateLimitTracker.set(socketId, timestamps);
  
  if (timestamps.length > 20) {
    return false; // Limit exceeded (max 20 msgs / 10s)
  }
  return true;
};

export const setupSocketHandlers = (io: Server) => {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));
    const payload = verifyAccessToken(token);
    if (!payload) return next(new Error('Authentication error: Invalid token'));
    (socket as any).userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`👤 User connected: ${userId}`);

    PresenceService.setOnline(userId).then(() => {
      io.emit('presence:update', { userId, status: 'online' });
    });

    socket.join(`user:${userId}`);

    // Auto-join all channels the user is a member of so they receive all messages
    prisma.channelMember.findMany({ where: { userId } }).then(memberships => {
      memberships.forEach(m => socket.join(`channel:${m.channelId}`));
    });

    socket.on('heartbeat', async () => {
      // Only refresh if not in idle/offline override mode
      const current = await PresenceService.getStatus(userId);
      if (current === 'online') {
        await PresenceService.setOnline(userId);
      }
    });

    // Manual presence override (online | idle | offline)
    socket.on('presence:set', async ({ status }: { status: PresenceStatus }) => {
      if (!['online', 'idle', 'offline'].includes(status)) return;
      await PresenceService.setStatus(userId, status);
      io.emit('presence:update', { userId, status });
    });

    // Also allow joining new channels dynamically if they are added
    socket.on('channel:join', async ({ channelId }) => {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
      });
      if (membership) {
        socket.join(`channel:${channelId}`);
      }
    });

    // Send a new message
    socket.on('message:send', async ({ channelId, content, clientTempId, isEncrypted, encryptionData, replyToId }) => {
      if (!checkRateLimit(socket.id)) return socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      try {
        const message = await MessageService.sendMessage(channelId, userId, content, isEncrypted, encryptionData, replyToId);
        // Send to others in the channel
        socket.to(`channel:${channelId}`).emit('message:new', message);
        // ACK back to sender with the real server ID
        socket.emit('message:ack', { clientTempId, serverId: message.id, message });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Delete a message
    socket.on('message:delete', async ({ messageId, channelId }) => {
      try {
        const message = await MessageService.deleteMessage(messageId, userId);
        io.to(`channel:${channelId}`).emit('message:deleted', { messageId, channelId, message });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });


    // Toggle a reaction
    socket.on('message:react', async ({ messageId, channelId, emoji }) => {
      try {
        const result = await MessageService.toggleReaction(messageId, userId, emoji);
        io.to(`channel:${channelId}`).emit('message:reaction', { ...result, channelId });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, isTyping: true });
    });

    socket.on('typing:stop', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, isTyping: false });
    });

    socket.on('disconnect', async () => {
      rateLimitTracker.delete(socket.id);
      console.log(`👋 User disconnected: ${userId}`);
      await PresenceService.setOffline(userId);
      io.emit('presence:update', { userId, status: 'offline' });
    });
  });
};

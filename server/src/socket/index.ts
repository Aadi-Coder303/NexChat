import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { MessageService } from '../services/message.service';
import { PresenceService } from '../services/presence.service';

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // Attach user ID to the socket
    (socket as any).userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`👤 User connected: ${userId}`);

    // Set online and broadcast
    PresenceService.setOnline(userId).then(() => {
      io.emit('presence:update', { userId, status: 'online' });
    });

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    socket.on('heartbeat', async () => {
      await PresenceService.setOnline(userId);
    });

    socket.on('channel:join', async ({ channelId }) => {
      // Verify membership
      const membership = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId,
          },
        },
      });

      if (!membership) {
        return socket.emit('error', { message: 'You are not a member of this channel' });
      }

      socket.join(`channel:${channelId}`);
      console.log(`📣 User ${userId} joined channel: ${channelId}`);
    });

    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
      console.log(`📣 User ${userId} left channel: ${channelId}`);
    });

    socket.on('message:send', async ({ channelId, content, clientTempId, isEncrypted, encryptionData }) => {
      try {
        const message = await MessageService.sendMessage(channelId, userId, content, isEncrypted, encryptionData);

        // Broadcast to everyone EXCEPT the sender (they already have the optimistic message)
        socket.to(`channel:${channelId}`).emit('message:new', message);

        // Send ACK back to sender with the real server ID
        socket.emit('message:ack', { clientTempId, serverId: message.id });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('typing:start', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, isTyping: true });
    });

    socket.on('typing:stop', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, isTyping: false });
    });

    socket.on('disconnect', async () => {
      console.log(`👋 User disconnected: ${userId}`);
      await PresenceService.setOffline(userId);
      io.emit('presence:update', { userId, status: 'offline' });
    });
  });
};

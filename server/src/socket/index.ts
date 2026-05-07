import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { MessageService } from '../services/message.service';
import { PresenceService } from '../services/presence.service';

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

    socket.on('heartbeat', async () => {
      await PresenceService.setOnline(userId);
    });

    socket.on('channel:join', async ({ channelId }) => {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
      });
      if (!membership) return socket.emit('error', { message: 'Not a member of this channel' });
      socket.join(`channel:${channelId}`);
      console.log(`📣 User ${userId} joined channel: ${channelId}`);
    });

    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    // Send a new message
    socket.on('message:send', async ({ channelId, content, clientTempId, isEncrypted, encryptionData, replyToId }) => {
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

    // Edit a message
    socket.on('message:edit', async ({ messageId, channelId, content }) => {
      try {
        const message = await MessageService.editMessage(messageId, userId, content);
        io.to(`channel:${channelId}`).emit('message:edited', { messageId, channelId, message });
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
      console.log(`👋 User disconnected: ${userId}`);
      await PresenceService.setOffline(userId);
      io.emit('presence:update', { userId, status: 'offline' });
    });
  });
};

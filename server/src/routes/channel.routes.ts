import { Router } from 'express';
import { MessageService } from '../services/message.service';
import { ChannelService } from '../services/channel.service';
import { prisma } from '../lib/prisma';

const router = Router();

// Get user's channels
router.get('/', async (req: any, res, next) => {
  try {
    const channels = await ChannelService.getUserChannels(req.userId);
    res.json(channels);
  } catch (error: any) {
    next(error);
  }
});

// Create a new channel
router.post('/', async (req: any, res, next) => {
  try {
    const { name, type, memberIds } = req.body;
    const channel = await ChannelService.createChannel(name, type, req.userId, memberIds || [req.userId]);
    res.status(201).json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Connect with a friend via NexCode (DM)
router.post('/connect', async (req: any, res, next) => {
  try {
    const { code } = req.body;
    const friend = await prisma.user.findUnique({
      where: { friendCode: code.toUpperCase() },
      select: { id: true, username: true },
    });
    if (!friend) return res.status(404).json({ error: 'Identity not found in the void' });
    if (friend.id === req.userId) return res.status(400).json({ error: 'You cannot connect with your own apparition' });
    const channel = await ChannelService.createChannel(friend.username, 'direct', req.userId, [req.userId, friend.id]);
    
    // Notify the other user that a new channel was created and they were added
    req.app.get('io')?.to(`user:${friend.id}`).emit('channel:created', channel);
    
    res.status(201).json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Join a group channel via invite code
router.post('/join', async (req: any, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Invite code is required' });
    const channel = await ChannelService.joinByInviteCode(code.trim(), req.userId);
    
    // Notify existing members that someone joined
    const newMember = channel?.members?.find((m: any) => m.userId === req.userId);
    if (newMember) {
      req.app.get('io')?.to(`channel:${channel.id}`).emit('channel:member_joined', { channelId: channel.id, member: newMember });
    }
    
    res.status(200).json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Accept a channel request
router.post('/:id/accept', async (req: any, res, next) => {
  try {
    const channel = await ChannelService.acceptRequest(req.params.id, req.userId);
    res.json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Decline a channel request
router.post('/:id/decline', async (req: any, res, next) => {
  try {
    const result = await ChannelService.declineRequest(req.params.id, req.userId);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// Generate (or fetch existing) invite code for a group channel
router.post('/:id/invite', async (req: any, res, next) => {
  try {
    const code = await ChannelService.generateInviteCode(req.params.id, req.userId);
    res.json({ code });
  } catch (error: any) {
    next(error);
  }
});

// Publish this user's ephemeral ECDH public key for forward secrecy
router.post('/:id/session', async (req: any, res, next) => {
  try {
    const { ephemeralPubKey } = req.body;
    if (!ephemeralPubKey) return res.status(400).json({ error: 'ephemeralPubKey is required' });
    // Verify user is a member
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: req.params.id, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this channel' });

    const session = await (prisma.channelSession as any).upsert({
      where: { channelId_userId: { channelId: req.params.id, userId: req.userId } },
      create: { channelId: req.params.id, userId: req.userId, ephemeralPubKey },
      update: { ephemeralPubKey },
    });
    
    // Broadcast the new session key to other members in the channel so they can instantly derive the AES key
    req.app.get('io')?.to(`channel:${req.params.id}`).emit('session:new', { channelId: req.params.id, session });
    
    res.json(session);
  } catch (error: any) {
    next(error);
  }
});

// Get all parties' ephemeral ECDH public keys for a channel
router.get('/:id/session', async (req: any, res, next) => {
  try {
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: req.params.id, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this channel' });

    const sessions = await (prisma.channelSession as any).findMany({
      where: { channelId: req.params.id },
      select: { userId: true, ephemeralPubKey: true, updatedAt: true },
    });
    res.json(sessions);
  } catch (error: any) {
    next(error);
  }
});

// Leave a channel
router.delete('/:id/leave', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: req.userId } },
    });
    if (!member) return res.status(404).json({ error: 'You are not in this channel' });
    await prisma.channelMember.delete({ where: { channelId_userId: { channelId: id, userId: req.userId } } });
    res.json({ ok: true });
  } catch (error: any) {
    next(error);
  }
});

// Get messages for a channel (paginated)
router.get('/:id/messages', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;
    const messages = await MessageService.getMessages(id, req.userId, cursor as string, limit ? parseInt(limit as string) : 50);
    res.json(messages);
  } catch (error: any) {
    next(error);
  }
});

// Delete a message (soft delete)
router.delete('/:channelId/messages/:messageId', async (req: any, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await MessageService.deleteMessage(messageId, req.userId);
    res.json(message);
  } catch (error: any) {
    next(error);
  }
});

// Edit a message
router.put('/:channelId/messages/:messageId', async (req: any, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
    const message = await MessageService.editMessage(messageId, req.userId, content.trim());
    res.json(message);
  } catch (error: any) {
    next(error);
  }
});

// Toggle reaction on a message
router.post('/:channelId/messages/:messageId/react', async (req: any, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });
    const result = await MessageService.toggleReaction(messageId, req.userId, emoji);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;

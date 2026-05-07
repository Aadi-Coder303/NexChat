import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

const MESSAGE_SELECT = {
  id: true,
  channelId: true,
  senderId: true,
  content: true,
  isEncrypted: true,
  encryptionData: true,
  metadata: true,
  readBy: true,
  deletedAt: true,
  editedAt: true,
  replyToId: true,
  createdAt: true,
  sender: {
    select: { id: true, username: true, avatarUrl: true, publicKey: true },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      deletedAt: true,
      sender: { select: { id: true, username: true } },
    },
  },
  reactions: {
    select: { id: true, emoji: true, userId: true, user: { select: { username: true } } },
  },
};

export class MessageService {
  static async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    isEncrypted: boolean = false,
    encryptionData?: any,
    replyToId?: string,
  ) {
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: senderId } },
    });
    if (!membership) throw new AppError('Not a member of this channel', 403);

    const message = await (prisma.message as any).create({
      data: { channelId, senderId, content, isEncrypted, encryptionData: encryptionData || {}, replyToId: replyToId || null },
      select: MESSAGE_SELECT,
    });
    return message;
  }

  static async getMessages(channelId: string, userId: string, cursor?: string, limit: number = 50) {
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!membership) throw new AppError('Not a member of this channel', 403);

    const messages = await (prisma.message as any).findMany({
      where: { channelId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: MESSAGE_SELECT,
    });
    return messages;
  }

  static async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('You can only delete your own messages', 403);

    const updated = await (prisma.message as any).update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '[Message deleted]' },
      select: MESSAGE_SELECT,
    });
    return updated;
  }

  static async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('You can only edit your own messages', 403);
    if ((message as any).deletedAt) throw new AppError('Cannot edit a deleted message', 400);

    const updated = await (prisma.message as any).update({
      where: { id: messageId },
      data: { content: newContent, editedAt: new Date() },
      select: MESSAGE_SELECT,
    });
    return updated;
  }

  static async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existing = await (prisma.reaction as any).findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await (prisma.reaction as any).delete({ where: { messageId_userId_emoji: { messageId, userId, emoji } } });
    } else {
      await (prisma.reaction as any).create({ data: { messageId, userId, emoji } });
    }

    // Return updated reactions for this message
    const reactions = await (prisma.reaction as any).findMany({
      where: { messageId },
      select: { id: true, emoji: true, userId: true, user: { select: { username: true } } },
    });
    return { messageId, reactions };
  }
}

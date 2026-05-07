import { prisma } from '../lib/prisma';

export class MessageService {
  static async sendMessage(channelId: string, senderId: string, content: string) {
    // Verify membership
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: senderId,
        },
      },
    });

    if (!membership) {
      throw new Error('User is not a member of this channel');
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return message;
  }

  static async getMessages(channelId: string, userId: string, cursor?: string, limit: number = 50) {
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
      throw new Error('User is not a member of this channel');
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messages;
  }
}

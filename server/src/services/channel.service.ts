import { prisma } from '../lib/prisma';

export class ChannelService {
  static async createChannel(name: string, type: 'direct' | 'group', createdBy: string, memberIds: string[]) {
    // If direct message, check if it already exists
    if (type === 'direct' && memberIds.length === 2) {
      const existing = await prisma.channel.findFirst({
        where: {
          type: 'direct',
          AND: [
            { members: { some: { userId: memberIds[0] } } },
            { members: { some: { userId: memberIds[1] } } },
          ],
        },
        include: {
          members: true,
        },
      });

      if (existing) return existing;
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        createdById: createdBy,
        members: {
          create: memberIds.map((userId) => ({
            userId,
            role: userId === createdBy ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: true,
      },
    });

    return channel;
  }

  static async getUserChannels(userId: string) {
    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return channels;
  }
}

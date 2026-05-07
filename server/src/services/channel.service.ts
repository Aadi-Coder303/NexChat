import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { AppError } from '../utils/errors';

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
          members: {
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, publicKey: true },
              },
            },
          },
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
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, publicKey: true },
            },
          },
        },
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
                publicKey: true,
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

  static async generateInviteCode(channelId: string, requesterId: string): Promise<string> {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });

    if (!channel) throw new AppError('Channel not found', 404);
    if (channel.type !== 'group') throw new AppError('Invite codes are only for group channels', 400);

    const isMember = channel.members.some((m) => m.userId === requesterId);
    if (!isMember) throw new AppError('You are not a member of this channel', 403);

    // Reuse existing or generate fresh
    const existingCode = (channel as any).inviteCode;
    if (existingCode) return existingCode;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await (prisma.channel as any).update({
      where: { id: channelId },
      data: { inviteCode: code },
    });

    return code;
  }

  static async joinByInviteCode(code: string, userId: string) {
    const channel = await (prisma.channel as any).findFirst({
      where: { inviteCode: code.toUpperCase() },
      include: { members: true },
    }) as any;

    if (!channel) throw new AppError('Invalid invite code', 404);
    if (channel.type !== 'group') throw new AppError('This code is not for a group', 400);

    const alreadyMember = (channel.members as any[]).some((m: any) => m.userId === userId);
    if (alreadyMember) throw new AppError('You are already in this group', 400);

    await prisma.channelMember.create({
      data: { channelId: channel.id, userId, role: 'member' },
    });

    return prisma.channel.findUnique({
      where: { id: channel.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, publicKey: true },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });
  }
}


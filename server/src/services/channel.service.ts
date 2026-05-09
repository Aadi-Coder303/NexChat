import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import argon2 from 'argon2';
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
            status: type === 'direct' && userId !== createdBy ? 'pending' : 'accepted',
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
  static async acceptRequest(channelId: string, userId: string) {
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new AppError('Not a member of this channel', 404);
    
    await prisma.channelMember.update({
      where: { channelId_userId: { channelId, userId } },
      data: { status: 'accepted' },
    });
    
    return this.getUserChannels(userId).then(channels => channels.find(c => c.id === channelId));
  }

  static async declineRequest(channelId: string, userId: string) {
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new AppError('Not a member of this channel', 404);

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, include: { members: true } });
    if (!channel) throw new AppError('Channel not found', 404);

    await prisma.channelMember.delete({
      where: { channelId_userId: { channelId, userId } },
    });

    if (channel.type === 'direct') {
      // If one declines a DM, delete the whole DM channel
      await prisma.channel.delete({ where: { id: channelId } });
    }
    
    return { success: true };
  }

  static async ensureGlobalChannel(name: string = 'Open Chat', starterMessages: string[] = [
    'Welcome to the Open Chat! This is a public space for all users.',
    'Feel free to say hello and start chatting!'
  ]) {
    // 1. Find or create system user
    let systemUser = await prisma.user.findUnique({ where: { username: 'System' } });
    if (!systemUser) {
      const recoveryKey = `nex-r-system-${crypto.randomBytes(8).toString('hex')}`;
      const hashedRecoveryKey = await argon2.hash(recoveryKey);
      const hashedPassword = await argon2.hash(crypto.randomBytes(16).toString('hex'));

      systemUser = await prisma.user.create({
        data: {
          username: 'System',
          passwordH: hashedPassword,
          recoveryKeyH: hashedRecoveryKey,
          friendCode: crypto.randomBytes(4).toString('hex').substring(0, 7).toUpperCase(),
        },
      });
    }

    // 2. Check if global channel exists
    let channel = await prisma.channel.findFirst({
      where: { name, type: 'group' },
    });

    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const allUserIds = allUsers.map((u) => u.id);

    if (!channel) {
      // Create it
      channel = await prisma.channel.create({
        data: {
          name,
          type: 'group',
          createdById: systemUser.id,
          members: {
            create: allUserIds.map((userId) => ({
              userId,
              role: 'member',
              status: 'accepted',
            })),
          },
        },
      });

      // Send starter messages
      for (const content of starterMessages) {
        await prisma.message.create({
          data: {
            channelId: channel.id,
            senderId: systemUser.id,
            content,
          },
        });
      }
    } else {
      // Ensure all users are members
      const existingMembers = await prisma.channelMember.findMany({
        where: { channelId: channel.id },
        select: { userId: true },
      });
      const existingMemberIds = existingMembers.map((m) => m.userId);
      const missingUserIds = allUserIds.filter((id) => !existingMemberIds.includes(id));

      if (missingUserIds.length > 0) {
        await prisma.channelMember.createMany({
          data: missingUserIds.map((userId) => ({
            channelId: channel.id!,
            userId,
            role: 'member',
            status: 'accepted',
          })),
        });
      }
    }

    return channel;
  }
}

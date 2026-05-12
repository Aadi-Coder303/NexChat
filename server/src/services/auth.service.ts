import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { AppError } from '../utils/errors';
import { ChannelService } from './channel.service';
export class AuthService {
  private static generateFriendCode(): string {
    return crypto.randomBytes(4).toString('hex').substring(0, 7).toUpperCase();
  }

  static async register(username: string, password_h: string, publicKey?: string) {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new AppError('User with this username already exists', 400);
    }

    const hashedPassword = await argon2.hash(password_h);
    
    // Generate a secure recovery key
    const recoveryKey = `nex-r-${crypto.randomBytes(8).toString('hex')}`;
    const hashedRecoveryKey = await argon2.hash(recoveryKey);
    
    // Try to create user, handling friendCode collisions
    let user;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        user = await prisma.user.create({
          data: {
            username: username.replace(/\0/g, ''),
            passwordH: hashedPassword,
            recoveryKeyH: hashedRecoveryKey,
            publicKey: publicKey ? publicKey.replace(/\0/g, '') : undefined,
            friendCode: this.generateFriendCode(),
          },
        });
        break; // Success!
      } catch (error: any) {
        console.error('[AuthService] Registration error:', error);
        attempts++;
        // P2002 is Prisma's unique constraint violation error
        if (error.code === 'P2002' && error.meta?.target?.includes('friend_code')) {
          if (attempts >= maxAttempts) {
            throw new AppError('Failed to generate a unique friend code after multiple attempts', 500);
          }
          continue; // Try again with a new code
        }
        throw error; // Other error, rethrow
      }
    }

    if (!user) {
      throw new AppError('Failed to create user', 500);
    }

    // Add to global channels if they exist
    const globalChannels = await prisma.channel.findMany({
      where: {
        name: { in: ['Open Chat', 'Feedback'] },
        type: 'group'
      }
    });

    for (const channel of globalChannels) {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: user.id,
          role: 'member',
          status: 'accepted',
        },
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user, accessToken, refreshToken, recoveryKey };
  }
  static async deviceLogin(deviceId: string) {
    // 1. Check if user exists with this deviceId
    let user = await prisma.user.findUnique({
      where: { deviceId },
    });

    if (!user) {
      // 2. If not, create a new user
      const adjectives = ['Silent', 'Swift', 'Bright', 'Dark', 'Cool', 'Epic', 'Wild', 'Shadow', 'Mystic', 'Iron'];
      const nouns = ['Ghost', 'Fox', 'Hawk', 'Wolf', 'Tiger', 'Lion', 'Bear', 'Phoenix', 'Dragon', 'Eagle'];
      
      let username = '';
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(Math.random() * 1000)}`;
        const existing = await prisma.user.findUnique({ where: { username } });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        throw new AppError('Failed to generate a unique username', 500);
      }

      user = await prisma.user.create({
        data: {
          deviceId,
          username,
          friendCode: crypto.randomBytes(4).toString('hex').substring(0, 7).toUpperCase(),
        },
      });

      // Ensure global channels exist and user is added
      try {
        await ChannelService.ensureGlobalChannel('Open Chat');
        await ChannelService.ensureGlobalChannel('Feedback');
      } catch (error) {
        console.error('[AuthService] Failed to ensure global channels:', error);
        // Don't fail the whole login if channels fail to create
      }
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  static async login(username: string, password_h: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.passwordH) {
      throw new AppError('Invalid credentials', 401);
    }
    const isValid = await argon2.verify(user.passwordH, password_h);

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  static async recoverAccount(username: string, recoveryKey: string, newPassword_h: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('Invalid recovery request', 400);
    }

    if (!user.recoveryKeyH) {
      throw new AppError('Invalid recovery key', 401);
    }
    const isValidKey = await argon2.verify(user.recoveryKeyH, recoveryKey);

    if (!isValidKey) {
      throw new AppError('Invalid recovery key', 401);
    }

    const hashedPassword = await argon2.hash(newPassword_h);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordH: hashedPassword },
    });

    return { ok: true };
  }

  static async updatePublicKey(userId: string, publicKey: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { publicKey },
    });
  }
}

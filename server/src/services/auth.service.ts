import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { AppError } from '../utils/errors';
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

  static async login(username: string, password_h: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
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

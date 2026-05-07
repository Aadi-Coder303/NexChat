import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { AppError } from '../utils/errors';

export class AuthService {
  static async register(username: string, password_h: string) {
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
    
    const user = await prisma.user.create({
      data: {
        username,
        passwordH: hashedPassword,
        recoveryKeyH: hashedRecoveryKey,
      },
    });

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
}

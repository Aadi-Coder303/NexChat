import argon2 from 'argon2';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';

export class AuthService {
  static async register(email: string, username: string, password_h: string) {
    const hashedPassword = await argon2.hash(password_h);
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordH: hashedPassword,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  static async login(email: string, password_h: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordH, password_h);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }
}

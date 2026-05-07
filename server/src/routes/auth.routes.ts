import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  publicKey: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(1),
});

const recoverSchema = z.object({
  username: z.string(),
  recoveryKey: z.string(),
  newPassword: z.string().min(6),
});

router.post('/register', async (req, res, next) => {
  try {
    console.log(`[Auth] Registration attempt for username: ${req.body?.username}`);
    const validated = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken, recoveryKey } = await AuthService.register(
      validated.username, 
      validated.password,
      validated.publicKey
    );
    
    console.log(`[Auth] Registration successful for: ${user.username} (${user.id})`);
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        publicKey: user.publicKey,
        friendCode: user.friendCode
      }, 
      accessToken, 
      recoveryKey 
    });
  } catch (error: any) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.login(
      validated.username, 
      validated.password
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        publicKey: user.publicKey,
        friendCode: user.friendCode
      }, 
      accessToken 
    });
  } catch (error: any) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});

router.post('/recover', async (req, res, next) => {
  try {
    const validated = recoverSchema.parse(req.body);
    await AuthService.recoverAccount(
      validated.username,
      validated.recoveryKey,
      validated.newPassword
    );
    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/users/:id/public-key', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    // Prevent IDOR: users may only update their own public key
    if (req.userId !== id) {
      return res.status(403).json({ error: 'Forbidden: you can only update your own public key' });
    }
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ error: 'publicKey is required' });
    await AuthService.updatePublicKey(id, publicKey);
    res.json({ ok: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

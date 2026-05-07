import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.register(
      validated.email, 
      validated.username, 
      validated.password
    );
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ user: { id: user.id, email: user.email, username: user.username }, accessToken });
  } catch (error: any) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.login(
      validated.email, 
      validated.password
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user: { id: user.id, email: user.email, username: user.username }, accessToken });
  } catch (error: any) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});

export default router;

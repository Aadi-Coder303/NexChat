import { Router } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.register(email, username, password);
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ user: { id: user.id, email: user.email, username: user.username }, accessToken });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.login(email, password);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user: { id: user.id, email: user.email, username: user.username }, accessToken });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});

export default router;

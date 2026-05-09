import rateLimit from 'express-rate-limit';

// ── Global rate limiter (all routes) ───────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 150,                   // generous for authenticated API + WS handshakes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});

// ── Auth endpoints — strict brute-force protection ─────────────────────────
// 20 attempts per 15 minutes per IP on login, register, recover
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts. Try again in 15 minutes.',
      retryAfter: Math.ceil(15 * 60),
    });
  },
});

// ── Channel / message write operations — medium protection ─────────────────
// 60 write operations per minute per IP
export const channelWriteLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sending too fast. Slow down.' },
  // Only apply to mutating methods
  skip: (req) => req.method === 'GET',
});

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import channelRoutes from './routes/channel.routes';
import { setupSocketHandlers } from './socket';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { globalLimiter, authLimiter, channelWriteLimiter } from './middleware/rateLimit.middleware';

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// ── CORS allowlist ──────────────────────────────────────────────────────────
// Parse comma-separated origins from env: CLIENT_ORIGINS="https://nexchat.vercel.app,http://localhost:5173"
// Fall back to single CLIENT_ORIGIN for backward compat.
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

console.log(`🔒 CORS allowlist: [${allowedOrigins.join(', ')}]`);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no Origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  },
  credentials: true,                     // required for HttpOnly cookie auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,                         // cache preflight for 24 hours
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,             // same allowlist for Socket.io
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// ── Security headers (Helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'", "https://*", "wss://*", "ws://*"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));     // handle all preflight requests

// ── Body parsing & cookies ──────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Global rate limiter ─────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Routes with dedicated rate limits ──────────────────────────────────────
// Auth endpoints: 5 attempts per 15 min (login/register/recover brute-force)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/recover', authLimiter);
app.use('/api/auth', authRoutes);

// Channel endpoints: 60 write ops/min per IP
app.use('/api/channels', authMiddleware, channelWriteLimiter, channelRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling (must be last) ──────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🚀 NexChat Server running on port ${PORT}`);
  console.log(`🔗 Database: ${maskedUrl.split('@')[1] || 'Unknown'}`);
});

export { app, io };

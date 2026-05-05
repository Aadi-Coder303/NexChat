# NexChat — Tech Stack

## Performance Targets
- First Contentful Paint: < 2s (4G mobile)
- Chat Latency: < 300ms end-to-end (50 concurrent users)
- Presence Update: < 1s
- Lighthouse Accessibility: 0 critical issues

---

## Frontend

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 | Concurrent rendering, Suspense boundaries |
| Build Tool | Vite 5 | Sub-second HMR, ESBuild bundler |
| Language | TypeScript 5 (strict) | Interface-first API contracts, socket schemas |
| State Management | Zustand 4 | ~1kB, selector-based, no boilerplate |
| Routing | React Router v6 | Lazy-loaded routes, auth guard wrapper |
| Styling | Tailwind CSS 3 | Utility-first, dark theme tokens, PurgeCSS |
| Animation | Framer Motion | Page transitions, typing indicator, presence pulses |
| Data Fetching | TanStack Query v5 | Optimistic updates, background refetch |
| Forms | React Hook Form + Zod | Uncontrolled inputs, runtime validation |
| Virtualization | TanStack Virtual | Renders only visible messages in feed |

---

## Backend

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Native ESM, built-in fetch, V8 perf |
| HTTP Framework | Express 5 | Minimal REST layer, async-native errors |
| Real-time | Socket.io 4 | WebSocket + fallback, rooms, ACK receipts |
| Database | PostgreSQL 16 | Primary store, JSONB metadata, Row-Level Security |
| ORM | Prisma 5 | Type-safe client, migration-first, connection pooling |
| Cache / Pub-Sub | Redis 7 | Presence TTL keys, pub/sub for multi-instance Socket.io |
| Auth | Argon2id + JWT | OWASP-recommended hashing, access + refresh token pair |
| Email | Resend + React Email | Transactional password reset emails |
| Validation | Zod (shared) | Single schema used on both client and server |

---

## Infrastructure & DevOps

| Layer | Choice | Reason |
|---|---|---|
| Frontend Hosting | Vercel | Edge CDN, preview deployments per PR |
| Backend Hosting | Railway or Render | Managed Postgres + Redis, auto-scaling |
| Version Control | GitHub (private) | Branch protection, PR workflow, Actions CI |
| Containerization | Docker (multi-stage) | docker-compose for local dev (Postgres + Redis + API) |
| Testing | Vitest + Playwright | Unit/integration + E2E for auth and messaging flows |
| Monitoring | Sentry | Error tracking, Core Web Vitals, Socket.io latency |

---

## Architecture Overview

```
React SPA (Vercel CDN)
    ⇄ REST (HTTP)  →  Express API (Railway)
    ⇄ WebSocket    →  Socket.io
                          ↕
                    PostgreSQL (primary store)
                    Redis (presence TTL + pub/sub)
```

### REST Endpoints
- POST /auth/login, /auth/register, /auth/refresh, /auth/logout
- POST /auth/forgot-password, /auth/reset-password
- GET  /api/channels, /api/channels/:id/messages
- POST /api/channels
- GET/PUT /api/users/me

### Socket.io Events (Client → Server)
- `message:send` — { channelId, content, clientTempId }
- `typing:start` / `typing:stop` — { channelId }
- `message:read` — { channelId, messageId }
- `heartbeat` — every 30s to maintain presence TTL

### Socket.io Events (Server → Client)
- `message:new` — { id, channelId, sender, content, createdAt }
- `typing:users` — { channelId, users: [{ id, username }] }
- `presence:update` — { userId, status: 'online' | 'offline' }
- `message:ack` — { clientTempId, serverId }
- `read:update` — { channelId, messageId, userId }

---

## Performance Strategy

### Frontend
- Route-level code splitting (each page is a separate chunk)
- TanStack Virtual for message list (only renders visible rows)
- Intersection Observer for lazy avatar image loading
- Service Worker via Vite PWA plugin for static asset caching

### Backend
- Cursor-based pagination (50 messages per fetch)
- Presence reads from Redis — sub-10ms, no DB query
- Prisma Accelerate for connection pool management
- Typing events debounced/throttled to 1 event per second

---

## Security

| Concern | Implementation |
|---|---|
| Password hashing | Argon2id — memory=64MB, iterations=3, parallelism=4 |
| Token storage | Access token in-memory (Zustand); refresh in HttpOnly Secure SameSite=Strict cookie |
| SQL injection | Prisma parameterized queries — no raw SQL |
| XSS | React JSX auto-escaping + DOMPurify for rich text |
| CORS | Strict allowlist: production domain + localhost:5173 in dev |
| Rate limiting | express-rate-limit: 100 req/15min per IP on auth routes |
| HTTP headers | Helmet.js — CSP, X-Frame-Options, HSTS |
| WebSocket auth | JWT validated in Socket.io middleware on every connection upgrade |

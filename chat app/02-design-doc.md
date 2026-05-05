# NexChat — Design Document

## System Architecture

### Authentication Flow

```
POST /auth/register   → argon2 hash → save user → issue JWT pair
POST /auth/login      → verify hash → issue access(15min) + refresh(7d) tokens
POST /auth/refresh    → validate refresh → rotate both tokens
POST /auth/logout     → invalidate refresh token in Redis blocklist
POST /auth/reset      → send email with signed time-limited token (10min TTL)
```

**Token storage:**
- `access_token` → Zustand memory only — never localStorage
- `refresh_token` → HttpOnly Secure SameSite=Strict cookie — invisible to JS

---

### Real-time Presence System

```
socket.on('connect')     → SET Redis key  user:{id}:presence = "online"  TTL 35s
socket.on('disconnect')  → DEL Redis key  → broadcast presence:offline to rooms

// Heartbeat (client emits every 30s)
socket.emit('heartbeat') → server refreshes TTL → no DB write required

// Status propagation (target < 1s)
Redis key expires → keyspace notification → Express picks up → socket.io broadcast
```

**Multi-tab handling:** Last-write-wins on Redis key. Tab close fires socket disconnect. TTL handles hard crashes/network drops.

---

### Message Delivery Flow (Optimistic UI)

```
1. User clicks Send
2. Client immediately renders message with temp ID (optimistic)
3. socket.emit('message:send', { channelId, content, clientTempId })
4. Server saves to PostgreSQL → broadcasts to room
5. Server emits message:ack { clientTempId, serverId } back to sender
6. Client swaps temp ID for real server ID (no flicker)
```

---

## Database Schema

### Users
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  password_h  TEXT NOT NULL,  -- argon2id hash
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ
);
```

### Channels
```sql
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,
  type        TEXT CHECK (type IN ('direct', 'group')) NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Channel Members
```sql
CREATE TABLE channel_members (
  channel_id  UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
```

### Messages
```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID REFERENCES channels(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',  -- reactions, edit history
  read_by     UUID[] DEFAULT '{}', -- read receipt user IDs
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX ON messages(channel_id, created_at DESC);
CREATE INDEX ON messages(sender_id);
CREATE INDEX ON channel_members(user_id);
```

---

## Component Architecture

```
App
├── AuthProvider                    ← JWT + silent refresh logic
│   ├── PublicLayout
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   └── ForgotPasswordPage
│   └── ProtectedLayout             ← guard: redirects to /login if unauthenticated
│       ├── Sidebar
│       │   ├── UserAvatar          ← with presence status ring
│       │   ├── ChannelList         ← subscribes to presence:update events
│       │   └── DirectMessageList
│       └── ChatLayout
│           ├── MessageFeed         ← TanStack Virtual, infinite scroll upward
│           │   ├── MessageBubble   ← shows read receipt avatars
│           │   └── DateDivider
│           ├── TypingIndicator     ← listens to typing:users socket event
│           └── MessageComposer     ← textarea + send button, emits typing:start/stop
```

### Key State Slices (Zustand)

```typescript
// Auth store
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Chat store
interface ChatStore {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Record<string, Message[]>; // keyed by channelId
  typingUsers: Record<string, User[]>;  // keyed by channelId
  sendMessage: (channelId: string, content: string) => void;
}

// Presence store
interface PresenceStore {
  onlineUsers: Set<string>; // set of user IDs
  updatePresence: (userId: string, status: 'online' | 'offline') => void;
}
```

---

## Socket.io Event Contracts

### Client → Server

| Event | Payload | Notes |
|---|---|---|
| `message:send` | `{ channelId, content, clientTempId }` | clientTempId is UUID generated client-side |
| `typing:start` | `{ channelId }` | throttled to 1 emit/second |
| `typing:stop` | `{ channelId }` | |
| `message:read` | `{ channelId, messageId }` | fired when message enters viewport |
| `heartbeat` | `{}` | every 30s, refreshes Redis presence TTL |
| `channel:join` | `{ channelId }` | joins Socket.io room on channel switch |
| `channel:leave` | `{ channelId }` | leaves Socket.io room |

### Server → Client

| Event | Payload | Notes |
|---|---|---|
| `message:new` | `{ id, channelId, sender, content, createdAt }` | broadcast to room |
| `message:ack` | `{ clientTempId, serverId }` | sent only to original sender |
| `typing:users` | `{ channelId, users: User[] }` | recomputed on each typing event |
| `presence:update` | `{ userId, status }` | broadcast to all rooms user is in |
| `read:update` | `{ channelId, messageId, userId }` | broadcast to room |
| `error` | `{ code, message }` | standardized error format |

---

## REST API Reference

### Auth Routes

| Method | Path | Body | Response |
|---|---|---|---|
| POST | /api/auth/register | `{ email, username, password }` | `{ user, accessToken }` |
| POST | /api/auth/login | `{ email, password }` | `{ user, accessToken }` |
| POST | /api/auth/refresh | (cookie) | `{ accessToken }` |
| POST | /api/auth/logout | — | `{ ok: true }` |
| POST | /api/auth/forgot-password | `{ email }` | `{ ok: true }` |
| POST | /api/auth/reset-password | `{ token, newPassword }` | `{ ok: true }` |

### Resource Routes (all require Bearer token)

| Method | Path | Notes |
|---|---|---|
| GET | /api/channels | Returns user's channels + DMs |
| POST | /api/channels | Create group channel or DM |
| GET | /api/channels/:id/messages | Cursor-based pagination, 50/page |
| GET | /api/users/me | Current user profile |
| PUT | /api/users/me | Update username, avatar_url |
| GET | /api/users/search?q= | Find users to start DM |

---

## Error Handling

### API Error Format
```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "status": 401
  }
}
```

### Socket Error Format
```json
{
  "code": "MSG_CHANNEL_NOT_FOUND",
  "message": "Channel does not exist or you are not a member"
}
```

### Frontend Error Boundaries
- Route-level error boundary catches rendering errors
- TanStack Query retry: 3 attempts with exponential backoff
- Socket.io auto-reconnect: exponential backoff, max 5 attempts
- Token expiry mid-session: silent refresh via interceptor, transparent to user

---

## Folder Structure

```
/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── features/           # Feature modules (auth, chat, presence)
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   └── presence/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Socket.io client, API client, utils
│   │   ├── stores/             # Zustand stores
│   │   ├── types/              # Shared TypeScript types
│   │   └── router.tsx          # React Router config
│   ├── index.html
│   └── vite.config.ts
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── routes/             # Express route handlers
│   │   ├── socket/             # Socket.io event handlers
│   │   ├── middleware/         # Auth, rate limit, validation
│   │   ├── services/           # Business logic (auth, messages, presence)
│   │   ├── lib/                # Prisma client, Redis client
│   │   └── types/              # Shared Zod schemas + TS types
│   └── prisma/
│       └── schema.prisma
│
├── docker-compose.yml          # Local dev: Postgres + Redis + API
├── .env.example
└── README.md
```

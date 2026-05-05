# NexChat — Product Requirements Document (PRD)

**Version:** 1.0  
**Budget scope:** $250–$750 USD  
**Timeline:** 4 weeks  
**Status:** MVP

---

## Product Overview

NexChat is a real-time web messaging application for small-to-medium teams. It delivers near-instant message delivery, live presence indicators, and a clean dark UI optimized for desktop and mobile. The product is modular-first — every feature ships as a composable unit so future capabilities (threads, reactions, file uploads) can be layered in without architectural rewrites.

**Target users:** Remote teams, small organizations, or communities who need a self-hostable, private, fast chat tool.

---

## Success Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| First Contentful Paint | < 2,000ms | Lighthouse 4G throttle, production build |
| Chat latency (p95) | < 300ms | Playwright timestamps, 50 concurrent users |
| Presence update speed | < 1,000ms | Time from tab close to status change visible |
| Lighthouse accessibility | 0 critical/high issues | Lighthouse CI in GitHub Actions |
| TypeScript errors | 0 | tsc --strict in CI |

---

## User Stories

### Authentication & Onboarding

| ID | As a… | I want to… | So that… | Priority |
|---|---|---|---|---|
| AUTH-01 | New user | Register with email and password | I can create an account | P1 |
| AUTH-02 | Returning user | Log in with email and password | I can access my messages | P1 |
| AUTH-03 | Logged-in user | Stay authenticated across page refreshes | I don't log in every visit | P1 |
| AUTH-04 | Forgetful user | Reset my password via emailed link | I can regain access | P1 |
| AUTH-05 | Logged-in user | Log out securely | My session is cleared on shared devices | P1 |

### Real-time Messaging

| ID | As a… | I want to… | So that… | Priority |
|---|---|---|---|---|
| MSG-01 | User | Send a text message in a channel | Others can read it instantly | P1 |
| MSG-02 | User | Receive messages without page refresh | Conversations flow in real-time | P1 |
| MSG-03 | User | See a typing indicator when someone is composing | I know a reply is coming | P1 |
| MSG-04 | User | See read receipts on my messages | I know when my message was seen | P1 |
| MSG-05 | User | Send a direct message to another user | I can have private conversations | P1 |
| MSG-06 | User | Join a group channel | I can participate in team discussions | P1 |
| MSG-07 | User | Scroll back through message history | I can read earlier context | P2 |

### Presence & Status

| ID | As a… | I want to… | So that… | Priority |
|---|---|---|---|---|
| PRS-01 | User | See who is currently online in the sidebar | I know who's available | P1 |
| PRS-02 | User | Have my status update automatically on disconnect | Others see accurate availability | P1 |
| PRS-03 | User | See presence indicators next to avatars in chat | I have visual context while reading | P2 |

### UI / Responsiveness

| ID | As a… | I want to… | So that… | Priority |
|---|---|---|---|---|
| UI-01 | Mobile user | Use the app on my phone | I can chat on the go | P1 |
| UI-02 | User | Experience smooth page transitions | The app feels polished | P2 |
| UI-03 | User with accessibility needs | Navigate with keyboard and screen reader | The app is usable for everyone | P1 |

---

## Acceptance Criteria

### Performance
- Lighthouse 4G throttle: First Contentful Paint ≤ 2,000ms. Measured on production build deployed to Vercel.
- With 50 concurrent users in a single channel, 95th-percentile end-to-end message latency ≤ 300ms. Measured from send button click to recipient DOM update via Playwright timestamps.
- Online → Offline status visible to all channel members within 1,000ms of browser tab close or network disconnect.

### Authentication
- Passwords stored as Argon2id hash. Plaintext never appears in logs, API responses, or database. Verified via unit test against known hash vectors.
- Unauthenticated requests to /chat/* redirect to /login.
- JWT expiry mid-session triggers silent token refresh. If refresh fails, user is redirected to /login.
- Reset link expires in exactly 10 minutes. Link is single-use (invalidated on first successful use). Existing password remains valid until new password is set.

### Messaging
- Read receipt checkmark/avatar appears on sender's message within 500ms of recipient viewing it (tab focused, message visible in viewport via Intersection Observer).
- Typing indicator appears within 200ms of recipient starting to type. Disappears within 3 seconds of last keystroke or immediately on message send.
- Message optimistic UI: message appears instantly for sender. If server rejects (error), message is marked failed with retry option.

### Accessibility
- Zero critical or high-severity Lighthouse accessibility issues.
- WCAG 2.1 AA minimum compliance.
- Focus visible on all interactive elements.
- All images have alt text. All form inputs have associated labels.

### Responsiveness
- Tested and functional at 375px (iPhone SE), 768px (iPad), 1440px (desktop).
- Sidebar collapses to bottom navigation on mobile.
- No horizontal scroll on any viewport.

### Code Quality
- Zero TypeScript errors with strict mode enabled.
- ESLint passes with zero warnings.
- All components have JSDoc comments documenting props.
- No console.log statements in production build.

### Documentation
- README covers: local dev setup, all environment variables, DB migration steps, production deploy steps.
- Estimated reading time to get app running locally: ≤ 15 minutes.
- docker-compose.yml starts Postgres + Redis + API with a single command.

---

## Deliverables

### 1. React Front-end
- Vite + React 18 + TypeScript + Tailwind CSS dark theme
- Framer Motion page transitions
- Responsive breakpoints: 375px, 768px, 1440px
- Route-level code splitting and lazy loading

### 2. Real-time Chat Module
- Socket.io rooms for group channels
- Direct messages as private 2-member channels
- Optimistic message rendering with server ACK confirmation
- Typing indicators (debounced, auto-dismiss after 3s)
- Read receipts via Intersection Observer
- Virtualized message feed (TanStack Virtual)
- Cursor-based message history pagination (50/page)

### 3. Presence System
- Redis TTL-based presence (35s TTL, 30s heartbeat)
- Automatic offline detection via socket disconnect + TTL expiry
- Keyspace notifications for sub-second status propagation
- Visual presence ring on all user avatars

### 4. Secure Authentication
- Argon2id password hashing (memory=64MB, iterations=3)
- JWT access tokens (15min) + HttpOnly refresh cookies (7 days)
- Token rotation on every refresh
- Redis blocklist for invalidated refresh tokens
- Password reset flow: signed email link with 10-min TTL, single-use
- Protected route guards with automatic token refresh

### 5. Git Repository + Documentation
- Private GitHub repository
- Conventional commit message format
- Branch protection on main, PR-based workflow
- GitHub Actions CI: TypeScript check + ESLint + Vitest
- README: setup, env vars, migrations, deploy
- docker-compose.yml for local development

---

## Project Timeline

### Week 1 — Foundation
- Project scaffold: Vite + TypeScript + Tailwind CSS
- Express + Prisma + PostgreSQL setup
- Docker compose for local dev
- Auth endpoints: register, login, refresh, logout, forgot/reset password
- Frontend auth pages: login, register, forgot password
- Protected route guard
- GitHub repo + CI pipeline (TypeScript + ESLint + tests)

### Week 2 — Real-time Core
- Socket.io server setup with auth middleware
- Channel and DM data model + Prisma migrations
- message:send / message:new event flow
- Typing indicator events (start/stop/broadcast)
- Presence system: Redis TTL + heartbeat + keyspace notifications
- Message history API with cursor-based pagination
- TanStack Query integration for REST + Socket.io hybrid

### Week 3 — UI Polish
- Dark theme design system (Tailwind config + CSS variables)
- Sidebar layout: channel list, DM list, user avatar with presence ring
- Message feed: TanStack Virtual, infinite scroll upward
- MessageBubble component: content, timestamp, read receipt avatars
- Typing indicator component
- MessageComposer: textarea, send button, character limit
- Framer Motion page transitions
- Responsive mobile layout: sidebar → bottom nav

### Week 4 — QA + Delivery
- Password reset full flow (email → token → update)
- Lighthouse accessibility audit + fixes
- Load test: 50 concurrent users, verify < 300ms p95 latency
- Playwright E2E tests: auth flows + message send/receive
- Vitest unit tests: auth service, presence service, Zod schemas
- README documentation
- Production deployment (Vercel + Railway)
- Handoff: repo access, env vars, deployment walkthrough

---

## Out of Scope (MVP)

The following are explicitly excluded from this engagement. New requests will be tracked in a backlog and scoped separately.

- Social / OAuth logins (Google, GitHub, etc.)
- File and image uploads
- Message reactions / emoji
- Message threading / replies
- Push notifications (Web Push API)
- End-to-end encryption
- Message search
- Admin dashboard
- Mobile native app
- Video or audio calls

---

## Post-MVP Roadmap

| Feature | Implementation Approach |
|---|---|
| Message search | PostgreSQL full-text search via tsvector + GIN index |
| File uploads | Cloudflare R2 + presigned URLs |
| Push notifications | Web Push API + service worker |
| Desktop app | Tauri wrapper (lighter than Electron) |
| Message reactions | JSONB metadata column, already in schema |
| Webhooks | Outgoing webhooks for third-party integrations |

---

## Risk Register

| Risk | Mitigation | Impact | Probability |
|---|---|---|---|
| WebSocket scaling to multiple instances | Use Socket.io Redis adapter from day one, even on single instance | Medium | Low |
| Refresh token theft via XSS | HttpOnly cookie (JS cannot access) + SameSite=Strict + custom request header check | High | Low |
| Presence inaccuracy with multiple tabs | Last-write-wins Redis key; disconnect events handle tab close; TTL handles crashes | Medium | Medium |
| Performance regression post-launch | Lighthouse CI gate in GitHub Actions blocks merge if FCP degrades > 500ms from baseline | Medium | Low |
| Scope creep | Out-of-scope list in this PRD is the reference. New requests → backlog issue, not current milestone | High | Medium |
| Email delivery failure for reset | Resend provides delivery webhooks; failed sends logged with Sentry alert | Low | Low |

---

## Environment Variables

```
# Server
DATABASE_URL=postgresql://user:pass@localhost:5432/nexchat
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<32-char random string>
JWT_REFRESH_SECRET=<32-char random string>
RESEND_API_KEY=re_xxxx
RESET_TOKEN_SECRET=<32-char random string>
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development

# Client
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

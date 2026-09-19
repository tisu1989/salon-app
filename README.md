# Salon App (Learning Project)

World-class-practices salon booking app: WhatsApp bot booking (Meta Cloud API test number),
a staff/admin web panel, MySQL + Prisma, Redis (cache, pub/sub, session state).

## Stack
- **Backend:** Node.js + Express + TypeScript (strict), repository/service pattern with manual
  constructor injection
- **Frontend:** React + Redux Toolkit (RTK Query) + TypeScript + React Router + Vite — a
  responsive web app, mobile-first, no native app
- **ORM:** Prisma + MySQL
- **Cache/PubSub/Queue:** Redis (ioredis), BullMQ (notifications + exports)
- **Auth:** JWT (access + refresh, rotation, Redis-backed revocation), bcrypt, RBAC (STAFF/ADMIN)
- **Validation:** Zod
- **Testing:** Vitest + Supertest, integration tests against a real isolated test DB
- **CI:** GitHub Actions (lint + typecheck + test on every PR, MySQL/Redis service containers)
- **Containers:** Docker Compose (`docker-compose.yml` for a built image, `docker-compose.dev.yml`
  overlay for hot-reload local dev)

## Status

**Backend — feature-complete for the current screen set.** Auth (login/refresh/logout/me/
change-password), staff (CRUD, working hours, time off, admin password reset), services (CRUD),
customers (search/create/get), appointments (book, availability, list by staff/day/salon-wide/
customer, confirm/cancel/complete/no-show), notifications (queued confirmations + reminders,
retry-with-backoff worker, pub/sub instant delivery, manual admin retry, REST log), and the
WhatsApp booking bot (customer-facing only — booking via button/list flow, not free text).
Deep `/health` check. 76 automated tests (unit + integration). Hardened per a security audit: fail-closed webhook signature check, per-IP login lockout, CORS allow-list, rate limits on public endpoints.

**Frontend — MVP screens all built and wired to the real API** (15 tests covering login, the booking wizard, auth state and booking-step logic), not mocked: Login, Today's Board
(per-staff or salon-wide for admins), New Booking wizard, Customer directory + profile (with
booking history), Staff directory + per-person detail/schedule editor, Service menu CRUD,
Notification log with manual retry, and an Account page (self-service password change, logout).

## What's genuinely still pending

- **Staff/Admin in-dashboard chatbot.** A floating chat widget in the web app (staff/admin only,
  behind login) for natural-language requests — "mark my 3pm done," "what's my schedule today,"
  "no-show report this week." Design: an LLM with tool-calling (Groq or Anthropic API, free tier)
  maps the request to a structured action and calls the *existing* service-layer functions
  directly (`appointmentService`, `staffService`) — the LLM never touches the DB itself. Backend:
  `POST /api/v1/chat`, authenticated via the existing JWT (identifies staff id + role, no separate
  identity lookup needed), routed through a new `staffBotFlow` module shared in spirit with the
  WhatsApp bot's flow logic. Frontend: a floating chat bubble component with local component state
  for message history (not Redux — ephemeral UI state, nothing else in the app needs to read it).
  Deliberately scoped as dashboard-only, not a WhatsApp transport — WhatsApp is reserved for
  customer booking.
- **Exports/reports queue.** A second BullMQ queue (alongside the existing notifications queue) so
  admin can request a CSV/report export (e.g. "export today's appointments") without blocking the
  request — the worker generates the file async, admin is notified when it's ready.
- **Production deployment - prepared, not yet done.** The repo is deploy-ready (graceful shutdown, `render.yaml`, first-admin script, [docs/deployment.md](docs/deployment.md), [ADR 0001](docs/adr/0001-hosting-and-single-instance.md)); creating the actual Render/Aiven/Upstash/Cloudflare accounts and going live is the remaining step.
- **Dedicated Appointment Detail screen.** Appointments are currently viewed/acted on inline (in
  Today's Board and a customer's history), not as their own routed page.
- **Offline-tolerant booking queue.** For flaky front-desk wifi — not started.
- **More ADRs.** `docs/adr/` has its first record (hosting); add one per big decision — see the note below.

## Getting started

### Backend + infrastructure
```
docker compose up -d              # from repo root - MySQL, Redis, runs migrations, starts the api on :4002
```
Or run the backend natively instead of in Docker:
```
cd backend
npm install
cp .env.example .env              # fill in your local MySQL/Redis URLs
npx prisma migrate dev
npm run dev
```
For hot-reload while developing inside Docker, use the dev overlay instead of the base compose file:
```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Frontend
```
cd frontend
npm install
cp .env.example .env              # VITE_API_BASE_URL - point at wherever the backend is running
npm run dev
```

### Debugging
Breakpoint debugging is preconfigured in `.vscode/launch.json` (Run and Debug panel):

| Configuration | What it does |
|---|---|
| **Backend: launch (tsx)** | Runs the API natively under the debugger on port 4003. Needs `docker compose up -d mysql redis` first. |
| **Backend: attach to Docker dev container** | Attaches to the hot-reload container (inspector on `127.0.0.1:9229`). Start it with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d api`. Re-attaches on each reload. |
| **Backend: debug current test file (vitest)** | Runs the open `*.test.ts` file under the debugger (integration tests need the test DB/Redis). |
| **Frontend: dev server + Chrome** | Starts Vite on :5183 and opens Chrome attached to it, so breakpoints in `.tsx` files hit. Points at the native backend (:4003) - edit `VITE_API_BASE_URL` in the config to use the Docker api (:4002) instead. |
| **Full stack: backend + frontend** | Starts the native backend and the frontend together. |

Redux DevTools (browser extension) works in dev builds for inspecting actions, auth state and the RTK Query cache; it is disabled in production builds. The Docker inspector port is bound to localhost only - never expose 9229, it allows remote code execution.

### Tests
```
cd backend && npm test            # needs the test DB/Redis - see backend/.env.test.example
cd frontend && npm test           # no services needed - the API is faked with MSW
```
Frontend tests use Vitest + React Testing Library + MSW, in three layers: pure logic
(`booking-draft`), state (the auth slice), and whole screens driven like a user (login, and the
booking wizard end to end). Both suites run in CI.

## Architecture Decision Records
Keep a short note per big decision in `docs/adr/` — e.g. "why Prisma over Sequelize", "why Redis
for bot session state", "why plain React over React Native for the frontend". One exists so far (hosting and the single-instance rule); this is what makes a portfolio repo read as senior-level, not just a note-to-self.
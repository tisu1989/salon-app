# Salon App (Learning Project)

World-class-practices salon booking app: WhatsApp bot booking (Meta Cloud API test number),
a staff/admin web panel, MySQL + Prisma, Redis (cache, pub/sub, session state).

## Stack
- **Backend:** Node.js + Express + TypeScript (strict), repository/service pattern with manual
  constructor injection
- **Frontend:** React + Redux Toolkit (RTK Query) + TypeScript + React Router + Vite — a
  responsive web app, mobile-first, no native app
- **ORM:** Prisma + MySQL
- **Cache/PubSub:** Redis (ioredis)
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
WhatsApp booking bot. Deep `/health` check. 66 automated tests (unit + integration).

**Frontend — MVP screens all built and wired to the real API**, not mocked: Login, Today's Board
(per-staff or salon-wide for admins), New Booking wizard, Customer directory + profile (with
booking history), Staff directory + per-person detail/schedule editor, Service menu CRUD,
Notification log with manual retry, and an Account page (self-service password change, logout).

## What's genuinely still pending
- **CORS allow-list.** `app.use(cors())` in `backend/src/app.ts` is still wide open — tighten it
  to the real frontend origin(s) before this goes anywhere near production.
- **Production deployment.** Everything above only runs locally via Docker Compose right now; no
  Render/Upstash/Railway/Cloudflare (or equivalent) setup exists yet.
- **Dedicated Appointment Detail screen.** Appointments are currently viewed/acted on inline (in
  Today's Board and a customer's history), not as their own routed page.
- **Offline-tolerant booking queue.** For flaky front-desk wifi — not started.
- **ADRs.** `docs/adr/` doesn't exist yet — see the note below.

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

### Tests
```
cd backend && npm test            # needs the test DB/Redis - see backend/.env.test.example
```

## Architecture Decision Records
Keep a short note per big decision in `docs/adr/` — e.g. "why Prisma over Sequelize", "why Redis
for bot session state", "why plain React over React Native for the frontend". Not started yet;
this is what makes a portfolio repo read as senior-level, not just a note-to-self.

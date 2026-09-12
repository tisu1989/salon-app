# Salon App (Learning Project)

World-class-practices salon booking app: WhatsApp bot booking (Meta Cloud API test number),
staff/admin panels, MySQL + Prisma, Redis (cache, session state, BullMQ queue, pub/sub).

## Stack
- Backend: Node.js + Express + TypeScript (strict)
- ORM: Prisma + MySQL
- Cache/Queue/PubSub: Redis
- Auth: JWT (access + refresh), bcrypt, RBAC (staff/admin)
- Validation: Zod
- Testing: Vitest + Supertest
- CI: GitHub Actions (lint + typecheck + test on every PR)
- Hosting: Render (API + worker), Upstash (Redis), Railway/Aiven (MySQL), Cloudflare Pages (frontend)

## Getting started

1. Unzip this into a new folder, e.g. `D:\Projects\salon-app`
2. `git init` (already run if you got this as-is — check with `git status`) and make your first commit
3. Create a GitHub repo, push — this activates `.github/workflows/ci.yml` automatically
4. `cd backend && npm install`
5. `cp .env.example .env` and fill in your local MySQL/Redis URLs
6. `docker compose up -d` (from repo root) to spin up local MySQL + Redis
7. `npx husky init` (first time only, wires up the pre-commit hook)
8. `npm run dev`

## What's scaffolded vs. what's next

**Scaffolded now:** folder structure (repository/service pattern folders per module), TS strict config,
ESLint + Prettier + Husky + lint-staged, Docker Compose (MySQL + Redis), GitHub Actions CI, a minimal
Express app with a `/health` route and centralized error handling, env validation via Zod, and the full
`prisma/schema.prisma` data model (Staff, WorkingHours, TimeOff, Service, Customer, Appointment,
NotificationLog) with relations and indexes.

**Next step (not yet done):** repositories + services per module (start with `appointment` - the
availability/slot algorithm has no dependencies on anything else, good place to start), auth (JWT + RBAC),
then the WhatsApp webhook.

## Running the schema locally

```
cd backend
npm install
cp .env.example .env
docker compose up -d          # from repo root - starts MySQL + Redis
npx prisma migrate dev --name init
npx prisma studio             # optional - visual DB browser
```

## Architecture Decision Records (add as you go)
Keep a short note per big decision in `docs/adr/` — e.g. "why Prisma over Sequelize", "why Redis for bot
session state". This is what makes a portfolio repo read as senior-level, not just a note-to-self.

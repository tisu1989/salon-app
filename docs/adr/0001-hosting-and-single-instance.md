# ADR 0001: Hosting layout, and running exactly one API instance

Status: accepted (revised: Railway instead of Render + Aiven + Upstash)

## Decision
- Frontend: static build on Cloudflare Pages.
- API + MySQL + Redis: one Railway project - the API as a Docker service (`backend/railway.toml`),
  MySQL and Redis as Railway database services reached over Railway's private network.
- Deploy on push to `main`, with Railway's "Wait for CI" on. No custom deploy scripts.
- Uptime pings from cron-job.org to `/health` (also gives failure alerts).
- **Exactly one API instance.** Do not scale horizontally without first changing the points below.

## Why
One provider for the three server-side pieces means one bill, one dashboard, and private-network
connections (no public database endpoint, no TLS setup, less latency). The developer already runs
another app on Render; using Railway here also keeps the two projects' free/paid limits separate.
Static files need no server, so Pages stays. Letting the platforms pull from Git removes deploy-script
bugs and reuses CI as the quality gate.

## Why only one instance
The API process also runs the notification worker and the pub/sub subscriber. With two instances:
- both would receive every pub/sub message and race to send the same WhatsApp message
  (`NotificationService.sendById` re-checks `PENDING`, but that check is not atomic);
- both would run `prisma migrate deploy` at boot and could apply migrations concurrently.

Before scaling out: claim notifications atomically (e.g. `UPDATE ... WHERE status='PENDING'` and
check the affected row count, or a Redis lock), and move migrations to a one-off release step.

## Sleeping and reminders
The reminder worker lives inside the API process, so it only runs while the process is up. Railway
services run continuously by default; only turn on Railway's "App Sleeping" if you accept that
reminders stop while asleep. The cron-job.org ping is a monitor first (alerts you if the API is
down) and a wake-up second (only matters if sleeping is enabled).

## Trade-off
Railway is usage-billed rather than free-forever: an always-on API + MySQL + Redis costs a few
dollars a month. Check current pricing before relying on it.

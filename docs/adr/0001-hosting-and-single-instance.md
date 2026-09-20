# ADR 0001: Free-tier hosting, and running exactly one API instance

Status: accepted (revised twice: Render+Aiven+Upstash -> Railway -> back to free tier, because the
requirement is "everything free" for now)

## Decision
| Piece | Host | Free-tier terms (checked from the providers' pages, not guaranteed) |
|---|---|---|
| Frontend | Cloudflare (Workers static assets) | free static hosting |
| API | Render free web service, **in a workspace not shared with other free services** | 750 instance hours per workspace per month; spins down after 15 min without traffic; ~1 min cold start |
| MySQL | Aiven free MySQL | 1 GB, free forever, no card; powers off after a period of inactivity |
| Redis | Upstash free | 500K commands/month, 256 MB |
| Keep-awake / alarm | cron-job.org pinging `/health` every 5 min | free |

Deploys happen on push to `main`, gated on GitHub Actions (`autoDeployTrigger: checksPass`).
**Exactly one API instance.**

## Why this shape
"Everything free" removes managed all-in-one options. Each piece uses the free tier that fits its
shape. The one real constraint is the API: 24h x 31d = 744h, and Render gives 750h per workspace, so
a single always-awake service uses almost the whole allowance. That is why it must not share a
workspace with another always-on free service.

## Why the pings matter here
- The reminder worker lives inside the API process, so it only runs while the process is awake. A
  ping every 5 minutes stops the 15-minute idle spin-down, so reminders keep firing.
- The same ping touches MySQL and Redis (`/health` checks both), which should also keep Aiven from
  powering the database off for inactivity. Verify this after a few days.
- If cron-job.org ever fails: the API sleeps, reminders pause, and the next request wakes it after
  ~1 minute. The notification poll then catches up on anything overdue.

## Why only one instance
The API process also runs the notification worker and the pub/sub subscriber. With two instances:
- both would receive every pub/sub message and race to send the same WhatsApp message
  (`NotificationService.sendById` re-checks `PENDING`, but that check is not atomic);
- both would run `prisma migrate deploy` at boot and could apply migrations concurrently.

Before scaling out: claim notifications atomically (`UPDATE ... WHERE status='PENDING'` and check the
affected row count, or a Redis lock), and move migrations to a one-off release step.

## Trade-offs accepted
- Cold starts and occasional slowness; not suitable for real customer traffic at scale.
- Free tiers change. Re-check terms before relying on this, and expect to revisit the ADR if a
  provider changes its limits.
- Upgrade path when money is available: a small always-on paid API instance removes the sleep and
  the ping dependency; the rest of the stack can stay as is.

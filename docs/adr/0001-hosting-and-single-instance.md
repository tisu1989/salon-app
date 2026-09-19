# ADR 0001: Hosting layout, and running exactly one API instance

Status: accepted

## Decision
- Frontend: static build on Cloudflare Pages.
- API: one Docker web service on Render (`render.yaml`).
- MySQL: managed (Aiven free tier). Redis: managed (Upstash free tier, `rediss://` TLS).
- Deploy on push to `main`, gated on GitHub Actions passing. No custom deploy scripts.
- **Exactly one API instance.** Do not scale horizontally without first changing the points below.

## Why
Each piece is the cheapest option that fits its shape: static files need no server, the API needs
a long-lived process, and MySQL/Redis are not worth self-hosting. Letting the platforms pull from
Git removes a whole class of "deploy script" bugs and reuses CI as the quality gate.

## Why only one instance
The API process also runs the notification worker and the pub/sub subscriber. With two instances:
- both would receive every pub/sub message and race to send the same WhatsApp message
  (`NotificationService.sendById` re-checks `PENDING`, but that check is not atomic);
- both would run `prisma migrate deploy` at boot and could apply migrations concurrently.

Before scaling out: claim notifications atomically (e.g. `UPDATE ... WHERE status='PENDING'` and
check the affected row count, or a Redis lock), and move migrations to a one-off release step.

## Known consequence: free-tier sleep
Render's free web services sleep after ~15 minutes without traffic. A sleeping process runs no
worker, so reminders would not send. Either use a paid always-on instance, or ping `/health` every
few minutes from an uptime monitor (see docs/deployment.md). Confirmations sent at booking time are
unaffected while the request that triggered them is awake.

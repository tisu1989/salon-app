# Deployment guide

Layout and reasoning: [ADR 0001](adr/0001-hosting-and-single-instance.md). Provider dashboards
change; if a button name differs, follow the intent. Do the steps **in this order** - each one
produces a value the next one needs.

## 1. MySQL (Aiven free tier)
1. Create a MySQL service. Wait until it is "Running".
2. Copy its connection details and build:
   `mysql://USER:PASSWORD@HOST:PORT/DBNAME?ssl-mode=REQUIRED`
   (Prisma needs a `mysql://` URL. Managed databases require TLS - check the provider's docs for
   the exact Prisma parameter; `sslaccept=strict` needs their CA to be trusted.)
3. Keep this as `DATABASE_URL` - you'll paste it into Render and use it once locally in step 5.

## 2. Redis (Upstash free tier)
1. Create a database, region near your API.
2. Copy the **TLS** connection string - it must start with `rediss://` (two s's). That is your
   `REDIS_URL`. (Plain `redis://` won't work on a public host.)

## 3. API on Render
1. Push this repo to GitHub (done). In Render: **New -> Blueprint**, pick the repo. It reads `render.yaml`.
2. Fill the `sync: false` values: `DATABASE_URL`, `REDIS_URL`, and `CORS_ORIGINS` (put a placeholder
   like `https://placeholder.invalid` for now - you'll fix it in step 6). Leave WhatsApp ones blank
   until you have Meta credentials (the webhook then rejects everything, which is the safe default).
3. Deploy. The start command runs `prisma migrate deploy` first, so your tables are created.
4. Note the URL, e.g. `https://salon-api.onrender.com`.

## 4. Smoke-test the API before touching the frontend
```
curl https://<api-url>/health                    # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
curl -i -X POST https://<api-url>/webhook -H "Content-Type: application/json" -d '{}'   # must be 401
```
`/health` reports database and redis separately - if one says "down", the message tells you which
connection string is wrong.

## 5. Create the first admin (from your laptop, against the production DB)
There is no signup and `seed.ts` is dev-only - never run it here (it hardcodes a known password).
```
cd backend
DATABASE_URL="<production url>" ADMIN_NAME="Your Name" ADMIN_PHONE="+91XXXXXXXXXX" \
ADMIN_PASSWORD="<12+ chars>" npm run create-admin
```
Use a unique password; then log in and create real staff from the app.

## 6. Frontend on Cloudflare Pages
1. New Pages project -> connect the repo. Root directory `frontend`, build command `npm run build`,
   output directory `dist`.
2. Environment variable: `VITE_API_BASE_URL` = `https://<api-url>/api/v1`.
   Vite bakes this in **at build time** - changing it later needs a rebuild.
3. Deploy, note the URL, e.g. `https://salon-app.pages.dev`.
4. Back in Render, set `CORS_ORIGINS` to exactly that URL (scheme + host, **no trailing slash**), redeploy.
   A wrong value shows up as CORS errors in the browser console and a working `curl`.

Refreshing a deep link like `/customers` works without extra config: Pages serves `index.html`
for unknown paths when the project has no `404.html`.

## 7. Verify like a user
Open the Pages URL -> log in with the admin from step 5 -> add a service -> add staff with a
schedule -> book an appointment. That exercises frontend, API, MySQL and Redis in one flow.

## 8. Keeping reminders alive on the free tier
Render's free service sleeps when idle, and a sleeping API sends no reminders (ADR 0001). Add a
free uptime monitor (e.g. UptimeRobot) pinging `https://<api-url>/health` every 5 minutes. The
first request after a long sleep can take ~30-60s - that is the cold start, not a bug.

## 9. WhatsApp (when you have Meta credentials)
Set the four `WHATSAPP_*` variables in Render, then in Meta's dashboard set the webhook to
`https://<api-url>/webhook` with your `WHATSAPP_VERIFY_TOKEN`. The signature check needs
`WHATSAPP_APP_SECRET` - without it every webhook call is rejected on purpose.

## Rolling back
Render keeps previous deploys: use "Rollback" on the service. Migrations are not auto-reverted, so
prefer additive migrations (add a column, then remove old code later) so a rollback stays safe.

## Checklist of production settings
| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | enables the strong-secret check |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | generated, 32+ chars | app refuses to boot otherwise |
| `TRUST_PROXY` | `1` | real client IP for login lockout + rate limits |
| `CORS_ORIGINS` | your Pages URL | unset = every browser is blocked |
| `DATABASE_URL`, `REDIS_URL` | managed services, TLS | never the dev credentials |

# Deployment guide (Railway + Cloudflare Pages)

Layout and reasoning: [ADR 0001](adr/0001-hosting-and-single-instance.md). Dashboards change; if a
button name differs, follow the intent. Do the steps **in this order** - each produces a value the
next one needs. Variable names below are Railway's defaults as far as I know - if one differs,
open the database service's **Variables** tab and use what it shows.

## 1. Create the Railway project with its databases
1. New Project -> **Deploy from GitHub repo** -> pick `salon-app`. It creates one service; we'll
   configure it in step 2.
2. In the same project: **New -> Database -> MySQL**, then **New -> Database -> Redis**.
   Each appears as its own service in the project canvas (name them `MySQL` and `Redis`; the
   reference variables below use those names).

## 2. Configure the API service
1. Service **Settings -> Source -> Root Directory**: `backend`. Railway then finds
   `backend/railway.toml` (Dockerfile build, migrate-then-start command, `/health` check).
2. **Settings -> Networking -> Generate Domain** to get a public URL, e.g.
   `https://salon-api-production.up.railway.app`. Note it.
3. **Variables** - add these (the `${{...}}` ones are Railway "reference variables" that copy a
   value from another service, so passwords never pass through your hands):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_ACCESS_SECRET` | 48+ random chars (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `JWT_REFRESH_SECRET` | a **different** 48+ random chars |
| `TRUST_PROXY` | `1` |
| `CORS_ORIGINS` | placeholder `https://placeholder.invalid` for now - fixed in step 5 |

   Leave the `WHATSAPP_*` variables out until you have Meta credentials (the webhook then rejects
   everything, which is the safe default). Don't set `PORT` - Railway injects it.
4. **Settings -> Deploy -> Wait for CI**: turn on, so a push only deploys after GitHub Actions passes.
5. Deploy. Watch the logs: you should see the migrations apply, then `API listening on port ...`.

## 3. Smoke-test the API before touching the frontend
```
curl https://<api-domain>/health      # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
curl -i -X POST https://<api-domain>/webhook -H "Content-Type: application/json" -d '{}'   # must be 401
```
`/health` reports database and redis separately, so a failure tells you which reference variable is wrong.

## 4. Create the first admin (from your laptop, against the production DB)
There is no signup, and `seed.ts` is dev-only - never run it here (it hardcodes a known password).
Your laptop can't reach Railway's *private* network, so use the database's **public** URL for this
one-off: in the MySQL service, Variables tab, copy the public connection URL (`MYSQL_PUBLIC_URL`).
```
cd backend
DATABASE_URL="<MYSQL_PUBLIC_URL>" ADMIN_NAME="Your Name" ADMIN_PHONE="+91XXXXXXXXXX" \
ADMIN_PASSWORD="<12+ chars, unique>" npm run create-admin
```
Afterwards create real staff from inside the app.

## 5. Frontend on Cloudflare Pages
1. Create a Pages project from the repo. Root directory `frontend`, build command `npm run build`,
   output directory `dist`.
2. Environment variable `VITE_API_BASE_URL` = `https://<api-domain>/api/v1`. Vite bakes this in
   **at build time** - changing it later needs a rebuild.
3. Deploy; note the URL, e.g. `https://salon-app.pages.dev`.
4. In Railway set `CORS_ORIGINS` to exactly that URL (scheme + host, **no trailing slash**) and let it
   redeploy. A wrong value shows up as CORS errors in the browser console while `curl` still works.

Deep links like `/customers` survive a refresh without extra config: Pages serves `index.html` for
unknown paths when the project has no `404.html`.

## 6. Verify like a user
Open the Pages URL -> log in as the admin from step 4 -> add a service -> add staff with a schedule ->
book an appointment. That exercises frontend, API, MySQL and Redis in one flow.

## 7. Uptime pings with cron-job.org
1. Create a cron job: URL `https://<api-domain>/health`, method GET, every 5 minutes.
2. Turn on failure notifications, so you get an email when the API stops answering.
Railway services stay running by default, so this is mainly an alarm bell. It becomes a keep-awake
only if you enable Railway's "App Sleeping" - and even then, the first request after sleep is slow.

## 8. WhatsApp (when you have Meta credentials)
Set the four `WHATSAPP_*` variables in Railway, then in Meta's dashboard set the webhook to
`https://<api-domain>/webhook` with your `WHATSAPP_VERIFY_TOKEN`. Without `WHATSAPP_APP_SECRET`
every webhook call is rejected on purpose.

## Rolling back
Railway keeps previous deployments: open the service's Deployments list and redeploy an older one.
Migrations are not auto-reverted, so prefer additive migrations (add a column first, remove old code
later) so a rollback stays safe.

## Production settings checklist
| Variable | Why it matters |
|---|---|
| `NODE_ENV=production` | turns on the strong-secret check |
| `JWT_*_SECRET` | 32+ chars or the app refuses to boot |
| `TRUST_PROXY=1` | real client IP for login lockout + rate limits (else everyone shares the proxy's IP) |
| `CORS_ORIGINS` | your Pages URL; unset = every browser is blocked |
| `DATABASE_URL`, `REDIS_URL` | reference variables to the Railway services, never dev credentials |

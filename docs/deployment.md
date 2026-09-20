# Deployment guide - everything free

Stack and reasoning: [ADR 0001](adr/0001-hosting-and-single-instance.md). Dashboards change; if a
button is named differently, follow the intent. Do the steps **in this order** - each produces a value
the next needs. Items marked **(verify)** are things I could not confirm without your accounts:
when one fails, that is expected practice material - paste me the error.

## 0. Keep your laundry app untouched
Render gives 750 free hours **per workspace**, and one always-awake service needs ~720-744. So the
salon API goes in a **separate Render account/workspace** (new sign-up, different email), leaving the
laundry app and its hours alone. **(verify)** that Render's terms allow this; if not, the fallback is
an Oracle Cloud Always Free VM (ask me and I'll write that guide).

## 1. MySQL - Aiven free
1. Create an Aiven account (no card) -> new service -> **MySQL -> Free plan**, region near you.
2. Wait for "Running". Copy host, port, user, password, database name from the service page.
3. Build `DATABASE_URL`:
   `mysql://USER:PASSWORD@HOST:PORT/DBNAME?sslaccept=accept_invalid_certs`
   Aiven requires TLS. `accept_invalid_certs` encrypts the connection but does not verify the server's
   identity (Aiven signs with its own CA). Fine for a learning project; the stricter route is to bake
   Aiven's CA file into the image and use Prisma's `sslcert` parameter. **(verify)** the exact
   parameters in Prisma's MySQL connection-URL docs if the connection is refused.
4. Aiven powers a free database off after inactivity. Step 7's pings prevent that. **(verify)** after
   a few days that it stays on.

## 2. Redis - Upstash free
1. Create an Upstash account -> **Create Database** (Redis), regional, near your API.
2. Copy the **TLS** connection string - it must start with `rediss://` (two s's) - as `REDIS_URL`.
3. Free budget is 500K commands/month; this app uses a tiny fraction (logins, refresh tokens, one
   `PING` per health check, a publish per notification). **(verify)** that Pub/Sub works on the free
   plan: after deploy, book an appointment and check the confirmation arrives instantly; if only the
   60-second poll delivers it, the subscriber isn't working.

## 3. API - Render free (new account)
1. Sign up at Render with a **different email** than your laundry app. Connect GitHub.
2. **New -> Blueprint** -> select the `salon-app` repo. It reads `render.yaml`.
3. (The Blueprint already pins the Singapore region, closest to Mumbai.) Fill the `sync: false` variables: `DATABASE_URL` (step 1), `REDIS_URL` (step 2), and `CORS_ORIGINS`
   as `https://placeholder.invalid` for now (fixed in step 5). Leave `WHATSAPP_*` empty until you have
   Meta credentials: the webhook then rejects every call, which is the safe default.
4. Deploy. The start command applies migrations, then starts the API. Note the URL, e.g.
   `https://salon-api.onrender.com`. The first start can take a minute or two.

## 4. Smoke-test the API before touching the frontend
```
curl https://<api-url>/health   # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
curl -i -X POST https://<api-url>/webhook -H "Content-Type: application/json" -d '{}'   # must be 401
```
`/health` reports database and redis separately, so a failure tells you which connection string is wrong.

## 5. Frontend - Cloudflare (Workers static assets)
Cloudflare now deploys sites as a Worker serving static files. `frontend/wrangler.jsonc` in this repo
tells it to serve `dist/` and fall back to `index.html` so deep links like `/customers` survive a refresh.
0. **GitHub access first:** github.com/settings/installations -> *Cloudflare Workers and Pages* -> Configure ->
   Repository access -> add `salon-app` -> Save. Without this the wizard can still deploy once by hand, but
   later `git push`es never trigger builds (Cloudflare leaves no check on the commit). Render's GitHub app
   needs the same one-time grant.
1. Workers & Pages -> **Create application** -> **Continue with GitHub** -> pick `salon-app` -> Deploy.
   (The wizard has no build fields, so this first build is expected to be wrong - fix it next.)
2. Open the new project -> **Settings -> Builds -> Build configuration** and set:
   build command `npm run build`, deploy command `npx wrangler deploy`, **root directory `/frontend`**.
3. Same page, **Build variables and secrets** (not the Runtime variables box at the top, which does not
   apply to static-only Workers): `VITE_API_BASE_URL` = `https://<api-url>/api/v1` and `NODE_VERSION` = `22`.
   Vite bakes the API address in **at build time** - changing it later needs a rebuild.
4. Rebuild: push any commit to `main` (the project auto-builds on push), or retry from the Builds page.
5. **Check the build log, not just the green tick.** A correct build runs `vite build` and uploads only a
   handful of files (index.html + assets/). If it uploads dozens of `src/...` files it published the
   *source code* instead of the built app - the root directory or build command is wrong.
6. Note the site address (e.g. `https://salon-app.<account>.workers.dev`), then set `CORS_ORIGINS` in Render
   to exactly that URL (scheme + host, **no trailing slash**) and redeploy. A wrong value shows up as CORS
   errors in the browser console while `curl` still works.

## 6. Create the first admin (from your laptop, against the production DB)
There is no signup, and `seed.ts` is dev-only - never run it here (it hardcodes a known password).
```
cd backend
DATABASE_URL="<same url as step 1>" ADMIN_NAME="Your Name" ADMIN_PHONE="+91XXXXXXXXXX" \
ADMIN_PASSWORD="<12+ chars, unique>" npm run create-admin
```
Then open the Pages URL, log in, and create real staff/services inside the app.

## 7. cron-job.org keep-awake pings
1. Create a cron job: URL `https://<api-url>/health`, GET, **every 5 minutes**, with failure emails on.
2. This does three jobs: it stops Render's 15-minute idle spin-down (so the reminder worker keeps
   running), it keeps Aiven active, and it emails you if the API goes down.
Expect ~1 minute cold starts only if a ping is missed.

## 8. Verify like a user
Log in -> add a service -> add staff with a schedule -> book an appointment. That exercises frontend,
API, MySQL and Redis in one flow.

## 9. WhatsApp (when you have Meta credentials)
Set the four `WHATSAPP_*` variables in Render, then in Meta's dashboard set the webhook to
`https://<api-url>/webhook` with your `WHATSAPP_VERIFY_TOKEN`. Without `WHATSAPP_APP_SECRET` every
webhook call is rejected on purpose.

## Rolling back
Render keeps previous deploys: open the service's Events/Deploys and roll back. Migrations are not
auto-reverted, so prefer additive migrations (add a column first, remove old code later).

## Production settings checklist
| Variable | Why it matters |
|---|---|
| `NODE_ENV=production` | turns on the strong-secret check |
| `JWT_*_SECRET` | 32+ chars or the app refuses to boot (Render generates them) |
| `TRUST_PROXY=1` | real client IP for login lockout + rate limits (else everyone shares the proxy's IP) |
| `CORS_ORIGINS` | your Pages URL; unset = every browser is blocked |
| `DATABASE_URL`, `REDIS_URL` | managed services over TLS, never the dev credentials |

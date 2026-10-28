# Gilgal Ground Chalets

Mobile booking site for Gilgal Ground Chalets.

- **Guests** (`/`): read and agree to the Gilgal Ground Rules, choose family or individual, pick Fri–Sun days, choose a room or bed, and confirm.
- **Front desk** (`/admin`): password login, then a calendar of beds booked, a day-by-day room list, check in (mattress + key) and check out (key, mattress, room cleaned).

Plain HTML, CSS and JavaScript, plus one Vercel function (`api/router.js`) that stores bookings in Upstash Redis. No build step.

## Set up on Vercel (once)

1. **Database:** in your Vercel project, open **Storage → Create Database → Upstash (Redis)**, create it on the free plan and connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
2. **Admin password:** open **Settings → Environment Variables** and add `ADMIN_PASSWORD` with the password front desk staff will use.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the new settings take effect.

Until both are set, guests see “The booking database isn’t set up yet” and the front desk can’t log in.

Changing `ADMIN_PASSWORD` logs everyone out. Sessions last 12 hours.

## Deploy

```bash
npx vercel --prod
```

Or import the GitHub repository in Vercel (Framework Preset: **Other**, no build command); every push to `main` then redeploys.

## Run locally

```bash
node dev-server.js
```

Open http://localhost:3000 for guests and http://localhost:3000/admin for the front desk (password `gilgal-admin`, or set `ADMIN_PASSWORD`). Locally, bookings are kept in memory and cleared when you stop the server.

## Where things live

- `lib/core.js` — rooms, open days and booking rules, shared by the page and the API
- `api/router.js` — bookings, availability and the admin login
- `app.js`, `styles.css`, `index.html` — the site

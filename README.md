# WorkTime

WorkTime is a small full-stack app for recording worker hours and managing them from an accountant/admin dashboard.

## Tech stack

- React + TypeScript + Vite
- Node.js + Express
- MongoDB + Mongoose
- bcryptjs
- ExcelJS
- Vercel

## Main pages

- Worker: `/worker`
- Admin: `/admin`
- Health check: `/api/health`

## Main features

### Worker

- Login with PIN
- Choose date and work site
- Enter start and finish time
- Submit older dates
- Future dates are blocked
- One entry per worker per day
- Sunday records date + site with 0 hours
- View recent entries

### Admin

- Login with email and password
- Create/edit/enable/disable workers
- Change worker PIN
- Create/edit/enable/disable sites
- View and filter timesheets
- Filter by worker, site, date, week, or month
- View regular and overtime totals
- View late submissions
- Edit accountant note only
- Export CSV
- Export Excel
- Optional demo-data button controlled by an environment variable

## Work-hour rules

- Monday-Friday regular hours: 08:00-16:00
- Saturday regular hours: 08:00-15:00
- Hours outside the regular period are overtime
- Sunday has 0 working hours

## Environment variables

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/worktimecluster?retryWrites=true&w=majority&appName=Cluster0
PIN_LOOKUP_SECRET=replace-with-a-long-random-secret
APP_TIMEZONE=Europe/Athens
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
VITE_ENABLE_SEED_DATA=false
```

`PIN_LOOKUP_SECRET` must be at least 24 characters.

Set:

```env
VITE_ENABLE_SEED_DATA=true
```

to show the demo-data icon in the admin dashboard. The backend checks the same flag before allowing demo data to be created.

## Authentication

The app stores login sessions in MongoDB.

- Admin session: 12 hours
- Worker session: 30 days
- Logout removes the current session
- Disabled users cannot keep using the app

Worker PINs and the admin password are stored as hashes.

## MongoDB collections

- `admins`
- `workers`
- `sites`
- `entries`
- `sessions`

The database name comes from `MONGODB_URI`.

## Project structure

```text
src/
  App.tsx
  api.ts
  i18n.ts
  types.ts
  components/
  lib/
  pages/

api/
  index.ts
  lib/
    auth.ts
    db.ts
    entries.ts
    errors.ts
    seed.ts
    time.ts
    xlsx.ts
```

The code is split by responsibility, but the flow stays simple:

1. React calls an API route.
2. Express validates the request.
3. Mongoose reads or writes MongoDB.
4. The API returns JSON to React.

## Run locally

Requirements:

- Node.js 22 or newer
- npm
- MongoDB running locally, or a MongoDB Atlas connection string

First-time setup:

```bash
git clone https://github.com/HussainGafrony/worktime.git
cd worktime
npm install
cp .env.example .env
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp .env.example .env`.

The default local setup uses:

- Web app: `http://localhost:5173`
- API: `http://localhost:3001`
- Health check: `http://localhost:5173/api/health`
- MongoDB: `mongodb://127.0.0.1:27017/worktimecluster`
- Timezone: `Europe/Athens`
- Initial admin: `admin@example.com` / `ChangeMe123!`

Vite proxies every `/api` request from port 5173 to the API on port 3001, so the frontend needs no separate API URL.

The API dev command loads `.env` directly. Vite also loads the same `.env` file. Do not commit `.env`; it is already ignored by Git.

If you prefer MongoDB Atlas, replace only `MONGODB_URI` in `.env` with your Atlas URI and keep the database name in the URI path, for example `/.../worktimecluster?...`. Do not paste database passwords into source code.

The initial admin is created only when the `admins` collection is empty. Changing `ADMIN_EMAIL` or `ADMIN_PASSWORD` later does not reset an existing admin account.

To enable local demo data, set `VITE_ENABLE_SEED_DATA=true` in `.env` and restart `npm run dev`.

### Local smoke test

After `npm run dev` starts successfully:

1. Open `http://localhost:5173/api/health` and confirm `{"ok":true,"database":"worktimecluster"}`.
2. Open `http://localhost:5173/admin` and sign in with the admin values from `.env`.
3. Create a site and a worker with a numeric PIN.
4. Sign out, open `/worker`, and sign in with that PIN.
5. Submit a weekday entry and confirm regular/overtime values.
6. Submit an older date and confirm it appears as late.
7. Submit a Sunday entry and confirm it records 0 hours.
8. Try the same worker/date twice and confirm the duplicate is blocked.
9. In admin, test filters, pagination, accountant note editing, CSV export, and Excel export.
10. Disable a worker and confirm its existing session can no longer access protected data.

## Build

```bash
npm install
npm run build
```

The build checks TypeScript for both frontend and backend, then creates the Vite production build.

## Quick test checklist

After deployment, test:

1. `/api/health`
2. Admin login
3. Worker login
4. Create worker
5. Create site
6. Submit a normal weekday entry
7. Submit an older entry and confirm it is late
8. Submit Sunday and confirm 0 hours
9. Confirm duplicate day is blocked
10. Check filters and pagination
11. Edit accountant note
12. Export CSV
13. Export Excel
14. Enable and test demo-data button if needed

## Current limits

The app intentionally keeps the business model simple:

- One work site per worker per day
- No lunch/break deduction
- No overnight shifts
- No admin password-reset screen
- No login rate limiting yet

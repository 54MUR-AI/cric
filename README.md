# CRIC Manager

Private member Progressive Web App (PWA) for **Chair Rock Island Corporation (CRIC)**. Members use it to manage island life: cabin bookings, maintenance tasks, meetings, map pins, photos, records, emergency info, and more.

Live site: [https://chairrock.app](https://chairrock.app) (GitHub Pages with custom domain).

## Features

- **Dashboard** — overview for members
- **Schedule** — cabin bookings (guests, rooms, boat-related scheduling)
- **Maintenance** — task tracking
- **Meetings** — agendas / notes (including Zoom location support)
- **Map** — Leaflet map with pins
- **Photos** — gallery and uploads
- **Cabins** — cabin details and improvements
- **Guide & Records** — operating guide, bylaws, and governance docs
- **Emergency** — island safety info (no cell service on the island)
- **Users** — admin member management
- **Offline-friendly PWA** — Dexie local cache + service worker (`vite-plugin-pwa`)

Auth and data live behind Supabase; this is not a public marketing site.

## Stack

| Layer | Tech |
| --- | --- |
| UI | React 19, Vite 8, Tailwind CSS 4 |
| Routing | React Router |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Maps | Leaflet / react-leaflet |
| Offline / PWA | Dexie + `vite-plugin-pwa` (injectManifest) |
| Deploy | GitHub Actions → GitHub Pages |

## Local setup

### Prerequisites

- Node.js 22+ (matches the deploy workflow)
- A Supabase project with schema applied

### 1. Clone and install

```bash
git clone https://github.com/54MUR-AI/cric.git
cd cric
npm ci
```

### 2. Environment

Copy the example env file and fill in values from your Supabase project:

```bash
cp .env.example .env
```

Variables from `.env.example`:

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite app | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vite app | Public anon key |
| `VITE_SUPABASE_FUNCTIONS_URL` | Vite app | Typically `https://<project>.supabase.co/functions/v1` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side / tooling | **Secret** — do not expose in the browser or commit it |

Optional (see `vite.config.js`): `VITE_BASE_URL` controls Vite `base`, PWA `scope`, and `start_url`. Production deploy sets this to `/`.

### 3. Database

Apply Supabase SQL from this repo before running the app against a fresh project:

- Incremental migrations: `supabase/migrations/`
- Convenience / bootstrap scripts also present: `supabase/migration.sql`, `supabase/seed.sql`, and related SQL files under `supabase/`
- Edge Functions live under `supabase/functions/`

Use the Supabase SQL editor or CLI as appropriate for your environment. Do not commit real keys or production dumps.

### 4. Run

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

From `package.json`:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Local development server |
| `build` | `vite build` | Production build → `dist/` |
| `preview` | `vite preview` | Preview the production build locally |
| `lint` | `oxlint` | Lint |

## Deploy

On push to `master` (or via `workflow_dispatch`), [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Runs `npm ci` and `npm run build` with GitHub Actions secrets for `VITE_SUPABASE_*`
2. Sets `VITE_BASE_URL=/` (custom domain root)
3. Copies `dist/index.html` → `dist/404.html` for SPA routing on Pages
4. Deploys with `actions/deploy-pages`

Production hostname is the configured Pages custom domain **chairrock.app**. Repo Pages settings and the HTTPS certificate are managed in GitHub.

Required Actions secrets (names only; values stay in GitHub):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_FUNCTIONS_URL`

## Photo upload server (separate)

[`cric-photos-server.js`](cric-photos-server.js) is a small Express upload/static server for photo files. It is **not** part of the Vite app bundle or the GitHub Pages deploy.

- Listens on `127.0.0.1:3001` by default
- Stores files under `/data/cric-photos`
- Auth via `CRIC_PHOTOS_API_KEY` (`x-api-key` header)
- Companion unit/service files: `cric-photos.service`, `cloudflared-cric-photos.service`

Run and operate that process on its own host; configure the app/Edge Functions to talk to it as needed.

## License / access

Private member application for Chair Rock Island Corporation. Repository visibility and membership are controlled by the GitHub org/owner.

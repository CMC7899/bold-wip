# Bolt Industries – Daily Progress Report (bold-wip)

## Project Overview
- **Name**: Bolt Industries Daily Progress Report
- **Repo**: bold-wip
- **Goal**: Mobile-first PWA for site supervisors to create, manage and export daily construction progress reports, with optional MS Project Online sync
- **Tech Stack**: Hono + TypeScript (backend) · Vanilla JS ES modules (frontend) · IndexedDB (local storage) · jsPDF (PDF export) · TailwindCSS CDN

## Features Implemented
- ✅ **Projects List** – view all projects with status badges and progress
- ✅ **New Project Wizard** – 4-step form (Project Info → Zone Config → Resources → Review)
  - Step 2: Full per-zone activity editor — add/remove/reorder activities, BIPV / Standard / Custom zone types, preset activity picker
  - Demo Mode: mock GUIDs auto-assigned when MS Project Online is not configured
- ✅ **Project Dashboard** – overall progress, zone breakdown, recent reports, MS Project IDs panel
- ✅ **New Daily Report** – 5-step mobile form with autosave/draft, weather, manpower, machinery, zone progress sliders, photo capture, preview & submit
- ✅ **Report View** – read-only QF-25 format report with PDF export (jsPDF)
- ✅ **Settings** – user profile, MS Project Online config, demo data loader, data export/clear
- ✅ **Offline-first** – IndexedDB via custom DB wrapper, localStorage drafts, autosave every 30s
- ✅ **Mock / Demo Mode** – all MS Project IDs auto-generated as RFC-4122 GUIDs when integration not configured

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check → `{ status, timestamp }` |
| GET | `/static/*` | Static JS/CSS/SVG assets |
| GET | `/` | SPA shell (index.html) |

## Data Architecture
- **Storage**: IndexedDB (browser) — object stores: `projects`, `dailyReports`, `drafts`, `photos`
- **Key models**: Project (id, name, zones[], resourceTemplates[], msProjectId), DailyReport (id, projectId, zoneProgress[], manpowerLogs[], machineryLogs[], photos[])
- **Sync**: MS Project Online via MSAL (optional); falls back to mock GUIDs in demo mode

## URL Structure (Hash Router)
| Hash | Page |
|------|------|
| `#/` or `#/projects` | Projects list |
| `#/projects/new` | New project wizard |
| `#/projects/:id` | Project dashboard |
| `#/reports/new?projectId=:id` | New daily report |
| `#/reports/:id` | Report view + PDF export |
| `#/settings` | Settings |

## Getting Started (local dev)
```bash
npm install
npm run build
npm run dev:sandbox   # wrangler pages dev on port 3000
```

## Deployment
- **Platform**: Cloudflare Pages (via Wrangler)
- **Build output**: `dist/`
- **Deploy**: `npm run deploy`

## GitHub
- **Repo**: https://github.com/CMC7899/bold-wip
- **Branch**: main

## Pending / Next Steps
- E2E testing (demo load → dashboard → report → PDF export)
- Cloudflare Pages production deployment
- MS Project Online integration live testing
- Push notifications / service worker for offline PWA

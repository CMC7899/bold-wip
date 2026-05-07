# Bolt Industries – Daily Progress Report (bold-wip)

## Project Overview
- **Name**: Bolt Industries Daily Progress Report
- **Repo**: bold-wip
- **Goal**: Mobile-first PWA for site supervisors to create, manage and export daily construction progress reports, with optional MS Project Online sync
- **Tech Stack**: Hono + TypeScript (backend) · Vanilla JS ES modules (frontend) · IndexedDB (local storage) · jsPDF (PDF export) · TailwindCSS CDN

## 🌐 Live URLs
- **Production**: https://wip-tracking.pages.dev
- **Latest deployment**: https://183233fb.wip-tracking.pages.dev
- **GitHub**: https://github.com/CMC7899/bold-wip
- **Cloudflare Project**: wip-tracking

## Features Implemented
- ✅ **Projects List** – view all projects with status badges and progress
- ✅ **New Project Wizard** – 4-step form (Project Info → Zone Config → Resources → Review)
  - Step 2: Full per-zone activity editor — add/remove/reorder activities, BIPV / Standard / Custom zone types, preset activity picker
  - **Inline zone rename** – click ✏️ on any zone card to rename it in place
  - **Add new zone** – boxed "Add New Zone" panel at the top of Step 2
  - Demo Mode: mock GUIDs auto-assigned when MS Project Online is not configured
- ✅ **Project Dashboard** – overall progress, zone breakdown, recent reports, MS Project IDs panel
- ✅ **New Daily Report** – 5-step mobile form with autosave/draft, weather, manpower, machinery, zone progress sliders, photo capture, preview & submit
- ✅ **Report View** – read-only QF-25 format report with PDF export (jsPDF)
  - **Photo descriptions** – add/edit description per photo inline; description shown below photo in PDF
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
- **Platform**: Cloudflare Pages
- **Project name**: wip-tracking
- **Build output**: `dist/`
- **Deploy command**: `npm run deploy`
- **Status**: ✅ Active

## Pending / Next Steps
- MS Project Online integration live testing
- Push notifications / service worker for offline PWA

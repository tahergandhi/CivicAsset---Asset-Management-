# CivicAsset

CivicAsset is a government asset lifecycle and intelligence dashboard for Gujarat's fictional public asset estate. This first vertical slice focuses on the hackathon differentiators: risk-aware asset visibility, an interactive map surface, condition analytics, a priority queue, and maintenance triage.

## Run locally

```bash
npm install
npm run api
```

In a second terminal, start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite. The frontend connects to `http://localhost:4000` when the API is running. If the API is stopped, the app remains usable in offline demo mode and stores changes in browser storage.

For a production build check:

```bash
npm run build
```

## Demo interactions

- Use the left navigation to change the active workspace context.
- Search asset names, IDs, types, or departments from the top search field.
- Filter map pins by risk and click any pin or priority row to inspect the selected asset.
- Use `Create work order` or `Triage now` to update the visible open-work-order count.
- Use `Register asset` to enter the asset-register workspace state.
- Run the bridge scenario: inspect `Sabarmati East Bridge`, create a work order, advance it through the queue, and use Lifecycle to make only valid state transitions.
- Use `Reports & analytics` to download a CSV generated from the current API-backed asset register.

## Current scope

The app includes a runnable Node API with JSON persistence, API-backed universal assets, lifecycle transition validation, audit events, inspections, maintenance work orders, citizen reports, CSV reporting, and a browser fallback for offline demos. The JSON store is intentionally easy to replace with PostgreSQL/PostGIS after the hackathon.

The current feature modules also include:

- Finance and TCO calculations with repair-versus-replace guidance
- Explainable risk, criticality, and predictive-maintenance recommendations
- Real downloadable QR codes for field asset identification
- Transfer requests with approval records
- Retirement and disposal evaluation without deleting history
- Approvals and append-only audit presentation

## Stack

- React 19 + TypeScript
- Vite
- Node.js HTTP API with persisted JSON store
- CSS with responsive desktop/tablet/mobile layouts
- Fictional Gujarat asset data for demonstrations only

## Important limitation

Authentication, production RBAC, database transactions, file storage, rate limiting, and real government data are not included. The demo API includes a single administrator actor and fictional data only; do not present it as an operational government system without adding those controls.

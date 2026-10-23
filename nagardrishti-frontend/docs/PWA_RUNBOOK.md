# NagarDrishti PWA Runbook

This document describes the local workflow for the citizen PWA, officer dashboard, API, PostgreSQL database, and offline submission queue.

## Local development

Run every command from:

```powershell
cd D:\AI-ty\NagarDrishti\nagardrishti-frontend
```

Install dependencies and create the environment file:

```powershell
pnpm install
Copy-Item .env.example .env
```

Start PostgreSQL:

```powershell
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

Use two terminals for development:

```powershell
# Terminal 1: API on port 5000
pnpm dev:server

# Terminal 2: Vite frontend on port 3000
pnpm dev
```

Open `http://localhost:3000/citizen` for the citizen flow and the officer/public routes from the dashboard navigation.

## PWA verification

The service worker is intentionally disabled during Vite development. Test installation and offline caching with the production server:

```powershell
pnpm build
pnpm start
```

Open `http://localhost:5000/citizen`. In Chromium, DevTools > Application should show:

- Manifest with `/icons/icon-192.png` and `/icons/icon-512.png`
- Service worker registered at `/sw.js`
- Cache storage named `nagardrishti-shell-v1`

Localhost is treated as a secure context by modern browsers. A phone testing the app over a LAN IP needs HTTPS; use a trusted HTTPS tunnel or deploy behind an HTTPS reverse proxy.

On Android Chrome, use the in-app install banner or the browser menu > Install app. On iOS Safari, use Share > Add to Home Screen because iOS does not expose the Chromium install prompt event.

## Offline complaint workflow

The citizen report form stores its draft and queued payload in IndexedDB. When offline, the submission is assigned an `OFFLINE-*` reference and remains queued on the device. When connectivity returns, the client automatically retries queued submissions through `POST /api/issues` and removes successful entries from the queue.

The supported states are `Draft`, `Waiting to upload`, `Uploaded`, and `Failed`. The service worker never caches API responses, so authenticated and issue data remain server-controlled.

## Mobile acceptance checklist

- Test at 360px, 375px, and 412px viewport widths.
- Grant and deny location permission.
- Capture a camera image and verify compression before submission.
- Submit once offline, reconnect, and confirm the issue appears in My Reports.
- Verify safe-area padding on a notched device.
- Verify the install prompt, app icon, standalone launch, and refresh behavior.

## Authentication note

The API now supports an HTTP-only `nd_session` cookie backed by the `sessions` table. Development still permits the existing demo-role header for local UI work; production ignores that fallback. A production deployment should place real phone/email verification in front of `/api/auth/login` before public release.

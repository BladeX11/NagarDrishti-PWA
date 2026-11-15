# Production deployment

The supplied `Dockerfile`, `docker-compose.prod.yml`, and Caddyfile deploy the API and built frontend as one origin. Caddy obtains and renews HTTPS certificates automatically for `APP_DOMAIN`.

## Required preparation

1. Point the domain's DNS `A` record to the server.
2. Open TCP ports 80 and 443.
3. Copy `.env.example` to `.env.production` and replace every placeholder.
4. Generate VAPID keys with `pnpm exec web-push generate-vapid-keys`.
5. Configure Resend or Twilio for OTP delivery.
6. Configure dual S3-compatible buckets (e.g. Cloudflare R2):
   - `OBJECT_STORAGE_PRIVATE_BUCKET`: Strictly private (no public domain or r2.dev access). Stores unmodified originals with EXIF metadata for audit ledger and internal fraud detection.
   - `OBJECT_STORAGE_PUBLIC_BUCKET`: Public read access via custom domain / CDN (`OBJECT_STORAGE_PUBLIC_BASE_URL`). Stores sanitized derivatives (EXIF/GPS metadata stripped).

## Launch

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec app node dist/index.js
```

Run database migrations as a one-off from the application image before first launch. The app is then available at `https://APP_DOMAIN`, with the PWA service worker scoped to the same HTTPS origin.

## Security requirements

- Use long random `SESSION_SECRET` and `OTP_SECRET` values.
- Do not expose the object-storage secret or VAPID private key to the browser.
- Keep the private bucket strictly private for original citizen media; expose only the public bucket via a controlled CDN domain.
- Never expose privatePath, original EXIF coordinates, or reporter identities in public endpoints.
- Use a real provisioned officer account. Production OTP verification allows self-registration only for citizens.

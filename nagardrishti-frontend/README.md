# NagarDrishti

NagarDrishti is a multilingual civic issue reporting platform with an installable citizen PWA and a live officer/public web dashboard.

## Quick Start

```powershell
cd D:\AI-ty\NagarDrishti\nagardrishti-frontend
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
```

Run the API and frontend in separate terminals:

```powershell
pnpm dev:server
pnpm dev
```

- Frontend: `http://localhost:3000`
- API health: `http://localhost:5000/api/health`
- Database health: `http://localhost:5000/api/health/db`

## Documentation

- [Complete project documentation](docs/PROJECT_DOCUMENTATION.md)
- [Four-person task breakdown](docs/TEAM_TASK_BREAKDOWN.md)
- [PWA runbook](docs/PWA_RUNBOOK.md)
- [Production deployment](deploy/PRODUCTION.md)
- [Reproducibility](docs/reproducibility.md)

## Important Security Note

Local development may use the demo role shortcut when `ALLOW_DEMO_LOGIN=true`. Production disables this and requires verified OTP authentication. Never commit `.env` or provider credentials.

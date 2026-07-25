# Flavour Heaven Ordering System

Production-style web ordering system for Flavour Heaven, a 24/7 fast-food cafe in E-11/3 Markaz, Islamabad. The project is being built as a customer ordering website plus a protected staff operations system for order confirmation, kitchen workflow, rider assignment, menu management, tracking, and WhatsApp handoff.

## Current Status

- Customer-facing Next.js web frontend is running locally.
- Staff/admin login, order dashboard, kitchen screen, menu manager, and tracking screens exist in the web app.
- Production database schema has been designed in Prisma for Supabase PostgreSQL.
- Separate FastAPI backend scaffold has been added under `apps/api` for the next production backend slice.
- Supabase connection and live backend runtime testing are the next step.

## Tech Stack

Frontend:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Lucide React icons
- NextAuth credentials flow for the current local staff portal

Backend:

- Current local web APIs: Next.js route handlers under `src/app/api`
- Production backend direction: FastAPI under `apps/api`
- Pydantic request/response contracts
- SQLAlchemy async models
- JWT/secure cookie staff auth design

Database:

- Supabase PostgreSQL target
- Prisma schema and seed data
- UUID primary keys
- PKR integer money fields
- price snapshots on orders
- encrypted customer contact/address fields
- hashed tracking tokens
- audit logs and WhatsApp notification outbox

Operations:

- Customer ordering: delivery, pickup, car-hop
- Staff roles: owner, system admin, manager, cashier, kitchen, rider, menu editor, support
- Order lifecycle: pending, confirmed, preparing, ready, out for delivery, completed, cancelled
- WhatsApp v1: button/manual handoff and outbox-ready confirmation event

## Repository Structure

```text
.
├── apps/
│   └── api/                    # FastAPI backend boundary for production
├── docs/                       # Architecture, database, and workflow docs
├── prisma/                     # Supabase PostgreSQL schema and seed data
├── src/
│   ├── app/                    # Next.js app routes, pages, and route handlers
│   ├── components/             # Customer and staff UI components
│   ├── lib/                    # Shared frontend/domain helpers
│   ├── server/                 # Current Next.js server services
│   └── types/                  # Type declarations
├── middleware.ts               # Staff route protection
├── package.json                # Frontend and repo helper scripts
└── README.md
```

More detail: [Repository Structure](docs/repository-structure.md).

## Local Frontend

```powershell
npm install
npm run dev
```

Open:

- Customer site: `http://127.0.0.1:3000/`
- Staff login: `http://127.0.0.1:3000/admin/login`
- Admin dashboard: `http://127.0.0.1:3000/admin`
- Kitchen board: `http://127.0.0.1:3000/admin/kitchen`

Demo staff login:

```text
owner@flavourheaven.local
Flavour123!
```

Kitchen demo:

```text
kitchen@flavourheaven.local
Flavour123!
```

## Local FastAPI Backend

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

Root helper:

```powershell
npm run api:dev
```

The frontend production API base should be:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Database

The production database target is Supabase PostgreSQL. After configuring `DATABASE_URL`:

```powershell
npm run db:generate
npm run db:push
npm run db:seed
```

Important database docs:

- [Database Table Concept](docs/database-table-concept.md)
- [Production Database Schema](docs/production-database-schema.md)
- [Backend And Frontend Contract](docs/backend-frontend-contract.md)

## Environment Files

Root frontend/server example:

```text
.env.example
```

FastAPI backend example:

```text
apps/api/.env.example
```

Never commit real Supabase credentials, JWT secrets, WhatsApp tokens, or encryption keys.

## Validation

Run these before pushing:

```powershell
npm run api:check
npm run typecheck
npm run build
```

Or run the combined check:

```powershell
npm run check
```

## Git Workflow

Recommended branch flow:

```powershell
git checkout -b feature/<short-name>
npm run check
git add .
git commit -m "Describe the change"
git push -u origin feature/<short-name>
```

For the first repository push:

```powershell
git init
git branch -M main
git remote add origin <github-repo-url>
git push -u origin main
```

## Next Production Steps

1. Connect Supabase PostgreSQL and run the schema/seed.
2. Install and run the FastAPI backend dependencies.
3. Switch the Next.js frontend to consume `NEXT_PUBLIC_API_BASE_URL`.
4. Test staff login, role access, order confirmation, kitchen board, and tracking against the real database.
5. Add Cloudinary/Supabase Storage for real menu and banner images.

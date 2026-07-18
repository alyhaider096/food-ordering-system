# Repository Structure

This repo is organized so the frontend, production backend, database schema, and documentation are clearly separated.

## Top-Level Layout

```text
.
├── apps/
│   └── api/
├── docs/
├── prisma/
├── src/
├── .env.example
├── .gitattributes
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

## Frontend: `src`

- `src/app`: Next.js routes, pages, layouts, API route handlers, tracking, and staff/admin pages.
- `src/components/customer`: customer ordering UI.
- `src/components/admin`: login, order actions, and rider assignment UI.
- `src/lib`: cart, menu, phone, and shared type helpers.
- `src/server`: current Next.js server-side services for auth, menu, orders, Prisma, and private data handling.
- `src/types`: app-level TypeScript declarations.

## Backend: `apps/api`

- `app/main.py`: FastAPI application factory and middleware.
- `app/api/routes`: public and staff API route modules.
- `app/api/deps.py`: staff auth dependency.
- `app/core`: backend settings and security helpers.
- `app/db`: SQLAlchemy models and async session setup.
- `app/schemas`: Pydantic request/response models.
- `app/services`: menu, order, auth, RBAC, and staff operation services.
- `app/utils`: backend utility helpers.

## Database: `prisma`

- `schema.prisma`: production Supabase PostgreSQL schema.
- `seed.mjs`: seed data for business profile, E-11 outlet, staff roles, demo staff, menu, delivery zones, banners, promotions, and notification templates.

## Docs: `docs`

- `backend-frontend-contract.md`: frontend/backend boundary and API ownership.
- `production-database-schema.md`: table groups, security rules, and order confirmation flow.
- `repository-structure.md`: this file.
- `tech-stack.md`: technical stack and why each piece is used.
- `development-workflow.md`: local workflow, validation, and Git handoff.

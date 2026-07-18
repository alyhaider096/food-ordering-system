# Development Workflow

## Daily Local Commands

Frontend:

```powershell
npm run dev
```

Backend syntax check:

```powershell
npm run api:check
```

TypeScript:

```powershell
npm run typecheck
```

Production build:

```powershell
npm run build
```

Combined check:

```powershell
npm run check
```

## Git Handoff

Before pushing a branch:

```powershell
npm run check
git status
git add .
git commit -m "Meaningful message"
git push
```

## Backend/Supabase Slice

Next implementation slice:

1. Add Supabase `DATABASE_URL`.
2. Run `npm run db:generate`.
3. Run `npm run db:push`.
4. Run `npm run db:seed`.
5. Install FastAPI dependencies in `apps/api`.
6. Run `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
7. Point frontend calls to `NEXT_PUBLIC_API_BASE_URL`.
8. Test login, RBAC, order confirmation, kitchen board, tracking, and WhatsApp outbox.

## Definition Of Done

- Customer can place delivery, pickup, and car-hop orders.
- Staff login works.
- Cashier/manager can confirm an order.
- Confirmation writes status event, audit log, and WhatsApp outbox.
- Kitchen sees only kitchen statuses.
- Rider sees only assigned delivery orders.
- Tracking page works only with a valid token.
- `npm run check` passes.

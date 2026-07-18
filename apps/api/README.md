# Flavour Heaven FastAPI Backend

This service is the production backend boundary for the Flavour Heaven web ordering system. The Next.js customer/staff frontend should call this API and should not connect directly to Supabase PostgreSQL.

## Local Setup

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open API docs at `http://127.0.0.1:8000/docs`.

## Required Environment

- `API_DATABASE_URL`: Supabase Postgres async URL, using `postgresql+asyncpg://`.
- `API_SECRET_KEY`: long random key for staff access-token signing.
- `CUSTOMER_DATA_KEY`: long random key for phone/address/tracking-token encryption and hashes.
- `FRONTEND_ORIGIN`: the Next.js origin allowed by CORS.
- `PUBLIC_APP_URL`: public customer website URL used in tracking links.
- `FLAVOUR_HEAVEN_BUSINESS_SLUG`: seeded business slug, default `flavour-heaven`.
- `FLAVOUR_HEAVEN_OUTLET_SLUG`: seeded outlet slug, default `e-11-markaz`.

## Public Endpoints

- `GET /api/v1/public/menu`: active categories, items, variants, add-ons, and delivery zones.
- `POST /api/v1/public/orders`: validates cart, recalculates prices, saves order, returns reference/tracking/WhatsApp URLs.
- `GET /api/v1/public/orders/{reference}?token=...`: returns masked tracking data only when the token hash matches.

## Staff Endpoints

- `POST /api/v1/staff/auth/login`: staff email/password login. Sets secure `fh_staff_access` cookie.
- `POST /api/v1/staff/auth/logout`: clears staff cookie.
- `GET /api/v1/staff/auth/me`: current staff profile, role, capabilities, and default dashboard.
- `GET /api/v1/staff/orders`: role-filtered order dashboard.
- `GET /api/v1/staff/orders/{id}`: role-filtered order detail.
- `PATCH /api/v1/staff/orders/{id}/status`: moves orders through allowed lifecycle transitions.
- `POST /api/v1/staff/orders/{id}/assign-rider`: manager/cashier rider assignment for delivery orders.
- `GET /api/v1/staff/orders/riders`: active rider list for assignment.
- `GET /api/v1/staff/menu`: protected menu feed for menu editors/managers.

## Security Rules

- Staff role checks are enforced inside the backend service layer, not only in the UI.
- Public tracking tokens are stored as hashes; encrypted copies are used only to build outbound links.
- Customer phone/address values are encrypted, with hashes used for lookup.
- Confirming an order writes the status update, audit log, and WhatsApp outbox event in the backend.

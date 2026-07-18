# Backend And Frontend Split

The production architecture is:

```mermaid
flowchart LR
  Customer["Customer Browser"] --> Web["Next.js Frontend"]
  Staff["Staff Browser"] --> Web
  Web --> API["FastAPI Backend"]
  API --> DB[("Supabase PostgreSQL")]
  API --> Outbox["notification_outbox"]
  Worker["WhatsApp Worker"] --> Outbox
  Worker --> WhatsApp["WhatsApp Business API"]
```

## Boundary

- Next.js owns pages, UI, cart state, and staff screens.
- FastAPI owns authentication, authorization, price recalculation, order creation, status transitions, and private data access.
- Supabase PostgreSQL is reachable only by backend/server environments.

## Frontend Environment

The frontend should use:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

All order/menu/staff calls should go through that base URL.

## Backend Environment

The backend should use:

```env
API_DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres
FRONTEND_ORIGIN=http://127.0.0.1:3000
PUBLIC_APP_URL=http://127.0.0.1:3000
```

For Supabase, keep service credentials in the backend environment only.

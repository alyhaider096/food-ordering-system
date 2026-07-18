# Tech Stack

## Frontend

- Next.js 16 App Router for the web application, routing, server rendering, and route handlers.
- React 19 for customer and staff UI.
- TypeScript for safer frontend and server code.
- Tailwind CSS for the yellow/white Flavour Heaven UI system.
- Lucide React for consistent action icons.
- NextAuth credentials provider for the current local staff login flow.

## Backend

- Current local backend: Next.js API route handlers, used while the frontend is still integrated.
- Production backend: FastAPI in `apps/api`.
- Pydantic for request validation and response contracts.
- SQLAlchemy async models for the production Supabase PostgreSQL tables.
- JWT signed staff access tokens stored in secure HttpOnly cookies.

## Database

- Supabase PostgreSQL is the target production database.
- Prisma is used for schema management and seed data from the current Node/Next workspace.
- UUID IDs are used for production-style records.
- Money is stored as integer PKR.
- Customer phone/address fields are encrypted.
- Tracking links use hashed tokens.
- Orders use price snapshots so old order totals never change after menu edits.

## Security

- Backend owns database access.
- Frontend should never receive database credentials.
- Staff routes require authentication and RBAC checks.
- Public tracking requires `reference + token`.
- Audit logs record operational staff actions.
- WhatsApp messages are queued through `notification_outbox`.

## Deployment Direction

- Frontend: Vercel or equivalent Next.js hosting.
- Backend: Render, Railway, Fly.io, or another Python/FastAPI host.
- Database: Supabase PostgreSQL.
- Images: Supabase Storage or Cloudinary.
- Messaging: WhatsApp Business API after business verification; manual WhatsApp handoff remains v1 fallback.

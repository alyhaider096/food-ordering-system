# Four-Week Roadmap And Cost Plan

## Purpose

This document defines the first four-week build plan for Flavour Heaven and the realistic running costs for the system with and without a backend.

The goal for the first version is not a small laptop demo. The goal is a strong first business version that includes frontend, backend, database, admin roles, security, order flow, menu management, and a showcase-ready experience. After the four-week showcase, the business can give feedback, then we move into production hosting, domain connection, and final go-live.

Pricing was checked on 2026-07-17. Most provider pricing is in USD, so PKR estimates use about `1 USD = 279 PKR` based on the Pakistan open-market rate checked the same day. Final PKR cost can change with exchange rate and provider billing.

## Final First-Version Decisions

| Area | Decision |
| --- | --- |
| Database | Required for the first real version |
| Database provider | Supabase Postgres recommended |
| Backend | Required for orders, admin, roles, tracking, audit logs, and security |
| No-backend option | Only acceptable for a simple static menu plus WhatsApp button, not for the cafe operations system |
| WhatsApp phase 1 | Customer confirms order in the app, order is saved in database, then customer sends the generated WhatsApp message by button |
| WhatsApp API | Later phase after business verification, opt-in handling, and template approval |
| Hosting timing | Build and test during four weeks; production hosting after client feedback unless they want staging earlier |
| Domain | If they already own a domain, prepare DNS plan during week 4; connect production domain after approval |
| Images/logo | Business should provide real logo and food photos during week 1 or 2 |

## Why The Database Is Required

A real cafe ordering system needs a database because the business must not depend only on a WhatsApp message.

The database stores:

- Menu items, categories, add-ons, prices, availability, and images.
- Orders, order items, selected add-ons, order totals, and customer details.
- Delivery, Pick-Up, and Car-Hop information.
- Order status changes and tracking.
- Staff accounts, roles, and sessions.
- Audit logs for price changes, menu edits, cancellations, and status updates.
- Reporting data for sales and operational decisions.

Without a database:

- There is no reliable order history.
- Staff cannot manage order status.
- Kitchen cannot see a queue.
- Menu prices cannot be safely edited from an admin panel.
- Role-based staff screens do not work properly.
- URL security is weak because there is no real session/permission model.
- If the customer does not send the WhatsApp message, the order may be lost.

## Backend Vs No Backend Cost

### Option A: No Backend / Static Menu

This means:

- Public menu pages.
- Cart in browser memory only.
- WhatsApp button with pre-filled message.
- No database order record.
- No admin dashboard.
- No kitchen screen.
- No real tracking.
- No role-based screens.

Estimated monthly cost:

| Item | USD/month | Approx PKR/month | Notes |
| --- | ---: | ---: | --- |
| Vercel Pro or equivalent business hosting | 20 | 5,580 | Vercel Pro is the safer business choice; free tier is fine for demos |
| Image hosting | 0 | 0 | Cloudinary free may be enough early |
| Database | 0 | 0 | No database |
| Monitoring | 0 | 0 | Free Sentry/UptimeRobot style plans can be enough early |
| Domain | Usually annual | Usually annual | If they own it, no new domain purchase needed |

Expected total:

- About `$20/month` or `PKR 5,600/month`, plus domain cost if needed.

Verdict:

- Good only for a brochure/menu demo.
- Not recommended for the actual cafe operation because it cannot safely manage orders and staff.

### Option B: Proper Backend MVP

This means:

- Customer website.
- Order database.
- Admin login.
- Role-based screens.
- Menu management.
- Kitchen/cashier workflows.
- Order tracking.
- Audit logs.
- WhatsApp button handoff.
- Production security foundation.

Estimated monthly cost:

| Item | USD/month | Approx PKR/month | Notes |
| --- | ---: | ---: | --- |
| Vercel Pro | 20 | 5,580 | Next.js hosting, CDN, HTTPS, deploy previews |
| Supabase Pro | 25 | 6,980 | Managed Postgres, daily backups, project does not pause |
| Cloudinary Free | 0 | 0 | Good enough at start if image volume is modest |
| Sentry/free monitoring | 0 | 0 | Upgrade only if needed |
| Domain | Usually annual | Usually annual | Connect after feedback/go-live decision |

Expected total:

- About `$45/month` or `PKR 12,600/month`, plus domain cost if needed.

Recommended for first production version.

### Option C: Backend With Heavier Media Or Higher Safety

Add-ons that may come later:

| Item | USD/month | Approx PKR/month | When needed |
| --- | ---: | ---: | --- |
| Cloudinary Plus | 99 | 27,620 | If image/media usage outgrows free plan or business wants paid support/features |
| Supabase PITR | 100 | 27,900 | If they want point-in-time recovery beyond daily backups |
| Vercel extra usage | Variable | Variable | Only if traffic/compute exceeds included usage |
| WhatsApp API | Usage-based | Usage-based | Only after official WhatsApp Business setup |

With Cloudinary Plus:

- `$144/month` or about `PKR 40,200/month`.

With Cloudinary Plus and Supabase PITR:

- `$244/month` or about `PKR 68,100/month`.

For the first cafe version, start with Option B and only upgrade if usage or risk demands it.

## WhatsApp Plan

### Phase 1: Button-Based WhatsApp

This is the correct first version.

Flow:

1. Customer reviews the order.
2. Customer clicks Confirm.
3. Backend validates prices, add-ons, order type, phone, and address.
4. Backend saves the order in PostgreSQL.
5. App shows the confirmed screen with order reference and tracking link.
6. App shows a "Send Order On WhatsApp" button.
7. Button opens WhatsApp with a pre-filled message to `0300-5055377`.

Important behavior:

- The order is already saved before WhatsApp opens.
- If WhatsApp does not open, staff can still see the order in the dashboard.
- On desktop, the link opens WhatsApp Web.
- On mobile, the link opens WhatsApp app or mobile web.
- The customer still manually taps Send inside WhatsApp.

Recommended link:

```text
https://wa.me/923005055377?text=<encoded-order-message>
```

The message should include:

- Order reference.
- Customer name.
- Phone.
- Order type.
- Delivery address or car details if applicable.
- Items, quantities, and add-ons.
- Special instructions.
- Total.
- Tracking link.

### Phase 2: Official WhatsApp API

Do this after the first version and feedback.

Reasons:

- WhatsApp Business API usually needs business setup/verification.
- Business-initiated updates may need approved templates.
- Customer opt-in is required.
- Template approval can delay launch.
- API messages add usage-based cost.

When enabled:

- Use Twilio or Meta Cloud API.
- Add opt-in checkbox at checkout.
- Send order confirmation/status updates automatically.
- Use webhook status callbacks.
- Retry failed messages through notification outbox.

## URL And Login Security

This must be strong from the first backend version.

### Rule

Changing the URL must never give access to another protected screen.

Example:

- Cashier manually types `/admin/settings`.
- Server checks role.
- Cashier gets `403 Forbidden` or redirect to dashboard.
- Settings data is never sent to the browser.

### Implementation

Use three layers:

1. Route protection.
2. Server-side permission checks.
3. UI hiding for convenience.

Route protection:

- `/admin/*` requires logged-in staff session.
- `/admin/kitchen/*` requires `KITCHEN`, `MANAGER`, or `OWNER`.
- `/admin/reports/*` requires `MANAGER` or `OWNER`.
- `/admin/staff/*` requires `OWNER` or `SYSTEM_ADMIN`.

Server-side checks:

- Every API mutation checks the session and role.
- Every data query filters by permission.
- Riders can only load assigned delivery orders.
- Kitchen can only load kitchen-relevant order data.
- Customer tracking uses `reference + tracking_token`, not only order ID.

UI checks:

- Hide unavailable navigation items.
- Disable unavailable actions.
- Show a clear unauthorized screen if a link is opened manually.

Important:

- UI hiding is not security by itself.
- Security must live in the backend policies.

### API Response Rules

| Case | Response |
| --- | --- |
| Not logged in | `401 Unauthorized` or redirect to login |
| Logged in but wrong role | `403 Forbidden` |
| Order does not belong to rider/customer token | `404 Not Found` or `403 Forbidden` |
| Invalid input | `400 Bad Request` with safe validation message |
| Rate limited | `429 Too Many Requests` |

## Four-Week Build Plan

The four weeks are enough for a strong first version if the scope is controlled and the business provides menu data, images, logo, delivery zones, and feedback quickly.

### Week 1: Foundation, Database, And Core Design

Goal:

- Lock the structure and build the base app correctly.

Modules:

- Project setup with Next.js, TypeScript, Tailwind, shadcn/ui, Prisma.
- Database schema for users, roles, menu, categories, add-ons, orders, order items, status events, image assets, audit logs.
- Supabase dev/staging database setup.
- Auth.js setup with staff login and database sessions.
- RBAC policy functions.
- Customer design system: yellow/warm neutral theme, no red branding.
- Customer start screen: Delivery, Pick-Up, Car-Hop.
- Menu browser skeleton.
- Cart state and item customization base.

Deliverables:

- Running local app.
- Database migrations.
- Seed data.
- Login works.
- First customer screens visible.
- First admin shell visible but protected.

Business input needed:

- Logo.
- Menu categories and items.
- Current prices.
- Add-ons.
- Delivery areas and fees.
- Staff role names.
- At least sample food images.

### Week 2: Customer Ordering And Backend Order Flow

Goal:

- Make the customer order flow fully functional with backend persistence.

Modules:

- Public menu API.
- Menu item detail/customization.
- Cart screen.
- Checkout details.
- Server-side price calculation.
- Order creation transaction.
- Order reference generation.
- Order success screen.
- Tracking page with secure token.
- Delivery/Pick-Up/Car-Hop validation.
- WhatsApp message generator.

Deliverables:

- Customer can place a real database-backed order.
- Confirmed screen appears after order save.
- WhatsApp button opens pre-filled order message.
- Tracking page works.
- Cart survives validation errors.

Security checks:

- Server recalculates total.
- Special instructions length limit.
- Phone/address validation.
- Tracking page protected by token.
- Basic rate limiting for order creation.

### Week 3: Staff Operations, Menu Management, And Images

Goal:

- Make the cafe side usable by real staff.

Modules:

- Operations dashboard.
- Live orders list.
- Order detail screen.
- Order status lifecycle.
- Kitchen display screen.
- Cashier/manual order entry.
- Rider assigned orders screen.
- Menu manager.
- Category manager.
- Add-on manager.
- Image upload and menu image assignment.
- Audit logs for staff actions.

Deliverables:

- Owner/manager/cashier can manage orders.
- Kitchen can move orders through preparation.
- Rider can see assigned deliveries only.
- Menu editor can update items/images.
- Price changes do not affect old orders.

Security checks:

- Manual URL access blocked by role.
- API rejects unauthorized status changes.
- Rider cannot load unassigned order.
- Menu editor cannot access staff management.
- Audit logs written for key changes.

### Week 4: Polish, Testing, Showcase, And Hosting Readiness

Goal:

- Make it demo-ready, secure, responsive, and ready for production feedback.

Modules:

- Responsive polish for mobile, tablet, desktop.
- Real images/logo integration if provided.
- Loading, empty, error, and offline states.
- E2E tests for customer order flow.
- E2E tests for admin order flow.
- Security tests for protected routes.
- Image upload validation tests.
- Performance pass.
- Staging/preview deployment if desired.
- Hosting/domain checklist.
- Showcase script and feedback checklist.

Deliverables:

- Showcase-ready app.
- Test data and demo accounts.
- Known limitations list.
- Hosting readiness checklist.
- Feedback collection plan.

After showcase:

- Collect business feedback.
- Adjust UI/menu/workflows.
- Prepare production database.
- Connect domain.
- Set production environment variables.
- Configure backups and monitoring.
- Go live.

## Module Breakdown

### Customer Module

Screens:

- Start order.
- Delivery location.
- Menu browser.
- Item detail.
- Cart.
- Checkout.
- Review.
- Success.
- Tracking.
- Business info.

### Admin/Auth Module

Screens:

- Staff login.
- Unauthorized screen.
- Admin layout.
- Role-aware navigation.

Backend:

- Auth.js sessions.
- RBAC policies.
- Secure route middleware.
- Audit logging.

### Menu Module

Screens:

- Category manager.
- Item manager.
- Item editor.
- Add-on manager.
- Image library.

Backend:

- Menu CRUD.
- Image upload validation.
- Price snapshot rules.

### Order Module

Screens:

- Operations dashboard.
- Order detail.
- Kitchen board.
- Cashier order entry.
- Rider screen.
- Tracking screen.

Backend:

- Order creation transaction.
- Status transitions.
- Order events.
- Staff permissions.
- WhatsApp message generator.

### Security/Production Module

Features:

- Rate limiting.
- Validation.
- Security headers.
- Encrypted sensitive fields.
- Backups.
- Monitoring.
- Error logging.
- Deployment checklist.

## Showcase Plan

Show these flows:

1. Customer places delivery order on mobile.
2. Customer sends generated WhatsApp message.
3. Cashier sees new order.
4. Kitchen marks order preparing and ready.
5. Rider sees assigned delivery.
6. Customer tracking page updates.
7. Manager edits menu price/image.
8. Unauthorized user tries a protected URL and gets blocked.
9. Owner views reports/audit log.

## Feedback Questions For The Business

Ask:

- Are the order types correct?
- Are delivery zones and fees correct?
- Is the menu structure correct?
- Are item add-ons correct?
- Are kitchen statuses natural for staff?
- Should cashier confirm every order or should some auto-confirm?
- What order print format do they need?
- Do they want WhatsApp API later?
- Do they already own a domain?
- Who will be owner/admin?
- Which staff need which roles?

## Recommended Path

Build the proper backend MVP from the start.

Use:

- Next.js frontend/backend.
- Supabase Postgres.
- Prisma.
- Auth.js.
- Cloudinary free or Supabase Storage for initial images.
- WhatsApp button handoff in version 1.

Expected first real monthly cost:

- About `$45/month`, around `PKR 12,600/month`, plus domain if needed.

This gives the cafe a real operational system while keeping WhatsApp API, online payments, loyalty, and advanced reporting as later upgrades.

## Sources Checked

- [Vercel pricing](https://vercel.com/pricing)
- [Supabase pricing](https://supabase.com/pricing)
- [Cloudinary pricing](https://cloudinary.com/pricing)
- [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing?locale=en)
- [USD to PKR open market rate](https://www.forex.pk/currency-usd-to-pkr-to-us-dollar.php)

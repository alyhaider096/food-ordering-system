# Flavour Heaven Production Database Schema

This schema is designed for Supabase PostgreSQL with the database accessed only by the backend. The current Next.js implementation uses Prisma model names for compatibility, while the database table and column names are mapped to production-style snake_case tables.

## Ownership And Access

- Frontend clients must call backend APIs only. No frontend code should use `DATABASE_URL`.
- Staff access is stored through `staff_users`, `roles`, `permissions`, `role_permissions`, and `staff_user_roles`.
- Every protected staff API must authorize against backend permissions, even if the frontend hides a button or page.
- Public order tracking uses a raw token only in the customer URL. The database stores `tracking_token_hash` and `tracking_token_enc`, never the raw token.

## Main Table Groups

- Business setup: `businesses`, `outlets`, `business_settings`.
- Staff security: `staff_users`, `roles`, `permissions`, `role_permissions`, `staff_user_roles`, `staff_sessions`.
- Menu/content: `media_assets`, `menu_categories`, `menu_items`, `item_variants`, `modifier_groups`, `modifiers`, `menu_item_add_ons`, `menu_item_modifier_groups`, `modifier_group_dependencies`, `homepage_banners`, `promotions`.
- Customer/location: `customers`, `customer_addresses`, `delivery_zones`.
- Ordering: `orders`, `order_addresses`, `order_items`, `order_item_modifiers`.
- Operations: `order_status_events`, `delivery_assignments`, `rider_locations`, `order_payments`.
- Messaging: `notification_templates`, `notification_outbox`.
- Reliability/security: `audit_logs`, `security_events`, `idempotency_keys`.

## Order Confirmation Flow

When a cashier or manager confirms an order, the backend should perform one transaction:

1. Lock and verify the `orders` row is still `PENDING`.
2. Update `orders.status` to `CONFIRMED`.
3. Set `orders.confirmed_by_staff_id` and `orders.confirmed_at`.
4. Insert an `order_status_events` row.
5. Insert an `audit_logs` row.
6. Insert a `notification_outbox` row for WhatsApp confirmation.

The WhatsApp worker should process `notification_outbox` rows with `status = PENDING`, update attempt fields, and never block the dashboard if the provider is slow.

## Delivery Fee Rule

Seed data makes all E-11 zones free delivery with `fee_pkr = 0`. Other Islamabad zones can carry paid delivery fees and minimum order rules through `delivery_zones.minimum_order_pkr` and `delivery_zones.free_delivery_min_pkr`.

## Price History

Orders use snapshots:

- `order_items.item_name_snapshot`
- `order_items.unit_price_pkr_snapshot`
- `order_items.compare_at_price_pkr_snapshot`
- `order_item_modifiers.modifier_name_snapshot`
- `order_item_modifiers.unit_price_delta_pkr_snapshot`

Changing menu prices later affects only future orders.

# Competitor Benchmark: Kitchen Krust And Anatummy

## Purpose

This document studies the ordering experience of two local fast-food competitors:

- Kitchen Krust: `https://kitchenkrust.com/`
- Anatummy: `https://www.anatummy.com.pk/`

The goal is not to copy them directly. The goal is to understand what customers already expect from Islamabad/Rawalpindi fast-food ordering websites, then design Flavour Heaven to feel more polished, faster, more trustworthy, and more operationally complete.

Research inputs:

- Direct browser inspection on 2026-07-17.
- User-provided screenshots of both websites.
- Public visible page content only.
- No real customer data, precise location, checkout, or order submission was entered.

## High-Level Takeaway

Both competitors start with an order-type and location gate before the customer can fully proceed. This is now a familiar pattern in local food ordering websites, so Flavour Heaven should use it, but improve it.

Flavour Heaven should be better by:

- Showing the customer food and menu value faster.
- Supporting Delivery, Pick-Up, and Car-Hop from the first screen.
- Saving orders in the database before WhatsApp handoff.
- Making location selection faster and clearer.
- Using real Flavour Heaven food images as a strong first impression.
- Providing a proper staff backend, kitchen display, rider screen, and role-based admin system.
- Blocking protected URLs with server-side authentication and role checks.

## Kitchen Krust Analysis

### Observed Structure

Kitchen Krust opens with a centered order-type modal over a blurred promotional/food background.

Visible first-step flow:

- Logo at top of modal.
- Heading: select order type.
- Order types: Delivery and Pick-Up.
- Current location button.
- Location dropdown/input.
- Disabled Select button until a location is chosen.

Behind the modal, the site loads a complete ordering page:

- Header with brand/logo.
- Delivery label and phone number.
- Large hero/banner carousel.
- Carousel controls and slide indicators.
- Horizontal category navigation.
- Search field with animated suggestions.
- Promotion block.
- Popular items section.
- Product cards with images, descriptions, prices, discounts, tags, and add-to-cart buttons.

Observed categories include:

- Starters.
- Love You Deals.
- Family Deals.
- Mac and Cheese.
- Pizza.
- Chicken Burgers.
- Beef Burgers.
- Fries.
- Wrap.
- Combos.
- Chillers.
- Add Ons.

Observed product/card patterns:

- Product image.
- Product name.
- Short description.
- Price or "From" price.
- Discounted original/current prices on some items.
- Tags such as best seller or popular.
- Add-to-cart button.

### Visual Language

Style:

- Strong orange brand color.
- White modal.
- Blurred/dimmed background overlay.
- Large rounded modal with heavy shadow.
- Rounded segmented order-type buttons.
- Poppins font.
- Food photography and deal banners are central to the experience.

Approximate visual tokens observed:

- Orange primary similar to `rgb(241, 102, 35)`.
- White cards/modal.
- Dark neutral body text.
- Peach disabled/secondary button states.
- Rounded modal around 24px.
- Button radius around 14-16px.

### Strengths

- Strong food-first impression from banners and menu images.
- Category navigation is broad and useful.
- Search exists near the menu.
- Promo/deal messaging is prominent.
- Popular items section helps quick ordering.
- Product cards contain enough information for decision-making.
- Discounted prices create urgency.
- Add-to-cart controls are direct.

### Weaknesses

- The first modal blocks the menu, even though the menu is already loaded behind it.
- Delivery and Pick-Up are visible, but Car-Hop was not shown in the captured modal.
- The blurred background makes the underlying offer visually exciting but unreadable.
- Location is a required early blocker, which can slow hungry customers.
- Current-location flow can feel uncertain if it shows loading/getting location.
- Orange branding is energetic, but Flavour Heaven should not copy this because our chosen brand direction is yellow/warm neutral.
- The modal is functional but not very business-specific; it feels like a template ordering platform.

## Anatummy Analysis

### Observed Structure

Anatummy opens with a centered white modal over a muted gray overlay. The menu appears hidden or skeleton-loading behind the location gate.

Visible first-step flow:

- Header with "Delivery to".
- Cart count.
- Sign In / Register link.
- Logo centered in modal.
- Heading: select order type.
- Order types: Delivery, Pick-Up, Car-Hop.
- Current location button.
- City/region selector.
- Disabled Select button until required location information is chosen.

Observed city/region options:

- Islamabad.
- Rawalpindi.

After selecting Islamabad, the form asks for:

- Area / Sub Region.

### Visual Language

Style:

- Clean white modal.
- Gray dimmed background.
- Burnt orange/brown top header strip.
- Teal active delivery button.
- White outline pills for inactive order types.
- Material UI style autocomplete fields.
- Poppins/Roboto-style typography.
- Rounded card around 12-14px.
- Disabled button in light gray.

### Strengths

- Supports Delivery, Pick-Up, and Car-Hop from the beginning.
- Sign In / Register suggests customer accounts and saved details.
- City then area/sub-region is clearer than a single vague location input.
- Clean modal is easy to understand.
- Active order type has strong contrast.
- The flow feels simple and standard.

### Weaknesses

- The first screen is less appetizing because food imagery is mostly hidden behind the overlay.
- The gray background and white modal feel generic.
- The location gate hides too much of the menu too early.
- The "Fetching Location" state can create uncertainty.
- The customer cannot evaluate menu/prices before selecting location.
- The brand signal is weaker than it could be; the logo is present, but food and offer signals are not strong.
- The modal has good structure but little personality.

## Side-By-Side Comparison

| Area | Kitchen Krust | Anatummy | Flavour Heaven Target |
| --- | --- | --- | --- |
| First impression | Food/promo-heavy, orange, energetic | Clean modal, subdued, account-focused | Food-first, warm yellow, premium-local, faster to menu |
| Order types | Delivery, Pick-Up observed | Delivery, Pick-Up, Car-Hop | Delivery, Pick-Up, Car-Hop |
| Location flow | Single location selector plus current location | City then area/sub-region plus current location | Searchable delivery area, address details later, remembered recent area |
| Menu visibility | Menu loads behind modal | Mostly hidden/skeleton behind modal | Let customer see categories/promos before full checkout gate |
| Brand color | Orange | Teal + burnt orange header | Yellow/warm neutral with brown text, red only for errors |
| Menu navigation | Strong horizontal categories | Not fully inspected beyond gate | Sticky categories, search, popular, deals, combos |
| Product cards | Rich with images, prices, discounts, tags | Hidden behind gate in observed state | Rich cards with photos, "from" prices, tags, add button |
| Account flow | Not prominent in observed state | Sign In/Register visible | Guest checkout first, optional staff/admin login separate |
| Backend operations | Public ordering visible | Public ordering visible | Public ordering plus full staff/kitchen/rider backend |
| Security target | Unknown from public view | Unknown from public view | Server-side RBAC and protected URLs from first backend version |

## What Flavour Heaven Should Learn

### Patterns Worth Using

Use these ideas:

- First-step order type selection.
- Delivery, Pick-Up, and Car-Hop as pill/card choices.
- Current location option.
- City/area delivery validation.
- Sticky or horizontal category navigation.
- Search near the menu.
- Popular items section.
- Deal/promo section.
- Product cards with strong food photos.
- "From Rs." pricing for items with size/variant choices.
- Discount display when applicable.
- Best seller/popular tags.
- Large mobile-friendly add-to-cart buttons.

### Patterns To Improve

Do better than competitors:

- Do not make the first modal feel like a wall.
- Let users browse menu and offers quickly, even if delivery area is still pending.
- Require location before checkout, not before every menu impression.
- If location is required at the start, make the modal richer with food, contact, and "browse menu first" option.
- Make current-location state clear: idle, requesting permission, received, unavailable.
- Do not leave users stuck on "fetching location".
- Make delivery zones searchable by Islamabad sector.
- Show Flavour Heaven contact and open 24/7 clearly.
- Keep WhatsApp handoff as a clear post-confirmation action.
- Save order in database first, unlike a pure WhatsApp-only flow.
- Give staff a real backend so the business can actually operate from the system.

## Recommended Flavour Heaven Customer Flow

### First Screen

Do:

- Header with Flavour Heaven logo, Open 24/7, call button.
- Large real food image or promo banner from the business.
- Three clear order options: Delivery, Pick-Up, Car-Hop.
- A compact delivery area selector if Delivery is chosen.
- A "Browse Menu" path so customers can see food quickly.
- Sticky cart button after first add.

Avoid:

- Generic gray overlay.
- Fully blocking the menu for too long.
- Red brand color.
- Weak food imagery.

### Delivery Location

Recommended flow:

1. Select order type.
2. If Delivery, choose area/sector quickly.
3. Let customer browse menu.
4. At checkout, collect full address and landmark.

Fields:

- Delivery area/sector.
- Full address at checkout.
- Nearest landmark.
- Phone number.

Enhancement:

- Remember last selected area in browser storage.
- Show delivery fee and estimated time as soon as area is selected.

### Menu

Required sections:

- Popular.
- Deals/Combos.
- Shawarma.
- Burgers.
- Pizza.
- Fries/Sides.
- Drinks.
- Add-ons.

Required controls:

- Sticky category tabs.
- Search.
- Filters for popular/deals/available.
- Product card image.
- Name.
- Short description.
- Price.
- Tags: Popular, New, Spicy, Deal, Best Seller.
- Add button.

### Item Detail

Better than competitors:

- Variant selector where needed.
- Add-ons with prices.
- Quantity stepper.
- Item instructions.
- Clear final item price.
- Large food image.

### Checkout And WhatsApp

Flow:

1. Customer confirms inside Flavour Heaven app.
2. Backend saves order to database.
3. Success page shows order reference.
4. Customer sees "Send Order On WhatsApp".
5. Desktop opens WhatsApp Web; mobile opens WhatsApp app/mobile web.
6. Staff still sees the order even if WhatsApp is not sent.

This beats a WhatsApp-only flow because the order is durable before the message handoff.

## Recommended Flavour Heaven Design Direction

### Brand Positioning

Flavour Heaven should feel:

- Warmer than Anatummy.
- Cleaner and more premium than Kitchen Krust.
- More food-forward than both.
- More operationally trustworthy than both.

### Color Direction

Use:

- Yellow primary: `#F59E0B`.
- Warm brown: `#92400E`.
- Dark text: `#292524`.
- Warm gray: `#78716C`.
- White cards.
- Soft warm background: `#FAFAF9`.
- Green for success.
- Red only for errors/destructive actions.

Do not copy:

- Kitchen Krust's orange-heavy identity.
- Anatummy's teal active state.
- Generic gray overlay as the main mood.

### Layout Direction

Customer:

- App-like ordering interface.
- Compact but appetizing.
- Mobile-first.
- Sticky cart and category controls.
- Real food images first.
- Fast browse-to-cart path.

Admin/staff:

- Dense, operational, low decoration.
- Fast order scanning.
- Role-specific screens.
- Clear status colors.
- No marketing-style hero in staff tools.

## Feature Targets To Beat Them

### Customer Experience

- Browse menu without feeling trapped by location modal.
- Delivery fee and ETA shown early.
- Guest checkout first.
- WhatsApp button after database confirmation.
- Real-time tracking page.
- Better Car-Hop support.
- Clear business info: address, phone, Open 24/7.

### Staff Experience

Competitor public sites show customer ordering, but Flavour Heaven should win with operations:

- Cashier dashboard.
- Kitchen display screen.
- Rider screen.
- Menu/image manager.
- Role-based access.
- Audit logs.
- Sales report.
- Manual phone/counter order entry.

### Security

Must beat generic ordering templates by doing:

- Server-side session checks.
- Server-side role checks.
- Protected admin URLs.
- 401/403 responses for unauthorized access.
- Tracking token for customer order tracking.
- Rate limiting.
- Input validation.
- Audit logs.
- No sensitive data in logs.

## Risks And Opportunities

### Risk

If we copy competitor modal behavior too closely, Flavour Heaven will feel like another template website.

### Opportunity

If we combine:

- Kitchen Krust's rich food/catalog energy.
- Anatummy's clean three-order-type flow.
- Our production backend, role security, staff screens, and database-first WhatsApp handoff.

Then Flavour Heaven can feel more complete than both competitors.

## Action Items For Flavour Heaven Design

1. Build a first-screen order selector with Delivery, Pick-Up, and Car-Hop.
2. Add a "Browse Menu" path so the customer sees food quickly.
3. Use real Flavour Heaven food photos in the first viewport.
4. Build sticky categories and search.
5. Add deals/popular sections before full category list.
6. Use product cards with images, prices, add-ons, tags, and add button.
7. Require full address at checkout, not before menu browsing.
8. Save order to database before opening WhatsApp.
9. Build role-protected staff screens from the beginning.
10. Test manual URL access for every protected route.

## Sources

- [Kitchen Krust](https://kitchenkrust.com/)
- [Anatummy](https://www.anatummy.com.pk/)

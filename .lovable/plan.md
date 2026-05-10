
# Toolsman Platform Overhaul — Phased Plan

This is a very large request (16 distinct work-areas, schema changes, edge functions, OAuth branding, performance pass). Doing it "all in one go" risks regressions like last time. I propose 4 phases with checkpoints. Each phase ends in a working, testable build.

---

## Phase 1 — Data Model & Account Foundations
Sets up everything later phases depend on (saved addresses, payment methods, profile name split, avatars).

**DB migrations:**
- `profiles`: add `first_name`, `middle_name`, `last_name`, `avatar_url` (already exists). Backfill `full_name` → split. Keep `full_name` as generated/derived.
- New table `user_addresses` (user_id, label, full_name, phone, county, town, address, apartment, notes, is_default) + RLS.
- New table `user_payment_methods` (user_id, type: `mpesa`|`card`, mpesa_number, card_last4, card_brand, card_holder, exp_month, exp_year, is_default) + RLS. Cards stored as last4 + brand only (no PAN/CVV — masked display).
- Storage bucket `avatars` (public) + RLS for owner upload.

**Account page (#5, #6, #7, #9):**
- Profile tab: First/Middle/Last fields, avatar uploader (preview, client-side resize to 512×512, compress to webp).
- Addresses tab: list, add, edit, delete, set default. Fix space-typing bug (it's caused by `sanitizeInput` in StepShipping — relax to allow internal spaces).
- Payments tab: M-Pesa numbers list + cards list (add/edit/remove, mark default). Card form captures number for last4 only — never persisted full.

---

## Phase 2 — Checkout, Orders, Email, WhatsApp
**Checkout autofill (#2):**
- Prefill from profile + default address + default payment.
- "Use saved address" selector dropdown above the shipping form.
- Add `apartment` field to `StepShipping`.
- Fix space bug in town/address inputs.

**Order history (#3):**
- Make each order row in Account → Orders clickable → expandable card showing items (image, qty, unit, line total), shipping fee, tax, total, payment method, status timeline, date.
- Single query w/ join to `order_items`.

**Wishlist nav (#4):**
- Audit BottomNav + Header — route directly to `/wishlist` (no intermediate). Quick fix.

**WhatsApp order button (#12):**
- New `WhatsAppOrderButton` component on `Product.tsx` between Add-to-Cart and Buy-Now.
- Phone in `src/lib/config.ts` (already memory: +254 701 043041).
- Open Graph meta tags per product via React Helmet on `/product/:slug`: og:title, og:description, og:image, og:url, twitter card.

**Order email notifications (#15):**
- Audit existing `send-order-notification` edge function.
- Switch to Lovable Emails transactional flow (queue-based, retries) so emails actually deliver. Requires email domain setup.
- Templates: customer order confirmation + admin new-order notification.
- If no email domain configured, surface the email-setup dialog.

---

## Phase 3 — Homepage Polish, Filters, Mobile Header
**Homepage marquee + animations (#1):**
- Hero: increase desktop height (e.g. `lg:h-[640px] xl:h-[720px]`), keep mobile compact.
- Add framer-motion fade-in/stagger for sections, hover lift on cards, subtle gradient shimmer on CTAs, floating decorative blobs (GPU `transform` only).
- Lazy-load offscreen sections with IntersectionObserver.

**Announcement bar on mobile/tablet (#14):**
- Show `AnnouncementBar` on all breakpoints (currently desktop-only). Compact h-8 marquee on mobile.

**Mobile/tablet account icon (#10):**
- Add avatar/profile icon top-right of `Header` on `<lg`, links to `/account`. Falls back to initials if no avatar.

**Price range filter fix (#8):**
- Audit `SidebarFilter.tsx` + `Category.tsx`: ensure slider min/max use product-derived range, debounced, plays well with sort. Validate min ≤ max.

**Dynamic key features (#11):**
- Replace generic list with extractor: parse description HTML → take first 4–6 `<li>` items; fallback to first sentences split on `.` if no list. No invented content.

---

## Phase 4 — Performance & Auth Branding
**Performance (#13):**
- Add `React.lazy` + `Suspense` for non-critical routes (Admin, Account subtabs, Checkout step components).
- TanStack Query: set sensible `staleTime` (30–60s) on product/category lists, dedupe.
- Image: add `loading="lazy"` + `decoding="async"` everywhere; use `getProxiedImageUrl` already in place.
- Prefetch product page on hover of card.
- Vite manualChunks for vendor splitting.

**Google sign-in branding (#16):**
- This is a Google Cloud Console + Lovable Cloud auth-settings action, not a code change. I'll:
  - Update site metadata (`index.html` title, og:site_name = "Toolsman Store", favicon).
  - Document for the user the exact steps in Cloud → Auth Settings → Google to set custom OAuth client (since the managed default shows Lovable branding).
  - Update auth email templates if email domain is set up — sender name "Toolsman Store".

---

## Open Questions Before I Start

1. **Email domain** — is `toolsman.co.ke` (or similar) the intended sender domain? Setting up Lovable Emails requires NS record changes at the registrar. Without it, order emails will keep failing. Do you want me to launch the email-setup dialog now?
2. **Card storage scope** — should I store cards as **last4 + brand only** (PCI-safe, no real charging) for display/selection convenience, or do you want real tokenized payments (requires Stripe/Paddle integration — separate work)?
3. **Google OAuth branding** — do you want to provide your own Google OAuth client ID/secret (full "Toolsman Store" branding on consent screen), or accept the managed Lovable client (faster, but generic branding)?
4. **Phasing** — proceed phase-by-phase as above (recommended, safer), or attempt all 4 phases in one shot like before?

Once you answer, I'll start with Phase 1 immediately.

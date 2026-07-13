# Stripe setup — finishing the membership checkout

Everything is already built. The upgrade flow stays dormant (buttons show a
"checkout opens at launch" note) until the steps below are done — no code
changes needed, just registration + config. Do these once you have a Stripe
account.

## What's already wired

- `/upgrade` — pricing page (Free / Plus / Founder), gated behind the Go Live switch.
- Checkout — `createCheckout()` server action creates a Stripe Checkout Session and redirects.
- Billing portal — `createBillingPortal()` server action (for "manage / cancel").
- Webhook — `/api/stripe/webhook` writes `membership_tier` / `membership_status` onto the member's profile.
- Graceful fallback — if any key/price is missing, checkout returns `unconfigured` and the UI shows the coming-soon note instead of an error.

## Your steps after registering

1. **Create a Stripe account** at https://stripe.com (start in **Test mode**).

2. **Create 3 recurring Prices** (Products → Add product, each with a recurring price):
   - Watchruum Plus — **$4.99 / month**
   - Watchruum Plus — **$39.99 / year**
   - Founder — **$89 / year**

   Copy each **Price ID** (looks like `price_1AbC…`).

3. **Run the DB migration** in the Supabase SQL editor:
   - `supabase/memberships.sql`

4. **Set environment variables** (Vercel → Project → Settings → Environment
   Variables, and your local `.env.local`). See `.env.example`:
   - `STRIPE_SECRET_KEY` — Developers → API keys (Secret key)
   - `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PLUS_ANNUAL`, `STRIPE_PRICE_FOUNDER_ANNUAL`
   - `NEXT_PUBLIC_APP_URL` — your deployed URL (e.g. `https://watchruum.vercel.app`)
   - `SUPABASE_SERVICE_ROLE_KEY` — required so the webhook can write memberships (you likely already have this)

5. **Add the webhook endpoint** (Developers → Webhooks → Add endpoint):
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

6. **Enable the Billing Portal** (Settings → Billing → Customer portal) so
   members can manage/cancel.

7. **Install deps & deploy**: `npm install` (picks up the `stripe` package), then push/redeploy.

## Testing

- Use Stripe **test cards** (e.g. `4242 4242 4242 4242`, any future expiry/CVC).
- Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  (the CLI prints a `whsec_…` to use locally).
- After a successful test checkout, confirm the member's `profiles.membership_tier`
  flipped to `plus` / `founder`.

## Go live

Switch Stripe from Test to **Live mode**, create the same 3 prices there, swap in
the live keys/price IDs, and re-point the webhook at your production URL.

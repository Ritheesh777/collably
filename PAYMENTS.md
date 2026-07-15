# Payments — how to test, and how to go live

Collably takes **subscription payments only**, through Razorpay (v2 §9).
Company↔creator collaboration payments are deliberately **not** handled here —
those two settle directly via UPI/GPay/bank transfer.

Production is currently in **TEST mode**. No real money moves.

---

## Testing now (test mode)

Log in as a creator (`ananyacreates@demo.com` / `Password@123`) → **Subscription**.
The ₹499 plan shows **₹149.70** after the 70% first-subscription discount.

Pay with a Razorpay test card:

| What you want to test | Card number | Notes |
| --- | --- | --- |
| Successful payment | `4111 1111 1111 1111` | any future expiry, any CVV, OTP `1234` |
| Failed payment | `4000 0000 0000 0002` | proves the failure path |
| UPI success | `success@razorpay` | in the UPI tab |
| UPI failure | `failure@razorpay` | |

None of these move real money. Full list: razorpay.com/docs/payments/payments/test-card-details

**Worth testing deliberately:**
- Pay, then close the tab before it redirects → the **webhook** should still activate the
  subscription. This is the case that loses real customers if it is broken.
- Pay twice with the same order → only **one** paid record should exist.
- Subscribe, then check the price again → month two is **₹499**, not ₹149.70. The
  first-subscription discount is once per account, not once per month.

## Checking the keys

**Admin → Plans & Coupons → Check payment keys.** It creates and abandons a ₹1
order, so it verifies the keys and tells you the mode without taking a payment.
Use it after any key change — a bad key otherwise surfaces as a customer's failed
checkout.

---

## Going live

1. **Rotate the live secret first.** The current one was pasted into a chat log.
   Razorpay Dashboard → Settings → API Keys → **Regenerate Live Key**. Copy the
   secret immediately — Razorpay shows it exactly once.
2. Set on Render (Environment tab), or ask Claude to:
   ```
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=<the freshly rotated secret>
   RAZORPAY_WEBHOOK_SECRET=<the live webhook secret — see .env>
   ```
3. **Deploy.** Render only injects env vars on a *deploy* — a restart is not
   enough, and the app will keep using the old keys until you do.
4. **Check payment keys** → must read `LIVE — real money`.
5. Do **one ₹1 payment** with the `TEST100` coupon to prove real money lands.
6. **Deactivate `TEST100`** immediately after. If it leaks, everyone subscribes
   for ₹1.

The live webhook (`TDsb3xv9AJJYLs`) is already registered and stays registered —
Razorpay keeps live and test webhooks separate, so both modes are wired up.

---

## Things that will bite you

- **Webhooks are mode-specific.** A live webhook never fires for a test payment.
  Both are registered; if you ever change the API URL, re-register both.
- **The webhook secret is not the API secret.** They are separate values.
- **Never trust the browser.** `/subscriptions/verify` checks Razorpay's HMAC
  signature server-side before anything activates (BR-NEW-005). A client saying
  "payment succeeded" proves nothing, and is tested against forgery.
- **The amount is computed server-side.** A client sending `amountPaise: 1` is
  ignored — tested.
- **Nothing can ever be free.** Discounts stack, then hit the cap (Admin →
  Settings), then floor at ₹1, because Razorpay rejects zero-amount orders.

## Prices are not hardcoded

Base price, first-subscription discount, rank discounts, the cap and the free
collaboration limit all live in **Admin → Settings** and **Admin → Plans &
Coupons** (v2 §10 requires this). Changing them there takes effect immediately —
no deploy, no code change.

**₹499 / ₹1,999 are placeholders.** The client's v2 spec never names a price; it
only specifies the 70% discount, the rank percentages and the thresholds. Set the
real price before launch.

---

## Live infrastructure (as of the Collably rebrand)

| What | Where |
| --- | --- |
| Site | https://collably-app.vercel.app |
| API | https://collably-api-1yvk.onrender.com |
| Webhook URL | https://collably-api-1yvk.onrender.com/api/subscriptions/webhook |
| Live webhook | `TDsb3xv9AJJYLs` |
| Test webhook | `TDspBx52HQ6JwN` |
| Repo | https://github.com/Ritheesh777/collably |
| Admin login | admin@collably.in |

The API host carries a random suffix because `collably-api.onrender.com` was
already taken on Render. A custom domain (e.g. `api.collably.in`) would replace
it cleanly — Render → Settings → Custom Domains, then re-point both webhooks and
`VITE_API_URL`.

**`influconnect-api.onrender.com` still exists** as `collably-api-legacy` so
nothing breaks mid-switch. Once your cron job and any bookmarks point at the new
API, delete it in the Render dashboard.

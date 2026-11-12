# Medical Line Doctor / Clinic Portal

Branch: `feature/bank-review-readiness`

## Implemented

- Georgian-first clinic dashboard, responsive sidebar and mobile navigation.
- B2B catalog with a structured special-price request modal.
- Doctor request history, offer list, detailed commercial offer, financial summary, terms and payment schedule.
- Public Georgian legal pages, official merchant details and permanent legal footer links.
- Three required, server-recorded consents during offer acceptance and repeated confirmation before payment.
- Registration terms/privacy consent.
- Password recovery email flow and `/clinic/reset-password` password update page.
- Separate browser auth storage for Admin and Clinic sessions, preventing one role from replacing the other in the same browser.
- Admin request list, status/internal-note controls, filters, multi-product offer builder, currency, warranty, VAT mode, validity, internal/public notes and editable schedule dates and amounts.
- Schedule templates: full payment, 30/70, 30% + 2 months, 30% + 3 months and custom.
- Rounding-safe schedule generation; the final installment absorbs remaining cents.
- Provider-neutral payment session route, signed webhook verification, idempotent provider transaction handling and callback/result UI.
- Existing clinic authentication, product tables, catalog data, academy and service tickets remain in use.

## Migration

Apply in Supabase SQL Editor after the existing numbered migrations:

- `supabase/sql/25_clinic_commercial_portal.sql`
- `supabase/sql/26_clinic_offer_bank_review_patch.sql` (run when migration 25 was applied before the warranty/consent update)

The migration is additive. It does not rename or remove `requests`, `product_offers`, `service_tickets`, `products`, `prices`, or academy tables.

## Required environment variables

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `BOG_PAYMENTS_ENABLED` — keep `false` until BOG sandbox/create-order/callback verification is complete
- `PAYMENT_PROVIDER`
- `PAYMENT_API_URL`
- `PAYMENT_MERCHANT_ID`
- `PAYMENT_SECRET_KEY`
- `PAYMENT_WEBHOOK_SECRET`

Public display-only value:

- `NEXT_PUBLIC_PAYMENT_PROVIDER_NAME`

Never expose the service role, merchant secret, or webhook secret with a `NEXT_PUBLIC_` prefix.

Supabase Authentication must allow these redirect URLs for recovery emails:

- local: `http://localhost:3010/clinic/reset-password`
- production: `https://medicalline.ge/clinic/reset-password`

## BOG routes and commercial flow

- `POST /api/payments/bog/create-order` — authenticates the doctor and validates the accepted offer, consent timestamps, active schedule and duplicate transaction state before creating an order.
- `POST /api/payments/bog/callback` — remains disabled with the feature flag and, when enabled, requires a valid server-side signature before updating a transaction.
- `/payment/result` — displays only the transaction status stored after server verification; redirect query parameters never mark a payment as successful.

Data flow: `special_price_requests` → `offers` → `payment_schedules` → `payment_transactions`. The commercial sequence is special-price request → individual offer → schedule acceptance → online advance payment.

## Live versus test mode

Live after the migration is applied:

- request submission and RLS isolation;
- admin offer creation and sending;
- doctor offer viewing and acceptance;
- schedule visibility, due dates, overdue state and in-app status messages;
- service, academy, profile and existing authentication flows.

Payment remains **test/unavailable mode** while `BOG_PAYMENTS_ENABLED=false`, or until a real provider contract and the payment variables above are configured. Without these prerequisites, the server returns `ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვთ დაგვიკავშირდეთ: +995 514 011 116` and never creates a fake success.

Before enabling production payments, map the selected provider's exact create-session response and webhook field names in `app/lib/clinic-payment-provider.ts` and `app/api/clinic/payments/webhook/route.ts`, register the webhook URL, and verify its HMAC specification against the provider documentation.

## Security invariants

- Doctors can read only rows tied to `auth.uid()`.
- Only admins can create or edit offers/items/schedules.
- Expired/cancelled/unaccepted offers cannot create payment sessions.
- A browser return/callback never marks an installment paid.
- Only a signature-verified server webhook can call `complete_clinic_payment`.
- Duplicate provider transaction IDs are rejected.
- Raw provider responses are not selectable by authenticated frontend users.

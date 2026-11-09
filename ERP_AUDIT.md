# Medical Line ERP Audit

Audit date: 2026-06-12  
Live route checked: `https://medicalline.ge/admin/erp`

## 1. Current Technology Stack

- Framework: Next.js 16.1.6 App Router, React 19.2.4, TypeScript.
- Hosting/build: Vercel/Turbopack. `/admin/erp` is prerendered as a static route and then loads ERP data client-side from Supabase.
- Database/auth/storage: Supabase PostgreSQL, Supabase Auth, Supabase Storage.
- UI: React client components, inline CSS, `lucide-react` icons.
- ERP data access: direct browser Supabase client from `app/lib/supabase.ts`.
- Integrations: RS.ge SOAP endpoints through `app/api/rsge/route.ts` and `app/api/rsge-lookup/route.ts`.
- Other modules in the same project: public site/catalog/blog, admin panel, invoice module, warranty, contracts, analytics, academy.

Build status:

- `npm run build` completed successfully.
- Build skipped type validation because `next.config.ts` has `typescript.ignoreBuildErrors: true`.
- Build warning: Next.js inferred workspace root from `C:\Users\User\package-lock.json`, while another lockfile exists in `C:\Users\User\medicalline-site\package-lock.json`.
- Live `GET https://medicalline.ge/admin/erp` returned `200 OK`.

## 2. ERP File Map

Main ERP route:

- `app/admin/erp/page.tsx`
  - One large client component.
  - Contains module navigation, data loading, sales, purchases, stock, payments, reports, RS review list, and admin/reference screens.
  - Uses direct Supabase table reads/writes from the browser.

ERP database migrations:

- `supabase/sql/21_erp_accounting.sql`
  - Core ERP/accounting schema: companies, chart accounts, parties, products, stock lots, sales, sale items, payments, journal entries, RS logs, bank imports.
- `supabase/sql/22_erp_clean_structure_v2.sql`
  - Cleanup/staging layer: import batches, product/party import maps, duplicate review views, clean product/party views, summary view.

Shared database/auth:

- `supabase/sql/01_core.sql`
  - Defines `public.is_admin()` and core profile policies.
- `app/lib/supabase.ts`
  - Browser Supabase client.
- `proxy.ts`
  - Protects legacy invoice routes only; does not protect `/admin/erp`.

RS.ge/API related:

- `app/api/rsge/route.ts`
  - SOAP upload/test/search endpoint for invoices and waybills.
- `app/api/rsge-lookup/route.ts`
  - SOAP organization lookup by tax ID.

Nearby admin/API patterns:

- `app/api/admin/profile/route.ts`
  - Bearer token validation plus service-role profile lookup.
- `app/api/admin/prices/route.ts`
  - Bearer token validation plus service-role product/price update.
- `app/admin/page.tsx`
  - Separate non-ERP admin panel with its own login/sessionStorage flow.

Legacy invoice schema:

- `supabase/sql/10_invoice_module.sql`
- `supabase/sql/15_invoice_authenticated_policies.sql`

## 3. Existing Database Tables

ERP core tables from `21_erp_accounting.sql`:

- `erp_companies`
- `erp_chart_accounts`
- `erp_parties`
- `erp_products`
- `erp_stock_lots`
- `erp_sales`
- `erp_sale_items`
- `erp_payments`
- `erp_journal_entries`
- `erp_journal_lines`
- `erp_rs_logs`
- `erp_bank_imports`

ERP cleanup/staging tables/views from `22_erp_clean_structure_v2.sql`:

- `erp_import_batches`
- `erp_product_import_map`
- `erp_party_import_map`
- `erp_products_duplicate_review` view
- `erp_parties_duplicate_review` view
- `erp_products_clean` view
- `erp_parties_clean` view
- `erp_clean_summary` view

ERP page also references:

- `erp_oris_waybill_review`
  - Treated as optional by the page. If it does not exist, the page suppresses that error and shows zero RS/waybill review rows.

Important non-ERP tables used by auth/admin:

- `profiles`
- `products`
- `prices`
- `requests`
- `service_tickets`
- `academy_items`
- `inv_clients`
- `inv_products`
- `inv_invoices`
- `inv_settings`

## 4. Completed Functionality

- ERP route exists and builds: `/admin/erp`.
- Client-side admin gate checks Supabase session, `profiles.role = 'admin'`, and `profiles.status = 'active'`.
- RLS policies exist for ERP tables and require authenticated users satisfying `public.is_admin()`.
- MEDIQALJORJIA company bootstrap exists in migration 21.
- Products and organizations load from Supabase.
- Clean views are supported by the UI when available:
  - `erp_products_clean`
  - `erp_parties_clean`
- Fallback to raw tables exists when clean views are missing.
- Basic purchase operation exists:
  - Inserts incoming stock into `erp_stock_lots`.
  - Updates product default cost/default price.
- Basic sale operation exists:
  - Inserts `erp_sales`.
  - Inserts `erp_sale_items`.
  - Inserts outgoing stock rows into `erp_stock_lots`.
- Basic payment operation exists:
  - Inserts `erp_payments`.
  - Updates sale payment/status.
- Basic stock balance screen exists:
  - Calculates balance from `quantity_in - quantity_out`.
- Basic reports screen exists:
  - Sales total, VAT, profit, stock value, debt total.
- RS.ge server routes exist for:
  - Connection test.
  - Organization lookup.
  - Invoice upload.
  - Waybill upload.
- Database has placeholders for accounting, RS logs, and bank imports.

## 5. Partially Completed Functionality

- Products/suppliers/customers:
  - Data exists, but duplicates from ORIS/Claude/Excel imports are still a real problem.
  - Clean views reduce duplicates visually, but there is no complete review/merge workflow in the UI.
- Purchases:
  - There is no purchase header/items model.
  - Purchases are stored as stock lot rows only, so supplier debt, VAT, document status, and purchase lifecycle are incomplete.
- Sales:
  - Sales can be saved, but not through a transaction.
  - If sale insert succeeds and item/stock insert fails, partial documents can remain.
  - No edit/cancel/return flow.
- Warehouses and stock:
  - Stock movement exists only through `erp_stock_lots`.
  - There is no warehouse/location table.
  - No FIFO/weighted average costing.
  - No negative-stock prevention.
  - Serial numbers are in schema but not operationally handled in the sale/purchase UI.
- Payments and debts:
  - Payments can be recorded, but debt is inferred from sale status only.
  - Partial payments are not summed against previous payments before deciding whether a sale is paid.
  - No supplier debt ledger.
- Accounting:
  - Chart of accounts and journal tables exist.
  - ERP UI does not post journal entries when sale/purchase/payment happens.
- Reports:
  - Reports are client-side and use only currently loaded rows.
  - Sales list is limited to 80 rows and stock movements to 5000 rows, so report totals can become wrong as data grows.
- RS.ge:
  - API routes exist, but `/admin/erp` does not call them from the sale/waybill workflow.
  - `erp_rs_logs` exists but is not written by the RS routes.
- Bank integration:
  - `erp_bank_imports` exists, but no bank import/reconciliation UI or parser is implemented.

## 6. Missing Functionality

- Dedicated purchase documents:
  - purchase headers
  - purchase items
  - supplier invoices
  - import expenses
  - supplier debt/payment status
- Dedicated stock movement ledger:
  - movement type
  - warehouse/from/to
  - linked source document
  - costing method
  - serial number movement history
- Warehouses:
  - warehouse table
  - stock per warehouse
  - transfers
  - adjustments/inventory count
- Customer debt ledger:
  - debt aging
  - payment allocation
  - overpayment/refund handling
  - installment schedule
- Accounting automation:
  - journal entries generated from sales, purchases, payments, VAT, bank transactions.
- RS.ge production workflow:
  - send invoice/waybill from ERP sale
  - store RS request/response in `erp_rs_logs`
  - show sent/error status on sale
  - retry/cancel/status sync
- Bank integrations:
  - TBC/BOG statement import
  - transaction matching
  - payment creation from bank statement
  - reconciliation reports
- Import cleanup workflow:
  - approve/ignore/link duplicate products and parties
  - canonical product/party master data screen
  - safe ORIS re-import procedure
- Permissions:
  - admin-only exists, but there are no granular roles such as accountant, warehouse, sales, viewer.
- Audit trail:
  - no change history for critical ERP documents.
- Testing:
  - no ERP unit/integration/e2e tests found.

## 7. Critical Bugs and Risks

- TypeScript build errors are ignored in `next.config.ts`. The build can pass while ERP code has type-level defects.
- `/admin/erp` is not protected by `proxy.ts` or a server layout. It is only gated after the static page loads in the browser. Database RLS protects data, but the route itself is public.
- ERP writes happen directly from the browser Supabase client. This leaves business rules spread across UI code and makes proper transactions impossible.
- Sale creation is not atomic:
  - `erp_sales` insert
  - `erp_sale_items` insert
  - `erp_stock_lots` stock-out insert
  can fail independently.
- Purchase creation is not atomic:
  - stock insert and product cost update can diverge.
- Payment creation is not atomic:
  - payment insert and sale status update can diverge.
- Payment status logic is wrong for multiple partial payments because it compares only the new payment amount to sale total.
- Reports can show wrong totals because they calculate only loaded rows, especially with the 80-sale query limit.
- No hard database check prevents negative stock.
- No unique constraint on `erp_sales.invoice_number` per company, so duplicate invoice numbers are possible.
- Product/party duplicate handling is only partially solved; raw duplicate imports can still pollute operational selections.
- `erp_stock_lots` mixes purchase lots and sale stock-out rows. This will become hard to audit and reconcile.
- `erp_rs_logs` table exists, but RS API routes do not write logs.
- RS API routes accept username/password in request body and do not validate the caller as an ERP admin before calling RS.ge. This should be locked down before production use.
- Legacy invoice tables have permissive anon/authenticated RLS policies. The route is cookie-protected, but the database policies are broad.
- `public.is_admin()` checks only role, not status. The ERP page checks status client-side, but RLS does not.
- Build warning about multiple lockfiles/root inference can cause unexpected build behavior on Vercel.
- There is visible mojibake/encoding damage in some Georgian strings in older admin files and generated code. This can affect user-facing text and imported ORIS data.

## 8. Recommended Implementation Order

1. Freeze direct ORIS/Claude imports into operational tables. Keep new imports in staging/review only.
2. Apply and verify clean structure migration:
   - `22_erp_clean_structure_v2.sql`
   - duplicate review views
   - clean product/party views
3. Build a master-data cleanup screen:
   - products duplicate review
   - parties duplicate review
   - link/ignore/merge decisions
4. Add normalized operational tables:
   - purchase headers/items
   - warehouses
   - stock movements
   - customer/supplier debt ledger
5. Move sale, purchase, and payment writes into server-side API routes or Postgres RPC functions with transactions.
6. Add database constraints:
   - unique document numbers per company
   - non-negative quantities
   - payment amount checks
   - source document references
7. Replace client-side report totals with SQL views/functions.
8. Wire RS.ge into ERP sales:
   - send invoice/waybill
   - log every request/response
   - display status and retry.
9. Add bank import/reconciliation after document and debt ledgers are stable.
10. Only after the data model is stable, split the large ERP page into maintainable components.

## 9. Files That Should Be Modified In The First Development Stage

Do not replace the current ERP. First stage should be additive and protective.

Database:

- `supabase/sql/22_erp_clean_structure_v2.sql`
  - verify/fix duplicate views and clean views.
- New migration: `supabase/sql/23_erp_operational_ledger.sql`
  - add purchase documents, stock movements, warehouses, ledgers, constraints, and transaction RPCs.

ERP application:

- `app/admin/erp/page.tsx`
  - keep current working UI, but start replacing direct writes with server/RPC calls.
  - add duplicate review and warnings before allowing operational use.
- New folder: `app/admin/erp/_components/`
  - gradually extract sales, purchases, stock, payments, reports, and master-data screens.
- New folder or routes: `app/api/erp/`
  - authenticated server endpoints for create sale, create purchase, record payment, cleanup decisions.

RS.ge:

- `app/api/rsge/route.ts`
  - require Supabase admin bearer token.
  - stop accepting credentials from arbitrary request bodies in production.
  - write to `erp_rs_logs`.
- `app/api/rsge-lookup/route.ts`
  - require admin bearer token or a clearly scoped server-side permission.

Auth/security:

- `proxy.ts`
  - add server-side protection or redirect strategy for `/admin/erp`.
- `supabase/sql/01_core.sql`
  - update `public.is_admin()` to require active admin status if that is the intended production rule.
- `supabase/sql/10_invoice_module.sql`
- `supabase/sql/15_invoice_authenticated_policies.sql`
  - review broad invoice policies before connecting invoice data to ERP.

Build quality:

- `next.config.ts`
  - remove `typescript.ignoreBuildErrors` after current type errors are fixed.
- Project root lockfiles:
  - resolve the multiple-lockfile/root warning so Vercel builds from the intended project root.


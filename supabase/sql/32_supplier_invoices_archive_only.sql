-- Keep supplier invoices as a standalone archive. They must not create, update,
-- or depend on ERP/product-stock records.

alter table if exists public.supplier_invoice_items
  drop constraint if exists supplier_invoice_items_erp_product_id_fkey;

alter table if exists public.supplier_order_items
  drop constraint if exists supplier_order_items_erp_product_id_fkey;

alter table if exists public.supplier_invoice_items
  drop column if exists erp_product_id;

alter table if exists public.supplier_order_items
  drop column if exists erp_product_id;

drop index if exists public.supplier_invoice_items_product_idx;

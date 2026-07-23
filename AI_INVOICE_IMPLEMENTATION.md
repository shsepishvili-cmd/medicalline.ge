# AI ინვოისის გენერატორი

## არსებული სისტემის ანალიზი

- Next.js App Router + React 19.
- Supabase Auth, RLS და Storage.
- admin session მოწმდება bearer token-ით და `profiles` ჩანაწერით.
- CRM კლიენტები ინახება `erp_parties`-ში.
- კატალოგი და ფასები ინახება `products`/`prices`-ში.
- legacy `/invoice` იყენებს `inv_*` ცხრილებს; ახალი მოდული მათ არ ცვლის.
- სერვერული PDF ინფრასტრუქტურაში უკვე იყო ქართული Sylfaen ფონტი.

## განხორციელებული არქიტექტურა

- `/admin/invoices/ai-generator` — ტექსტი/ფაილი, რედაქტირებადი მონახაზი და საბოლოო დადასტურება.
- `/admin/invoices` — ისტორია, ძიება, სტატუსი, clean/scanned PDF და გაუქმება.
- server-only parser: provider-independent AI + deterministic fallback.
- Zod validation და server-side ხელახალი ფინანსური გამოთვლა.
- CRM კლიენტისა და პროდუქტის matching; მრავალ/ნულოვან დამთხვევაზე კითხვა ან გაფრთხილება.
- transaction-safe `next_invoice_number()` RPC.
- private `invoice-documents` bucket და signed URLs.
- clean searchable PDF (Sylfaen) და rasterized scan-style PDF.
- PDF text-layer, JPG/PNG OCR და XLSX XML parsing.
- audit log; ფინანსური დოკუმენტი delete-ით არ იშლება.

## Migration

Supabase SQL Editor-ში გაუშვით:

`supabase/sql/30_ai_invoice_generator.sql`

Migration ქმნის:

- `invoice_company_settings`
- `invoice_number_sequences`
- `invoices`
- `invoice_items`
- `invoice_audit_logs`
- `next_invoice_number()` RPC
- private `invoice-documents` bucket
- admin-only RLS/storage policies

## გარემოს ცვლადები

არსებული და სავალდებულო:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

AI/OCR-ისთვის:

- `AI_API_URL` — OpenAI-compatible chat completions endpoint (optional)
- `AI_API_KEY` ან უკვე არსებული `OPENAI_API_KEY`
- `AI_MODEL` ან უკვე არსებული `OPENAI_MODEL`

თუ AI ცვლადები არ არის, ტექსტური მოთხოვნა მუშაობს deterministic parser-ით. JPG/PNG OCR მოითხოვს AI provider-ს. საიდუმლო გასაღები browser bundle-ში არ ხვდება.

## ხელით შესასრულებელი ნაბიჯები

1. გაუშვით migration.
2. Vercel Production/Preview environment-ში დაამატეთ AI ცვლადები.
3. გადაამოწმეთ `profiles.role = 'admin'` და `status = 'active'`.
4. გახსენით `/admin/invoices/ai-generator`.
5. პირველი PDF-ის შექმნის შემდეგ გადაამოწმეთ private bucket-ის signed URL.
6. კომპანიის ლოგო/ბეჭედი/ხელმოწერა მომავალში განაახლეთ `invoice_company_settings`-ში ან შესაბამისი settings UI-დან.

## შემოწმება

- მიზნობრივი ESLint: წარმატებული.
- `next build`: წარმატებული.
- route HTTP smoke test: `200`.
- თანხის სიტყვიერად ტესტები:
  - 1050.00 → `ერთი ათას ორმოცდაათი ლარი და 00 თეთრი`
  - 5250.00 → `ხუთი ათას ორას ორმოცდაათი ლარი და 00 თეთრი`
- სრული `tsc --noEmit` ამ მოდულში შეცდომას არ აჩვენებს, თუმცა repository-ში უკვე არსებული, დაუკავშირებელი TypeScript შეცდომები რჩება ERP/offers/warranty/contracts ფაილებში.

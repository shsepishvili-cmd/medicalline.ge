This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Warranty Module Setup

The warranty admin is available at `/admin/warranty`.

### 1. Run the Supabase SQL files

Run these in order inside the Supabase SQL editor:

1. `supabase/sql/01_core.sql`
2. `supabase/sql/02_seed.sql`
3. `supabase/sql/03_fix_admin_user.sql`
4. `supabase/sql/04_manual_library.sql`
5. `supabase/sql/05_warranty_module.sql`

The warranty migration adds:

- `warranties`
- `service_cases`
- `warranty_attachments`
- private buckets: `warranty-documents`, `service-attachments`
- RLS policies for internal staff/admin roles
- auto-generated warranty/service numbers
- automatic `warranty_end` and status sync triggers

### 2. Add required environment variables

These variables must exist in `.env.local` and in production:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Notes:

- The warranty module works with the existing public Supabase envs plus authenticated staff JWTs. No extra service-role secret is required for MVP deployment.
- QR/verify links in generated certificates use the current request origin automatically. `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, or `APP_URL` can still be set if you want an explicit canonical base URL.

### 3. Warranty workflow

- Staff/admin users open `/admin/warranty`
- Create or edit warranties in the admin UI
- Attachments upload into private Supabase Storage buckets
- `POST /api/warranty/[id]/certificate` generates and stores the branded PDF certificate
- `POST /api/warranty/files` returns signed URLs for PDFs and attachments
- `/warranty/verify/[token]` is the QR-target verification page

### 4. Verification

Local verification commands:

```bash
npx tsc --noEmit
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

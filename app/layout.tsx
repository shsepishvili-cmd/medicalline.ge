import "./globals.css";

export const metadata = {
  title: "Medical Line Georgia",
  description: "სტომატოლოგიური აპარატურის გაყიდვა, მონტაჟი და სერვისი საქართველოში",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="hover:underline underline-offset-4" href={href}>
      {label}
    </a>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body className="min-h-screen bg-white text-slate-900">
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900" />
              <div className="leading-tight">
                <div className="text-base font-semibold">Medical Line Georgia</div>
                <div className="text-xs text-slate-500">გაყიდვა • მონტაჟი • სერვისი</div>
              </div>
            </a>

            <nav className="hidden items-center gap-5 text-sm md:flex">
              <NavLink href="/catalog" label="კატალოგი" />
              <NavLink href="/service" label="სერვისი" />
              <NavLink href="/contact" label="კონტაქტი" />
              <a
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:opacity-90 transition"
                href="/contact"
              >
                ფასის მოთხოვნა
              </a>
            </nav>

            <a className="md:hidden rounded-xl border px-3 py-2 text-sm" href="/contact">
              ფასის მოთხოვნა
            </a>
          </div>
        </header>

        {children}

        <footer className="border-t bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <div className="font-semibold">Medical Line Georgia</div>
                <div className="mt-2 text-sm text-slate-600">სტომატოლოგიური აპარატურა საქართველოში.</div>
              </div>
              <div>
                <div className="font-semibold">გვერდები</div>
                <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                  <a className="hover:underline" href="/catalog">კატალოგი</a>
                  <a className="hover:underline" href="/service">სერვისი</a>
                  <a className="hover:underline" href="/contact">კონტაქტი</a>
                </div>
              </div>
              <div>
                <div className="font-semibold">ლოკაცია</div>
                <div className="mt-2 text-sm text-slate-600">თბილისი, საქართველო</div>
                <div className="mt-1 text-sm text-slate-600">Sales • Installation • Service</div>
              </div>
            </div>
            <div className="mt-8 text-xs text-slate-500">
              © {new Date().getFullYear()} Medical Line Georgia
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

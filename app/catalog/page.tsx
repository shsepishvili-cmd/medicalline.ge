import { products } from "../lib/products";

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">კატალოგი</h1>
      <p className="mt-2 text-slate-600">აირჩიე პროდუქტი და გადადი დეტალებზე.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <a key={p.slug} href={`/product/${p.slug}`} className="rounded-2xl border bg-white p-6 hover:bg-slate-50 transition">
            <div className="text-xs text-slate-500">{p.category}</div>
            <div className="mt-1 font-semibold">{p.name}</div>
            <div className="mt-2 text-sm text-slate-600">{p.short}</div>
            <div className="mt-4 text-sm font-medium">დეტალურად →</div>
          </a>
        ))}
      </div>
    </main>
  );
}

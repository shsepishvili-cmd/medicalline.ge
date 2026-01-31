import HeroSlider from "./components/HeroSlider";
import { products, categories } from "./lib/products";

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {desc ? <p className="mt-1 text-slate-600">{desc}</p> : null}
    </div>
  );
}

function productImage(slug: string) {
  if (slug.includes("helios")) return "/images/helios.png";
  if (slug.includes("finscan") || slug.includes("f350")) return "/images/f350.png";
  if (slug.includes("hager") || slug.includes("g4")) return "/images/hager-g4.jpg";
  return "/images/helios.png";
}

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <HeroSlider />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-6">
            <div className="font-semibold">სწრაფი რეაგირება</div>
            <p className="mt-2 text-sm text-slate-600">ფასი/კონსულტაცია მოკლე დროში.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <div className="font-semibold">მონტაჟი ადგილზე</div>
            <p className="mt-2 text-sm text-slate-600">ინჟინრის მონტაჟი და კალიბრაცია.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <div className="font-semibold">გარანტია და სერვისი</div>
            <p className="mt-2 text-sm text-blue-700">ტექნიკური მხარდაჭერა და ნაწილები.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SectionTitle title="კატეგორიები" desc="აირჩიე მიმართულება და ნახე პროდუქტები." />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categories.map((c) => (
              <a
                key={c}
                href="/catalog"
                className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="font-semibold">{c}</div>
                <div className="mt-2 text-sm text-slate-600">დეტალურად ნახვა →</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle title="რჩეული პროდუქტები" desc="ყველაზე მოთხოვნადი პროდუქტები კლინიკებისთვის." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {products.map((p) => (
            <a
              key={p.slug}
              href={`/product/${p.slug}`}
              className="rounded-2xl border bg-white p-6 hover:bg-slate-50 transition"
            >
              <img
                src={productImage(p.slug)}
                alt={p.name}
                className="mb-3 h-40 md:h-48 w-full rounded-xl object-cover"
              />
              <div className="text-xs text-slate-500">{p.category}</div>
              <div className="mt-1 font-semibold">{p.name}</div>
              <div className="mt-2 text-sm text-slate-600">{p.short}</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
                დეტალურად <span aria-hidden>→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-14">
          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold">ფასის მოთხოვნა / დემოს დაჯავშნა</h3>
              <p className="mt-2 text-white/85">
                დატოვე მონაცემები და მალე დაგიკავშირდებით შეთავაზებით.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/contact" className="rounded-xl bg-white px-5 py-3 text-slate-900 font-medium">
                  მოთხოვნის გაგზავნა
                </a>
                <a href="/catalog" className="rounded-xl border border-white/30 px-5 py-3 hover:bg-white/10 transition">
                  კატალოგი
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

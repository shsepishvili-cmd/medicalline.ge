export default function ServicePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">სერვისი და გარანტია</h1>
      <p className="mt-2 text-slate-600">
        მონტაჟი, კალიბრაცია, ტრენინგი და ტექნიკური მხარდაჭერა.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="font-semibold">მონტაჟი</div>
          <p className="mt-2 text-sm text-slate-600">ადგილზე დაყენება და შემოწმება.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="font-semibold">ტრენინგი</div>
          <p className="mt-2 text-sm text-slate-600">ექიმისა და ასისტენტისთვის საბაზისო სწავლება.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="font-semibold">მხარდაჭერა</div>
          <p className="mt-2 text-sm text-slate-600">საგარანტიო და გარანტიის შემდგომი სერვისი.</p>
        </div>
      </div>

      <div className="mt-10 rounded-3xl bg-slate-900 p-8 text-white">
        <h2 className="text-xl font-semibold">გჭირდება სერვისი?</h2>
        <p className="mt-2 text-white/85">დატოვე მოთხოვნა და დაგიკავშირდებით.</p>
        <a href="/contact" className="mt-4 inline-block rounded-xl bg-white px-5 py-3 text-slate-900 font-medium">
          სერვისის მოთხოვნა
        </a>
      </div>
    </main>
  );
}

import { buildPageMetadata, siteConfig } from '@/app/lib/seo';
import { merchant } from '@/app/lib/merchant';

export const metadata = buildPageMetadata({
  path: '/about',
  title: 'ჩვენ შესახებ | Medical Line Georgia',
  description:
    'გაიგეთ მეტი Medical Line Georgia-ს შესახებ, ჩვენს მისიაზე, გამოცდილებაზე, სერვისზე და სტომატოლოგიური ტექნოლოგიების მიმართულებაზე საქართველოში.',
  keywords: ['Medical Line Georgia', 'ჩვენს შესახებ', 'სტომატოლოგიური ტექნოლოგიები'],
});

export default function About() {
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Medical Line Georgia',
    url: `${siteConfig.url}/about`,
    description:
      'ინფორმაცია Medical Line Georgia-ს, მისიის, სერვისის და სტომატოლოგიური აპარატურის მიმართულების შესახებ.',
  };

  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      <section className="bg-blue-900 py-24 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <h1 className="text-4xl md:text-6xl font-black mb-6 relative z-10">ჩვენს შესახებ</h1>
        <p className="max-w-2xl mx-auto text-blue-100 text-lg md:text-xl px-4 relative z-10 font-medium">
          Medical Line Georgia არის სტომატოლოგიური აპარატურის და ციფრული ტექნოლოგიების მიმართულებით
          მოქმედი კომპანია საქართველოში.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div>
            <h4 className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">ვინ ვართ ჩვენ</h4>
            <h2 className="text-3xl md:text-4xl font-black text-blue-900 leading-tight">ჩვენი მისია და მიზნები</h2>
          </div>

          <p className="text-slate-600 text-lg leading-relaxed">
            ჩვენი მიზანია ქართველ სტომატოლოგებს მივაწოდოთ თანამედროვე ციფრული ტექნოლოგიები და
            აპარატურა, რომელიც აუმჯობესებს კლინიკის სამუშაო პროცესს და ზრდის პაციენტის გამოცდილებას.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">+</div>
              <p className="text-slate-800 font-bold">სერტიფიცირებული და ორიგინალი აპარატურა</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">+</div>
              <p className="text-slate-800 font-bold">ადგილობრივი სერვისი და ოპერატიული მხარდაჭერა</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="h-[500px] rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-2xl relative z-10">
            <img
              src="/images/4.jpg"
              alt="Medical Line Georgia team and showroom"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
          <div className="absolute -bottom-10 -left-10 z-20 bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl hidden md:block">
            <div className="text-6xl font-black mb-1">10+</div>
            <div className="text-sm font-bold uppercase tracking-widest opacity-90">Years in Market</div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20 grid lg:grid-cols-[1.2fr_.8fr] gap-8">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 md:p-10">
          <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-5">პროდუქტები და მომსახურება</h2>
          <p className="text-slate-600 leading-8 mb-6">Medical Line Georgia მომხმარებლებს სთავაზობს დენტალურ აპარატურას, ინტრაორალურ სკანერებს, რენტგენოლოგიურ და CBCT სისტემებს, დენტალურ მიკროსკოპებს, ენდოდონტიურ და ჰიგიენის მოწყობილობებსა და სახარჯ მასალებს.</p>
          <ul className="grid sm:grid-cols-2 gap-3 text-slate-700 font-semibold">
            {['აპარატურის ინსტალაცია', 'მომხმარებლის ტრენინგი', 'საგარანტიო მომსახურება', 'ტექნიკური მხარდაჭერა'].map((item) => <li key={item} className="rounded-xl bg-white border border-slate-200 px-4 py-3">✓ {item}</li>)}
          </ul>
        </div>
        <aside className="rounded-3xl bg-blue-950 text-white p-7 md:p-10 flex flex-col gap-3">
          <p className="text-blue-300 text-sm font-bold uppercase tracking-widest">ოფიციალური სავაჭრო ინფორმაცია</p>
          <h2 className="text-2xl font-black">{merchant.legalName}</h2>
          <p>საიდენტიფიკაციო ნომერი: {merchant.identificationNumber}</p>
          <p>მისამართი: {merchant.address}</p>
          <a className="text-blue-300 font-bold" href={merchant.phoneHref}>{merchant.phone}</a>
          <a className="text-blue-300 font-bold break-all" href={merchant.emailHref}>{merchant.email}</a>
          <p>{merchant.hours}</p>
        </aside>
      </section>
    </main>
  );
}

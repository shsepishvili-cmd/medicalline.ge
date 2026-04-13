import Link from 'next/link';
import Image from 'next/image';
import {
  Home, Grid, MapPin,
  ChevronRight, MessageCircle, CheckCircle2, Phone, Mail,
  ArrowRight, Star, Camera, BookOpen, Facebook, Gamepad2, Trophy, Sparkles, UserCircle2,
} from 'lucide-react';
import SiteHeader from '@/app/components/SiteHeader';
import TopGe from '@/app/components/TopGe';
import { buildPageMetadata, siteConfig } from '@/app/lib/seo';


const WhatsappIcon = ({ size = 28, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.015-1.04 2.476 0 1.46 1.065 2.871 1.213 3.07.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const categories = [
  { title: "ენდომოტორი", img: "/images/extreme.png", color: "bg-blue-50" },
  { title: "ინტრაორალური სკანერი", img: "/images/helios700.png", color: "bg-slate-50" },
  { title: "დენტალური ტომოგრაფი", img: "/images/finscan.png", color: "bg-gray-50" },
  { title: "დენტალური მიკროსკოპი", img: "/images/acuvisionx.jpg", color: "bg-gray-50" },
];

const reviews = [
  { name: "დრ. გიორგი ბერიძე", text: "Helios 700-მა ჩემი კლინიკის მუშაობა სრულიად შეცვალა. სკანირება არის უსწრაფესი, ხოლო სიზუსტე - იდეალური. რეკომენდაცია ჩემგან!", rating: 5, product: "Helios 700" },
  { name: "დრ. ნინო კახიანი", text: "E-Connect S+ არის საუკეთესო ენდომოტორი, რაც კი გამომიყენებია. ძალიან ჩუმია, მსუბუქი და აპექს ლოკატორიც ზუსტად მუშაობს.", rating: 5, product: "E-Connect S+" },
  { name: "დრ. დავით მ.", text: "HyperLight პორტატული რენტგენი ძალიან მოსახერხებელია. სურათის ხარისხი არ ჩამოუვარდება სტაციონარულ აპარატებს.", rating: 5, product: "HyperLight" },
  { name: "დრ. ანა ს.", text: "Medical Line-ის გუნდს დიდი მადლობა ოპერატიულობისთვის. განვადება 10 წუთში დამიმტკიცეს და ინსტალაციაც მალევე გააკეთეს.", rating: 5, product: "Service" },
  { name: "დრ. ლევან ქ.", text: "Eighteeth-ის პროდუქცია ფასი/ხარისხით ნამდვილად უკონკურენტოა საქართველოში. უკვე მე-3 აპარატს ვყიდულობ თქვენთან.", rating: 5, product: "General" },
];

const whatsappUrl = "https://wa.me/995514011116";

export const metadata = buildPageMetadata({
  path: '/',
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: ['სტომატოლოგიური აპარატურა საქართველოში', 'ინტრაორალური სკანერი georgia', 'cbct georgia'],
});

export default function MedicalLineHome() {
  const homeSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: siteConfig.title,
    url: siteConfig.url,
    description: siteConfig.description,
    about: [
      'სტომატოლოგიური აპარატურა',
      'ინტრაორალური სკანერები',
      'CBCT სისტემები',
      'ენდომოტორები',
    ],
  };

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 pb-24 md:pb-0 overflow-x-hidden selection:bg-blue-100 tracking-tighter relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />

      <SiteHeader />

      {/* --- HERO --- */}
      <section className="relative h-screen min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/cover.png"
            alt="Background"
            fill
            priority
            className="object-cover brightness-[0.35] scale-105"
          />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center w-full relative z-10 pt-16">
          {/* Left */}
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-block bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest italic">
              Inovation Together
            </span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
              Eighteeth <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Medical</span>
            </h1>
            <div className="flex justify-center md:justify-start gap-3 mt-8">
              <Link href="/catalog" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                კატალოგი
              </Link>
              <Link href="#contact" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 italic">
                კონსულტაცია
              </Link>
            </div>
          </div>
          {/* Right — stats */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="grid grid-cols-3 gap-10 text-center">
              <div>
                <p className="text-5xl font-black text-white">10+</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">წელი</p>
              </div>
              <div>
                <p className="text-5xl font-black text-white">500+</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">კლინიკა</p>
              </div>
              <div>
                <p className="text-5xl font-black text-blue-400">60+</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">პროდუქტი</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOGOS --- */}
      <div className="py-12 bg-white border-b border-slate-50 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-16 md:h-20 w-44">
                <Image src="/images/ml-logo.png" alt="Medical Line" fill className="object-contain" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Official Distributor</span>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200 rotate-12" />
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-12 md:h-16 w-44">
                <Image src="/images/eighteeth-logo.png" alt="Eighteeth" fill className="object-contain" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Exclusive Partner</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- ABOUT --- */}
      <section id="about" className="py-24 bg-white px-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[300px] md:h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-50">
            <Image src="/images/2.jpg" alt="About Medical Line" fill className="object-cover" />
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-black uppercase leading-none tracking-tighter italic underline decoration-blue-600 underline-offset-8">
              ჩვენს შესახებ
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed font-medium">
              Medical Line Georgia — Eighteeth-ის ექსკლუზიური პარტნიორი საქართველოში.{' '}
              <span className="font-black text-slate-900 bg-blue-50 px-2 rounded">10 წელზე მეტი გამოცდილებით</span>,
              ჩვენი მისიაა ქართველ სტომატოლოგებს გავუმარტივოთ წვდომა თანამედროვე ციფრულ ტექნოლოგიებზე,
              უზრუნველვყოთ უმაღლესი ხარისხის სერვისი და მუდმივი პროფესიული მხარდაჭერა.
            </p>
          </div>
        </div>
      </section>

      {/* --- SERVICES --- */}
      <section id="services" className="py-24 bg-slate-50 px-6 border-y border-slate-100 scroll-mt-24">
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic underline decoration-blue-600 underline-offset-8">სერვისი</h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "მონტაჟი", d: "აპარატურის ინსტალაცია და გამართვა", i: <CheckCircle2 /> },
            { t: "ტრენინგი", d: "პერსონალის სწავლება და კონსულტაცია", i: <MessageCircle /> },
            { t: "სერვისი", d: "24/7 ტექნიკური მხარდაჭერა და გარანტია", i: <Phone /> },
          ].map((s, i) => (
            <div key={i} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 group hover:bg-blue-600 transition-all duration-500 hover:shadow-2xl">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white transition-all">{s.i}</div>
              <h4 className="font-black uppercase text-slate-900 group-hover:text-white transition-colors text-xl">{s.t}</h4>
              <p className="text-slate-500 font-bold group-hover:text-blue-50 transition-colors mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- ML GAME LOUNGE --- */}
      <section className="py-20 md:py-24 bg-white px-6 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[2.75rem] overflow-hidden border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#172554_100%)] px-8 py-10 md:px-14 md:py-14 shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)]">
            <div className="absolute -right-16 -top-14 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative grid md:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">
                  <Sparkles size={14} className="text-cyan-300" />
                  New Interactive Zone
                </div>
                <h2 className="mt-5 text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-[0.92]">
                  ML Game
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-blue-500">Lounge</span>
                </h2>
                <p className="mt-5 max-w-2xl text-sm md:text-lg font-bold text-slate-300 leading-relaxed">
                  ითამაშე, ივარჯიშე და შეამოწმე შენი სიზუსტე Medical Line-ის ინტერაქციულ სივრცეში.
                  მოკლე, სწრაფი და ბრენდთან იდეალურად მიბმული გამოცდილება ექიმებისთვის და სტუმრებისთვის.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link href="/game" className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-950 shadow-xl shadow-cyan-500/30 transition hover:bg-cyan-300 active:scale-95">
                    დაიწყე თამაში <ArrowRight size={16} />
                  </Link>
                  <Link href="/game" className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95">
                    ნახე Game Lounge
                  </Link>
                </div>
              </div>

              <div className="relative flex justify-center">
                <div className="relative w-full max-w-[420px] rounded-[2.5rem] border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-md shadow-2xl">
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/20 to-blue-500/20 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border-4 border-white bg-slate-950/80">
                      <div className="absolute -top-3 left-1/2 h-5 w-10 -translate-x-1/2 rounded-b-full border-x-4 border-b-4 border-white" />
                      <Gamepad2 size={34} className="text-cyan-300" />
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.38em] text-cyan-200">ML Game Lounge</p>
                    <p className="mt-2 text-sm font-bold text-slate-300">სტომატოლოგიური სიზუსტე, arcade ენერგია და Medical Line vibe.</p>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Mode</p>
                      <p className="mt-2 text-base font-black uppercase text-white">Precision Play</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Badge</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-base font-black uppercase text-cyan-300"><Trophy size={16} /> Score Rush</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CLINIC CABINET --- */}
      <section className="py-20 md:py-24 bg-slate-50 px-6 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-stretch">
            <div className="rounded-[2.75rem] border border-slate-200 bg-white p-8 md:p-12 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.3)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700">
                <UserCircle2 size={14} />
                Clinic Cabinet
              </div>
              <h2 className="mt-5 text-4xl md:text-6xl font-black uppercase tracking-tight text-slate-950 leading-[0.92]">
                კლინიკის
                <span className="block text-blue-600">კაბინეტი</span>
              </h2>
              <p className="mt-5 max-w-2xl text-sm md:text-lg font-bold text-slate-600 leading-relaxed">
                ერთი სივრცე კლინიკისთვის: პროდუქტები, სერვისი, შემოთავაზებები და საჭირო დოკუმენტები
                უფრო სწრაფად, უფრო სუფთად და მობილურზეც კომფორტულად.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Access</p>
                  <p className="mt-3 text-lg font-black text-slate-950">ფასები, პროდუქტები და მოთხოვნები</p>
                </div>
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Support</p>
                  <p className="mt-3 text-lg font-black text-slate-950">სერვისის ბილეთები და სტატუსის კონტროლი</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/clinic" className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95">
                  შესვლა კაბინეტში <ArrowRight size={16} />
                </Link>
                <Link href="#contact" className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-900 transition hover:border-blue-200 hover:text-blue-700 active:scale-95">
                  მოითხოვე წვდომა
                </Link>
              </div>
            </div>

            <div className="relative rounded-[2.75rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#dbeafe_100%)] p-6 md:p-8 shadow-[0_30px_80px_-40px_rgba(37,99,235,0.35)]">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />
              <div className="relative rounded-[2.2rem] border border-white/80 bg-white/90 p-5 md:p-6 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">Dashboard</p>
                    <p className="mt-2 text-xl font-black text-slate-950">Medical Line Clinic</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                    <UserCircle2 size={24} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-950 p-4 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Catalog</p>
                    <p className="mt-2 text-base font-black">პროდუქტები</p>
                  </div>
                  <div className="rounded-2xl bg-blue-600 p-4 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">Service</p>
                    <p className="mt-2 text-base font-black">მოთხოვნები</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Offers</p>
                    <p className="mt-2 text-base font-black text-slate-950">ინვოისები</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Account</p>
                    <p className="mt-2 text-base font-black text-slate-950">პროფილი</p>
                  </div>
                </div>
                <div className="mt-5 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Mobile Ready</p>
                  <p className="mt-2 text-sm font-bold text-slate-600">კაბინეტი გათვლილია ტელეფონზეც, ასე რომ შესვლა და მართვა გზაში ყოფნის დროსაც მარტივია.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CATEGORIES --- */}
      <section id="catalog" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic underline decoration-blue-600 underline-offset-8">პროდუქცია</h2>
          <Link href="/catalog" className="text-blue-600 font-black text-xs italic">
            ყველა კატეგორია <ChevronRight size={14} className="inline" />
          </Link>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link
              href="/catalog"
              key={i}
              className={`group relative h-[250px] md:h-[350px] ${cat.color} rounded-[2.5rem] overflow-hidden p-8 flex flex-col justify-between hover:shadow-2xl transition-all duration-500 border border-slate-50`}
            >
              <h3 className="text-xl font-black uppercase text-slate-900 leading-none z-10">{cat.title}</h3>
              <div className="absolute bottom-0 right-0 w-[85%] h-[75%] pointer-events-none">
                <Image
                  src={cat.img}
                  alt={cat.title}
                  fill
                  className="object-contain group-hover:scale-110 transition-all duration-700 p-4"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- BLOG PREVIEW --- */}
      <section className="py-24 bg-slate-50 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-black uppercase italic leading-none underline decoration-black underline-offset-8">ბლოგი</h2>
              <p className="font-bold text-blue-600 mt-4">სიახლეები და რჩევები ექიმებისთვის</p>
            </div>
            <Link href="/blog" className="font-black text-xs hover:text-blue-600 transition flex items-center gap-1">
              ყველა სტატია <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blog/gdda-expo-2025" className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 transition-all hover:shadow-2xl">
              <h3 className="text-2xl font-black mb-3 group-hover:text-blue-600 transition uppercase tracking-tighter italic">
                GDDA EXPO 2025 - სრული მიმოხილვა
              </h3>
              <p className="text-slate-500 font-bold text-sm italic">როგორ წარსდგა MEDICAL LINE გამოფენაზე და რა იყო მთავარი სიახლეები.</p>
            </Link>
            <Link href="/blog/endomotori-apeks-lokatorit" className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 transition-all hover:shadow-2xl">
              <h3 className="text-2xl font-black mb-3 group-hover:text-blue-600 transition uppercase tracking-tighter italic">
                ენდომოტორი ინტეგრირებული აპექს ლოკატორით
              </h3>
              <p className="text-slate-500 font-bold text-sm italic">ორ-ერთში სისტემის სარგებელი და სწორი მოდელის არჩევანი.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* --- საინტერესო რჩევები BANNER --- */}
      <section className="py-12 bg-white px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/rchevebi"
            className="group relative flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[3rem] px-10 md:px-16 py-12 md:py-16 overflow-hidden shadow-2xl border border-blue-900/30 hover:shadow-blue-900/30 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.15)_0%,_transparent_60%)] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/20 transition-all duration-700" />
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 z-10 text-center md:text-left">
              <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-all duration-300">
                <BookOpen size={36} className="text-blue-400" />
              </div>
              <div>
                <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">კლინიკებისთვის</p>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                  საინტერესო <br className="hidden md:block" /> რჩევები
                </h2>
                <p className="text-slate-400 font-bold text-sm mt-3">სასარგებლო სტატიები, ინსტრუქციები და პროფესიული რჩევები</p>
              </div>
            </div>
            <div className="z-10 flex-shrink-0">
              <span className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest group-hover:bg-blue-500 transition-all duration-300 shadow-xl shadow-blue-900/40 group-hover:scale-105 active:scale-95">
                წაიკითხე <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* --- GALLERY BANNER --- */}
      <section className="py-12 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/gallery" className="group relative block h-[250px] md:h-[300px] rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-2xl">
            <Image
              src="/images/cover.png"
              alt="Gallery"
              fill
              className="object-cover brightness-[0.4] group-hover:brightness-[0.3] group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <Camera size={48} className="text-white mb-4 opacity-80" />
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4">ფოტო გალერეა</h2>
              <span className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-blue-700 transition shadow-lg">
                დაათვალიერე
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* --- REVIEWS --- */}
      <section className="py-24 bg-slate-50 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-black uppercase mb-12 italic underline decoration-blue-600 underline-offset-8">რას ამბობენ ექიმები</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative flex flex-col justify-between hover:shadow-xl transition-all">
                <div>
                  <div className="absolute top-6 right-8 opacity-10">
                    <Star size={48} className="text-slate-900 fill-slate-900" />
                  </div>
                  <div className="flex gap-1 mb-4 text-orange-400">
                    {[...Array(r.rating)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                  </div>
                  <p className="text-slate-600 font-bold italic mb-6 text-left leading-relaxed text-sm">&ldquo;{r.text}&rdquo;</p>
                </div>
                <div className="text-left border-t border-slate-50 pt-4">
                  <h4 className="font-black uppercase text-slate-900 text-sm">{r.name}</h4>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{r.product}</span>
                </div>
              </div>
            ))}
          </div>
          <a
            href="https://www.facebook.com/medicalline.ge/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 bg-[#1877F2] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 inline-flex items-center justify-center gap-3 active:scale-95"
          >
            <Facebook size={20} /> დაგვიტოვეთ შეფასება Facebook-ზე
          </a>
        </div>
      </section>

      {/* --- CONTACT --- */}
      <section id="contact" className="py-24 bg-white px-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="bg-slate-50 p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h2 className="text-3xl font-black uppercase mb-8 italic">დაგვიკავშირდით</h2>
            <form action="https://formspree.io/f/xjgoknev" method="POST" className="space-y-4">
              <input
                type="text"
                name="name"
                required
                className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm"
                placeholder="თქვენი სახელი"
              />
              <input
                type="text"
                name="phone"
                required
                className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm"
                placeholder="ტელეფონის ნომერი"
              />
              <textarea
                name="message"
                rows={4}
                required
                className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm"
                placeholder="შეტყობინება (რომელი აპარატურა გაინტერესებთ?)"
              />
              <button
                type="submit"
                className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all"
              >
                გაგზავნა
              </button>
            </form>
          </div>
          <div className="h-[400px] lg:h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white grayscale hover:grayscale-0 transition-all duration-700">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2974.237495918335!2d44.83381831214001!3d41.80164397113052!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d697dced4bf%3A0xfd8f7a5b9f3bae56!2sMedical%20Line%20Georgia%20LTD!5e0!3m2!1sen!2sge!4v1771001679314!5m2!1sen!2sge"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 py-20 px-6 text-center text-white rounded-t-[4rem]">
        <div className="flex flex-col items-center gap-8 mb-12 italic">
          <h3 className="text-3xl font-black uppercase tracking-tighter">Medical Line Georgia</h3>
          <div className="flex flex-col gap-3 text-slate-400 font-bold text-sm tracking-widest uppercase">
            <p className="flex items-center justify-center gap-2 underline decoration-blue-600 underline-offset-4">
              <MapPin size={18} className="text-blue-500" /> თბილისი, დ. ჯაბიძის #8
            </p>
            <p className="flex items-center justify-center gap-2">
              <Mail size={18} className="text-blue-500" /> ltdmedicalline@gmail.com
            </p>
            <a href="tel:514011116" className="flex items-center justify-center gap-2 hover:text-white transition-colors">
              <Phone size={18} className="text-blue-500" /> 514 011 116
            </a>
          </div>
          <div className="mt-8 flex justify-center">
            <TopGe />
          </div>
        </div>
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em]">
          © 2026 MEDICAL LINE GEORGIA | DESIGNED BY SHOTA SEPISHVILI
        </p>
      </footer>

      {/* Floating WhatsApp (Mobile) */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="md:hidden fixed bottom-24 right-4 z-[100] bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] border-[3px] border-white hover:scale-110 transition-transform"
      >
        <WhatsappIcon size={26} color="white" />
      </a>

      {/* --- MOBILE NAV --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-slate-200 z-[90] flex justify-around px-2 items-center py-3 pb-8 md:hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <Link href="/" className="flex flex-col items-center gap-1 text-blue-600 hover:text-blue-800 transition w-14">
          <Home size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">მთავარი</span>
        </Link>
        <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <Grid size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">კატალოგი</span>
        </Link>
        <Link href="/gallery" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <Camera size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">გალერეა</span>
        </Link>
        <Link href="/blog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <BookOpen size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">ბლოგი</span>
        </Link>
        <Link href="#contact" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <MapPin size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">კონტაქტი</span>
        </Link>
        <Link href="/clinic" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <UserCircle2 size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">შესვლა</span>
        </Link>
      </div>

    </main>
  );
}

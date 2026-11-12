import Link from 'next/link'
import { ArrowRight, Gamepad2, Sparkles, Trophy } from 'lucide-react'

const gameCards = [
  {
    slug: 'endo-rescue',
    title: 'Endo Rescue',
    status: 'ხელმისაწვდომია',
    description: 'კლინიკური სიმულატორი: მიკროსკოპის ქვეშ ულტრაბგერითი ტრეფინაციით ამოიღე ჩატეხილი NiTi ფრაგმენტი, ისე რომ არ გადახურდეს ფესვი და არ მოხდეს პერფორაცია.',
    accent: 'from-cyan-400 via-sky-400 to-blue-500',
    cta: 'თამაშის დაწყება',
  },
  {
    slug: 'scanner-rush',
    title: 'Helios700 Scan Hero',
    status: 'ხელმისაწვდომია',
    description: 'სკანირების სიმულატორი: ააწყე ციფრული მოდელი ოკლუზიური, ლინგვალური და ბუკალური გავლით, არ დაკარგო ტრეკინგი და დაარეგისტრირე თანკბილვა.',
    accent: 'from-violet-400 via-fuchsia-400 to-pink-500',
    cta: 'თამაშის დაწყება',
  },
  {
    slug: 'xray-alignment',
    title: 'HyperLight ზუსტი კადრი',
    status: 'ახალი',
    description: 'მოარგე HyperLight-ის beam, აირჩიე NanoPix 1 ან 2 და დააყენე სწორი exposure დიაგნოსტიკური კადრისთვის.',
    accent: 'from-emerald-400 via-teal-400 to-cyan-500',
    cta: 'თამაშის დაწყება',
  },
]

export default function GameLoungePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.65),_transparent_28%),linear-gradient(180deg,#f8fdff_0%,#eef8ff_55%,#e2f1ff_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.8rem] border border-white/70 bg-slate-950 px-8 py-12 text-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.6)] md:px-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">
              <Sparkles size={14} />
              ML თამაშები
            </div>
            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
              სტომატოლოგიური
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                თამაშების ზონა
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-lg">
              თითოეულ თამაშს თავისი route, თავისი პროდუქტის თემა და თავისი განსხვავებული gameplay აქვს. ახლა მესამე
              მისიაც დაემატა HyperLight და NanoPix კონცეფციით.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/game/endo-rescue"
                className="inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-950 transition hover:bg-cyan-300"
              >
                <Gamepad2 size={16} />
                პირველი თამაში
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-white/10"
              >
                მთავარზე დაბრუნება
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {gameCards.map((game) => (
            <Link key={game.slug} href={`/game/${game.slug}`} className="block h-full">
              <div className="group relative h-full overflow-hidden rounded-[2.4rem] border border-white/80 bg-white p-6 shadow-[0_22px_60px_-30px_rgba(15,23,42,0.35)]">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${game.accent}`} />
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                    {game.status}
                  </span>
                  <Trophy size={18} className="text-cyan-500" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">{game.title}</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{game.description}</p>
                <div className={`mt-8 flex h-36 items-center justify-center rounded-[2rem] bg-gradient-to-br ${game.accent} p-[1px]`}>
                  <div className="flex h-full w-full items-center justify-center rounded-[calc(2rem-1px)] bg-slate-950/92 text-white">
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/10">
                        <Gamepad2 size={28} className="text-cyan-300" />
                      </div>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">ML თამაშები</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-slate-900">
                  {game.cta}
                  <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}

import Link from 'next/link'
import { ArrowLeft, ScanLine } from 'lucide-react'

export default function XrayAlignmentComingSoonPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(167,243,208,0.55),_transparent_24%),linear-gradient(180deg,#f4fffb_0%,#edfdf8_50%,#eef7ff_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-4xl rounded-[2.8rem] border border-white/80 bg-white/90 p-10 text-center shadow-[0_25px_70px_-30px_rgba(13,148,136,0.3)] backdrop-blur">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-emerald-100 text-emerald-600">
          <ScanLine size={34} />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.35em] text-emerald-500">ML Game Lounge</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-950">X-Ray Alignment</h1>
        <p className="mt-5 text-base font-bold leading-7 text-slate-600">
          ესეც მზადაა როგორც ცალკე route, რომ მომავალში ახალი თამაში დაგვემატოს გადაკეთების გარეშე.
        </p>
        <Link
          href="/game"
          className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          დაბრუნება Game Lounge-ში
        </Link>
      </div>
    </main>
  )
}

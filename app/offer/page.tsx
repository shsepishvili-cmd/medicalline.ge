import Link from 'next/link'
import { ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'შეთავაზება | Medical Line',
  description: 'Medical Line-ის ინდივიდუალური შეთავაზებების გვერდი.',
}

export default function OfferIndexPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> მთავარზე დაბრუნება
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm md:p-10">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e2f4ed] text-[#085041]">
            <ShieldCheck size={24} />
          </div>

          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#085041]">Medical Line Offer</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">ინდივიდუალური შეთავაზება</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            შეთავაზების სანახავად გამოიყენეთ თქვენთვის გამოგზავნილი პერსონალური ბმული. თუ ბმული დაკარგეთ,
            მოგვწერეთ WhatsApp-ზე და გუნდი ხელახლა გამოგიგზავნით.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://wa.me/995514011116?text=%E1%83%92%E1%83%90%E1%83%9B%E1%83%90%E1%83%A0%E1%83%AF%E1%83%9D%E1%83%91%E1%83%90%2C%20%E1%83%A8%E1%83%94%E1%83%9B%E1%83%9D%E1%83%97%E1%83%90%E1%83%95%E1%83%90%E1%83%96%E1%83%94%E1%83%91%E1%83%98%E1%83%A1%20%E1%83%91%E1%83%9B%E1%83%A3%E1%83%9A%E1%83%98%20%E1%83%93%E1%83%90%E1%83%9B%E1%83%94%E1%83%99%E1%83%90%E1%83%A0%E1%83%92%E1%83%90"
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#085041] px-5 py-4 text-sm font-black text-white"
            >
              <MessageCircle size={18} /> WhatsApp-ზე მიწერა
            </a>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900"
            >
              კატალოგის ნახვა
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

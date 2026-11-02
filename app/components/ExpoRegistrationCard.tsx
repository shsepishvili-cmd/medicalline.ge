'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin, X } from 'lucide-react';

const REGISTRATION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScyko9O7nscbPd_n2wjgZB5_Edtko3pJS2ZmH7-A2EdsLWAeg/viewform';
const EVENT_START = new Date('2026-11-13T10:00:00+04:00');
const EVENT_END = new Date('2026-11-15T23:59:59+04:00');
const DISMISSED_KEY = 'gdda-expo-2026-card-dismissed';

export default function ExpoRegistrationCard() {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const current = new Date();
    setNow(current.getTime());

    if (current > EVENT_END || window.sessionStorage.getItem(DISMISSED_KEY) === '1') {
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const countdown = (() => {
    if (!now) return null;
    const days = Math.ceil((EVENT_START.getTime() - now) / 86_400_000);
    if (days > 1) return `${days} დღე დარჩა`;
    if (days === 1) return 'ხვალ იწყება';
    if (now <= EVENT_END.getTime()) return 'გამოფენა მიმდინარეობს';
    return null;
  })();

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="GDDA EXPO 2026-ზე რეგისტრაცია"
      aria-live="polite"
      className="fixed bottom-32 left-4 right-4 z-[110] overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-[0_24px_70px_-20px_rgba(15,23,42,0.75)] sm:left-6 sm:right-auto sm:w-[390px] md:bottom-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.35),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.2),_transparent_38%)]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                GDDA EXPO 2026
              </span>
              {countdown ? (
                <span className="text-[11px] font-bold text-emerald-300">{countdown}</span>
              ) : null}
            </div>
            <h2 className="text-xl font-black leading-tight sm:text-2xl">
              კავკასიის უდიდესი სტომატოლოგიური გამოფენა
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="დახურვა"
            className="shrink-0 rounded-full border border-white/15 bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-300">
          <p className="flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-300" /> 13–15 ნოემბერი, 2026
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-emerald-300" /> ჰუალინგ პლაზა, თბილისი
          </p>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <a
            href={REGISTRATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black transition hover:bg-blue-500 active:scale-[0.98]"
          >
            რეგისტრაცია <ArrowUpRight size={16} />
          </a>
          <Link
            href="/blog/gdda-expo-2026-registration"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/20"
          >
            დეტალები
          </Link>
        </div>
      </div>
    </aside>
  );
}

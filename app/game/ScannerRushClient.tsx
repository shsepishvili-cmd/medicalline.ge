'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, BatteryFull, Play, RotateCcw } from 'lucide-react'

type Screen = 'menu' | 'playing' | 'win' | 'gameover'
type ModeId = 'quick' | 'full' | 'kids' | 'boss'
type Group = 'upper' | 'lower' | 'bite'
type Segment = { id: number; x: number; y: number; angle: number; group: Group; scanned: boolean }

const MODES = {
  quick: { title: 'სწრაფი სკანი', time: 45, target: 10, speedLimit: 1.1, holdMs: 360, motion: 1.4, description: 'კომპაქტური მისია ზედა უბნებზე.' },
  full: { title: 'სრული არკა', time: 80, target: 20, speedLimit: 0.95, holdMs: 420, motion: 1.8, description: 'ზედა, ქვედა და bite scan სრული პროცესით.' },
  kids: { title: 'ბავშვის ვიზიტი', time: 60, target: 12, speedLimit: 1.05, holdMs: 320, motion: 1.2, description: 'უფრო რბილი მოძრაობა და ნაკლები დროის წნეხი.' },
  boss: { title: 'რთული პაციენტი', time: 70, target: 20, speedLimit: 0.85, holdMs: 460, motion: 2.6, description: 'ხშირი მცირე მოძრაობა, მაგრამ მაინც რეალისტური flow.' },
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const distance = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

function toothPath(segment: Segment) {
  const localIndex = segment.group === 'upper' ? segment.id : segment.group === 'lower' ? segment.id - 100 : segment.id - 200

  if (segment.group === 'bite') {
    return 'M -12 -6 Q 0 -10 12 -6 L 10 6 Q 0 10 -10 6 Z'
  }

  if (localIndex <= 1 || localIndex >= 6) {
    return segment.group === 'upper'
      ? 'M -10 8 Q -12 -8 -3 -11 Q 0 -12 3 -11 Q 12 -8 10 8 Q 2 11 0 12 Q -2 11 -10 8 Z'
      : 'M -10 -8 Q -12 8 -3 11 Q 0 12 3 11 Q 12 8 10 -8 Q 2 -11 0 -12 Q -2 -11 -10 -8 Z'
  }

  if (localIndex === 2 || localIndex === 5) {
    return segment.group === 'upper'
      ? 'M -9 8 Q -10 -7 -2 -13 Q 0 -15 2 -13 Q 10 -7 9 8 Q 2 10 0 11 Q -2 10 -9 8 Z'
      : 'M -9 -8 Q -10 7 -2 13 Q 0 15 2 13 Q 10 7 9 -8 Q 2 -10 0 -11 Q -2 -10 -9 -8 Z'
  }

  return segment.group === 'upper'
    ? 'M -11 8 Q -13 -6 -8 -12 Q 0 -14 8 -12 Q 13 -6 11 8 Q 3 11 0 12 Q -3 11 -11 8 Z'
    : 'M -11 -8 Q -13 6 -8 12 Q 0 14 8 12 Q 13 6 11 -8 Q 3 -11 0 -12 Q -3 -11 -11 -8 Z'
}

function createSegments(): Segment[] {
  const upperLayout = [
    { x: 98, y: 172, angle: -30 },
    { x: 118, y: 142, angle: -22 },
    { x: 148, y: 118, angle: -12 },
    { x: 184, y: 104, angle: -5 },
    { x: 236, y: 104, angle: 5 },
    { x: 272, y: 118, angle: 12 },
    { x: 302, y: 142, angle: 22 },
    { x: 322, y: 172, angle: 30 },
  ] as const

  const lowerLayout = [
    { x: 98, y: 328, angle: 30 },
    { x: 118, y: 356, angle: 22 },
    { x: 148, y: 382, angle: 12 },
    { x: 184, y: 396, angle: 5 },
    { x: 236, y: 396, angle: -5 },
    { x: 272, y: 382, angle: -12 },
    { x: 302, y: 356, angle: -22 },
    { x: 322, y: 328, angle: -30 },
  ] as const

  const biteLayout = [
    { x: 164, y: 230, angle: -4 },
    { x: 194, y: 222, angle: -1 },
    { x: 226, y: 222, angle: 1 },
    { x: 256, y: 230, angle: 4 },
  ] as const

  const upper = upperLayout.map((item, index) => ({
    id: index,
    ...item,
    group: 'upper' as const,
    scanned: false,
  }))

  const lower = lowerLayout.map((item, index) => ({
    id: 100 + index,
    ...item,
    group: 'lower' as const,
    scanned: false,
  }))

  const bite = biteLayout.map((item, index) => ({
    id: 200 + index,
    ...item,
    group: 'bite' as const,
    scanned: false,
  }))

  return [...upper, ...lower, ...bite]
}

export default function ScannerRushClient() {
  const boardRef = useRef<HTMLDivElement>(null)
  const holdStartRef = useRef<number | null>(null)
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const [screen, setScreen] = useState<Screen>('menu')
  const [modeId, setModeId] = useState<ModeId>('quick')
  const [segments, setSegments] = useState<Segment[]>(createSegments())
  const [scanner, setScanner] = useState({ x: 118, y: 146 })
  const [tilt, setTilt] = useState(-12)
  const [timeLeft, setTimeLeft] = useState<number>(MODES.quick.time)
  const [score, setScore] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [battery, setBattery] = useState(100)
  const [speed, setSpeed] = useState(0)
  const [message, setMessage] = useState('მონიშნულ უბანზე მიდი და რამდენიმე წამით სტაბილურად გააჩერე სკანერი.')
  const [dragging, setDragging] = useState(false)
  const [best, setBest] = useState(0)
  const [mouthShift, setMouthShift] = useState({ x: 0, y: 0 })
  const [stability, setStability] = useState(0)

  const mode = MODES[modeId]
  const targetSegments = useMemo(() => segments.slice(0, mode.target), [segments, mode.target])
  const currentIndex = targetSegments.findIndex((segment) => !segment.scanned)
  const current = currentIndex >= 0 ? targetSegments[currentIndex] : null
  const scannedCount = targetSegments.filter((segment) => segment.scanned).length
  const coverage = Math.round((scannedCount / mode.target) * 100)
  const upperDone = targetSegments.filter((segment) => segment.group === 'upper' && segment.scanned).length
  const lowerDone = targetSegments.filter((segment) => segment.group === 'lower' && segment.scanned).length
  const biteDone = targetSegments.filter((segment) => segment.group === 'bite' && segment.scanned).length
  const scanLabel = current ? current.group === 'upper' ? 'ზედა არკა' : current.group === 'lower' ? 'ქვედა არკა' : 'bite scan' : 'დასრულებულია'

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('helios700-scan-hero-best')
      if (stored) setBest(Number(stored) || 0)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('helios700-scan-hero-best', String(best))
    } catch {}
  }, [best])

  useEffect(() => {
    if (screen !== 'playing') return
    if (timeLeft <= 0 || battery <= 0 || accuracy <= 0) {
      setBest((value) => Math.max(value, score))
      setScreen(scannedCount >= mode.target ? 'win' : 'gameover')
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [accuracy, battery, mode.target, scannedCount, score, screen, timeLeft])

  useEffect(() => {
    if (screen !== 'playing') return
    if (scannedCount >= mode.target) {
      setBest((value) => Math.max(value, score))
      setScreen('win')
      setMessage('სკანირება წარმატებით დასრულდა.')
    }
  }, [mode.target, scannedCount, score, screen])

  useEffect(() => {
    if (screen !== 'playing') return

    const interval = window.setInterval(() => {
      setBattery((value) => clamp(value - 0.35, 0, 100))
      setMouthShift({
        x: Math.sin(Date.now() / 1200) * mode.motion,
        y: Math.cos(Date.now() / 1500) * (mode.motion * 0.55),
      })
    }, 180)

    return () => window.clearInterval(interval)
  }, [mode.motion, screen])

  function resetGame(nextMode: ModeId = modeId) {
    setModeId(nextMode)
    setSegments(createSegments())
    setScanner({ x: 118, y: 146 })
    setTilt(-12)
    setTimeLeft(MODES[nextMode].time)
    setScore(0)
    setAccuracy(100)
    setBattery(100)
    setSpeed(0)
    setMessage('მონიშნულ უბანზე მიდი და რამდენიმე წამით სტაბილურად გააჩერე სკანერი.')
    setDragging(false)
    setMouthShift({ x: 0, y: 0 })
    setStability(0)
    holdStartRef.current = null
    lastMoveRef.current = null
    setScreen('playing')
  }

  function completeSegment() {
    if (!current) return

    const gain = Math.round(70 + accuracy * 0.4 + battery * 0.1)
    setSegments((value) => value.map((segment) => (segment.id === current.id ? { ...segment, scanned: true } : segment)))
    setScore((value) => value + gain)
    setMessage(current.group === 'bite' ? 'bite scan ჩაითვალა.' : 'უბანი წარმატებით ჩაითვალა.')
    setStability(0)
    holdStartRef.current = null
  }

  function evaluateScan(x: number, y: number, nextSpeed: number) {
    if (!current) return

    const targetX = current.x + mouthShift.x
    const targetY = current.y + mouthShift.y
    const nearTarget = distance(x, y, targetX, targetY) < 22
    const angleOk = Math.abs(tilt - current.angle) <= 10
    const speedOk = nextSpeed <= mode.speedLimit

    if (!nearTarget) {
      holdStartRef.current = null
      setStability(0)
      setMessage('ჯერ მონიშნულ უბანზე მიიყვანე სკანერი.')
      return
    }

    if (!angleOk) {
      holdStartRef.current = null
      setStability(0)
      setAccuracy((value) => clamp(value - 0.35, 0, 100))
      setMessage('კუთხე ოდნავ დააკორექტირე.')
      return
    }

    if (!speedOk) {
      holdStartRef.current = null
      setStability(0)
      setAccuracy((value) => clamp(value - 0.4, 0, 100))
      setMessage('მოძრაობა ზედმეტად სწრაფია — უფრო რბილად ამოძრავე Helios700.')
      return
    }

    const now = performance.now()
    if (!holdStartRef.current) holdStartRef.current = now
    const heldMs = now - holdStartRef.current
    const percent = clamp((heldMs / mode.holdMs) * 100, 0, 100)
    setStability(percent)
    setMessage(percent < 100 ? 'კარგია — იგივე სტაბილურობით გააგრძელე.' : 'უბანი ჩაითვალა.')

    if (heldMs >= mode.holdMs) {
      completeSegment()
    }
  }

  function moveScanner(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect || screen !== 'playing') return

    const x = clamp(clientX - rect.left, 72, rect.width - 72)
    const y = clamp(clientY - rect.top, 112, rect.height - 100)
    const now = performance.now()
    let nextSpeed = 0

    if (lastMoveRef.current) {
      nextSpeed = Math.hypot(x - lastMoveRef.current.x, y - lastMoveRef.current.y) / Math.max(now - lastMoveRef.current.t, 16)
    }

    lastMoveRef.current = { x, y, t: now }
    setScanner({ x, y })
    setSpeed(nextSpeed)
    evaluateScan(x, y, nextSpeed)
  }

  const scannerGlow = current ? distance(scanner.x, scanner.y, current.x + mouthShift.x, current.y + mouthShift.y) < 28 : false

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.52),_transparent_24%),linear-gradient(180deg,#f4fdff_0%,#ebf8ff_45%,#e3f4ff_100%)] px-3 py-4 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-4 md:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link href="/game" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800">
                <ArrowLeft size={14} />
                Game Lounge
              </Link>
              <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">Helios700 Wireless</span>
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">სიჩქარე • სტაბილურობა • კუთხე</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-600 md:text-xs">Eighteeth Helios700 Wireless Intraoral Scanner</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Helios700 Scan Hero</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 md:text-base">
              ახლა თამაში უფრო რეალური სკანირების ტრენერია: სწორი ტრაექტორია, სტაბილური დაყოვნება, ზუსტი კუთხე და პაციენტის მსუბუქი მოძრაობა.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-slate-950 p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300">საუკეთესო შედეგი</p>
            <div className="mt-2 text-4xl font-black">{best}</div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm font-bold leading-7 text-slate-200">
              აქ მთავარი ფოკუსია სწრაფი, მაგრამ ბუნებრივი scan flow — არა კარნავალი.
            </div>
          </div>
        </motion.div>

        {screen === 'menu' && (
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <div className="grid gap-6 md:grid-cols-[1.02fr_.98fr]">
              <div>
                <h2 className="text-2xl font-black text-slate-950">როგორ მუშაობს</h2>
                <div className="mt-4 space-y-3 text-sm font-bold leading-7 text-slate-600">
                  <p>1. მონიშნულ უბანზე მიიყვანე სკანერი.</p>
                  <p>2. შეინარჩუნე სწორი კუთხე და ზედმეტად სწრაფად ნუ ამოძრავებ.</p>
                  <p>3. რამდენიმე წამით სტაბილურად გააჩერე, სანამ progress შეივსება.</p>
                  <p>4. პაციენტის მცირე მოძრაობას მოერგე ისე, როგორც რეალურ სკანირებაში.</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5">
                <div className="grid gap-3">
                  {(Object.entries(MODES) as [ModeId, (typeof MODES)[ModeId]][]).map(([id, item]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setModeId(id)}
                      className={`rounded-[24px] border p-4 text-left transition ${modeId === id ? 'border-cyan-400 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-900 hover:border-cyan-300'}`}
                    >
                      <div className="text-sm font-black uppercase tracking-[0.16em]">{item.title}</div>
                      <div className={`mt-2 text-xs font-bold leading-6 ${modeId === id ? 'text-slate-300' : 'text-slate-500'}`}>დრო: {item.time} წმ · უბნები: {item.target}</div>
                      <div className={`mt-1 text-xs font-bold leading-6 ${modeId === id ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => resetGame(modeId)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-950 transition hover:bg-cyan-300"
                >
                  <Play size={16} />
                  დაწყება
                </button>
              </div>
            </div>
          </div>
        )}

        {(screen === 'playing' || screen === 'win' || screen === 'gameover') && (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[30px] border border-white/70 bg-white/90 p-3 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div
                ref={boardRef}
                className="relative mx-auto h-[500px] w-full max-w-[420px] touch-none overflow-hidden rounded-[30px] border border-cyan-200 bg-[linear-gradient(180deg,#dff6ff_0%,#f7fdff_42%,#ebfbff_100%)]"
                onMouseDown={(event) => { setDragging(true); moveScanner(event.clientX, event.clientY) }}
                onMouseMove={(event) => dragging && moveScanner(event.clientX, event.clientY)}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => { setDragging(false); holdStartRef.current = null; setStability(0) }}
                onTouchStart={(event) => { setDragging(true); const touch = event.touches[0]; if (touch) moveScanner(touch.clientX, touch.clientY) }}
                onTouchMove={(event) => { const touch = event.touches[0]; if (touch) moveScanner(touch.clientX, touch.clientY) }}
                onTouchEnd={() => { setDragging(false); holdStartRef.current = null; setStability(0) }}
              >
                <div className="absolute inset-x-6 top-4 rounded-full bg-white/90 px-4 py-2 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-600">Helios700 Scan Session</p>
                </div>

                <svg viewBox="0 0 420 500" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="lipTone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f8b4c0" />
                      <stop offset="100%" stopColor="#f59db0" />
                    </linearGradient>
                    <linearGradient id="gumTone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f6cad4" />
                      <stop offset="100%" stopColor="#ebb1c1" />
                    </linearGradient>
                    <linearGradient id="oralCavity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b1e35" />
                      <stop offset="100%" stopColor="#5f1025" />
                    </linearGradient>
                    <linearGradient id="tongueTone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97988" />
                      <stop offset="100%" stopColor="#c86376" />
                    </linearGradient>
                  </defs>

                  <path d="M210 24C116 24 42 96 42 244c0 149 74 224 168 224s168-75 168-224C378 96 304 24 210 24Z" fill="url(#lipTone)" />
                  <path d="M210 54C134 54 76 112 76 202v96c0 89 58 146 134 146s134-57 134-146v-96C344 112 286 54 210 54Z" fill="#f7b1bf" opacity="0.7" />
                  <path d="M88 142c18-36 62-58 122-58s104 22 122 58c-14 26-36 42-63 50H151c-28-8-50-24-63-50Z" fill="url(#gumTone)" />
                  <path d="M88 356c18 36 62 58 122 58s104-22 122-58c-14-26-36-42-63-50H151c-28 8-50 24-63 50Z" fill="url(#gumTone)" />
                  <path d="M102 174c18-20 48-31 108-31s90 11 108 31c8 10 12 24 12 40 0 48-19 71-41 87-21 16-51 23-79 23s-58-7-79-23c-22-16-41-39-41-87 0-16 4-30 12-40Z" fill="url(#oralCavity)" />
                  <path d="M146 178c13-10 34-16 64-18 30-2 50-1 64 2 22 5 40 14 52 30-10 12-23 21-39 27-19 7-47 11-77 11-31 0-58-4-77-11-17-6-30-15-39-27 13-7 29-12 52-14Z" fill="#9d2840" opacity="0.5" />
                  <path d="M164 176c14 5 28 8 46 10 17 2 37 2 54 0 18-2 32-5 46-10" fill="none" stroke="#cf7e91" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
                  <path d="M171 191c12 4 24 7 39 8 15 2 35 2 50 0 15-1 27-4 39-8" fill="none" stroke="#cf7e91" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
                  <path d="M180 204c9 3 19 5 30 6 11 1 29 1 40 0 11-1 21-3 30-6" fill="none" stroke="#cf7e91" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
                  <path d="M210 166c-7 2-12 7-13 15 1 10 6 16 13 18 7-2 12-8 13-18-1-8-6-13-13-15Z" fill="#bb546b" opacity="0.55" />
                  <path d="M157 236c-8 6-13 16-15 30 6 18 19 30 38 38 18 8 41 12 68 12s50-4 68-12c19-8 32-20 38-38-2-14-7-24-15-30-7 11-17 20-31 27-16 8-36 12-60 12s-44-4-60-12c-14-7-24-16-31-27Z" fill="#6a162b" opacity="0.32" />
                  <path d="M126 310c18-11 46-16 84-16s66 5 84 16c-8 40-36 64-84 64s-76-24-84-64Z" fill="url(#tongueTone)" />
                  <path d="M142 318c17-8 40-12 68-12s51 4 68 12c-8 24-31 39-68 39s-60-15-68-39Z" fill="#d26f80" opacity="0.55" />
                  <path d="M210 308v54" fill="none" stroke="#c25e73" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
                  <path d="M174 330c10 7 22 10 36 11m-36 12c10 5 22 8 36 8m10-31c14-1 26-4 36-11m-36 31c14 0 26-3 36-8" fill="none" stroke="#e6a5b0" strokeWidth="3" strokeLinecap="round" opacity="0.32" />
                  <path d="M132 171c15 8 46 12 78 12s63-4 78-12" fill="none" stroke="#f7d9de" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
                  <path d="M144 332c16 10 38 15 66 15s50-5 66-15" fill="none" stroke="#efb8c2" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
                  <path d="M90 170c-8 17-11 35-11 55m262-55c8 17 11 35 11 55m-262 65c4 15 10 28 18 39m226-39c-4 15-10 28-18 39" fill="none" stroke="#7a2236" strokeWidth="3" strokeLinecap="round" opacity="0.28" />

                  {targetSegments.map((segment) => {
                    const tx = segment.x + mouthShift.x
                    const ty = segment.y + mouthShift.y
                    const active = segment.id === current?.id
                    const rotation = segment.group === 'upper' ? -segment.angle * 0.25 : segment.group === 'lower' ? -segment.angle * 0.25 : 0
                    return (
                      <g key={segment.id} transform={`translate(${tx} ${ty}) rotate(${rotation})`}>
                        <path
                          d={toothPath(segment)}
                          fill={segment.scanned ? '#06b6d4' : '#fffdfd'}
                          stroke={active ? '#38bdf8' : '#d7c4ca'}
                          strokeWidth={active ? 3 : 2}
                          opacity={segment.scanned ? 1 : 0.98}
                        />
                        {!segment.scanned && <path d={segment.group === 'upper' ? 'M -5 1 Q 0 4 5 1' : segment.group === 'lower' ? 'M -5 -1 Q 0 -4 5 -1' : 'M -6 0 Q 0 3 6 0'} fill="none" stroke="#e7c9c9" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />}
                      </g>
                    )
                  })}
                </svg>

                <div
                  className={`absolute transition ${scannerGlow ? 'drop-shadow-[0_0_22px_rgba(34,211,238,0.75)]' : 'drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]'}`}
                  style={{ left: scanner.x - 122, top: scanner.y - 42, transform: `rotate(${tilt}deg)` }}
                >
                  <div className="relative h-[80px] w-[244px]">
                    <Image
                      src="/images/helios700-scanner.png"
                      alt="Eighteeth Helios700 wireless intraoral scanner"
                      fill
                      sizes="244px"
                      className="object-contain select-none"
                      priority
                    />
                  </div>
                </div>

                {screen === 'win' && (
                  <div className="absolute inset-0 grid place-items-center bg-white/84 backdrop-blur-sm">
                    <div className="mx-3 rounded-3xl bg-white p-6 text-center shadow-xl">
                      <div className="text-2xl font-black text-slate-950">გაიმარჯვე</div>
                      <div className="mt-2 text-sm font-bold text-slate-600">სკანირება ზუსტად და ბუნებრივ flow-ში დაასრულე.</div>
                      <button type="button" onClick={() => resetGame(modeId)} className="mt-5 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white">თავიდან ცდა</button>
                    </div>
                  </div>
                )}

                {screen === 'gameover' && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/45 backdrop-blur-sm">
                    <div className="mx-3 rounded-3xl bg-white p-6 text-center shadow-xl">
                      <div className="text-2xl font-black text-slate-950">თავიდან ცდა</div>
                      <div className="mt-2 text-sm font-bold text-slate-600">ამ რაუნდში flow დაიშალა — კიდევ ერთხელ სცადე.</div>
                      <button type="button" onClick={() => resetGame(modeId)} className="mt-5 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white">თავიდან ცდა</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <h2 className="mb-4 text-xl font-black text-slate-950">კონტროლი</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setTilt((value) => clamp(value - 6, -24, 24))} disabled={screen !== 'playing'} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-50">კუთხე -</button>
                  <button type="button" onClick={() => setTilt((value) => clamp(value + 6, -24, 24))} disabled={screen !== 'playing'} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-50">კუთხე +</button>
                </div>
                <button type="button" onClick={() => resetGame(modeId)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950"><RotateCcw size={16} />თავიდან ცდა</button>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <h2 className="mb-4 text-xl font-black text-slate-950">სტატუსი</h2>
                <div className="space-y-4">
                  <div><div className="mb-2 flex justify-between text-sm font-bold text-slate-600"><span>ქულა</span><span>{score}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${coverage}%` }} /></div></div>
                  <div><div className="mb-2 flex justify-between text-sm font-bold text-slate-600"><span>დრო</span><span>{timeLeft} წმ</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${(timeLeft / mode.time) * 100}%` }} /></div></div>
                  <div><div className="mb-2 flex justify-between text-sm font-bold text-slate-600"><span>სიზუსტე</span><span>{Math.round(accuracy)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all" style={{ width: `${accuracy}%` }} /></div></div>
                  <div><div className="mb-2 flex justify-between text-sm font-bold text-slate-600"><span>ბატარეა</span><span>{Math.round(battery)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${battery}%` }} /></div></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">დაფარვა</div><div className="mt-2 text-2xl font-black text-slate-950">{coverage}%</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">სიჩქარე</div><div className="mt-2 text-2xl font-black text-cyan-600">{speed.toFixed(2)}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">სტაბილურობა</div><div className="mt-2 text-2xl font-black text-violet-600">{Math.round(stability)}%</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">აქტიური უბანი</div><div className="mt-2 text-lg font-black text-slate-950">{scanLabel}</div></div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">სკანის რუკა</h2>
                  <BatteryFull className="text-cyan-500" size={22} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ზედა</div><div className="mt-2 text-2xl font-black text-slate-950">{upperDone}/8</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ქვედა</div><div className="mt-2 text-2xl font-black text-slate-950">{lowerDone}/8</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center"><div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">bite</div><div className="mt-2 text-2xl font-black text-slate-950">{biteDone}/4</div></div>
                </div>
                <div className="mt-4 rounded-[24px] bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 text-sm font-bold leading-7 text-slate-700">{message}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

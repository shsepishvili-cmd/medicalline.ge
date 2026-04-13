'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, Search, Shield, Sparkles, Trophy } from 'lucide-react'

type Screen = 'menu' | 'playing' | 'win' | 'gameover' | 'finished'

type Level = {
  id: number
  name: string
  curve: number
  time: number
  targetSize: number
  difficulty: number
}

type Point = { x: number; y: number }
type Debris = Point & { id: number; size: number; cleaned: boolean }
type Fragment = Point & { loosened: number; grabbed: boolean }

const LEVELS: Level[] = [
  { id: 1, name: 'მარტივი არხი', curve: 0.12, time: 60, targetSize: 42, difficulty: 1 },
  { id: 2, name: 'ვიწრო არხი', curve: 0.18, time: 52, targetSize: 34, difficulty: 1.25 },
  { id: 3, name: 'მოხრილი არხი', curve: 0.28, time: 45, targetSize: 28, difficulty: 1.55 },
]

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function getCanalX(y: number, level: Level) {
  const center = 180
  return (
    center +
    Math.sin((y / 360) * Math.PI * 1.25) * 40 * level.curve * 4 +
    Math.sin((y / 360) * Math.PI * 3.1) * 12 * level.curve * 3
  )
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function makeDebris(level: Level): Debris[] {
  return Array.from({ length: 10 }, (_, index) => {
    const y = 70 + index * 22 + Math.random() * 10
    return {
      id: index,
      x: getCanalX(y, level) + (Math.random() * 18 - 9),
      y,
      size: 6 + Math.random() * 5,
      cleaned: false,
    }
  })
}

function playScalerPulse(audioContext: AudioContext) {
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const modulator = audioContext.createOscillator()
  const modulationGain = audioContext.createGain()
  const gain = audioContext.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(2200, now)
  oscillator.frequency.exponentialRampToValueAtTime(1450, now + 0.12)

  modulator.type = 'square'
  modulator.frequency.setValueAtTime(32, now)

  modulationGain.gain.setValueAtTime(260, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

  modulator.connect(modulationGain)
  modulationGain.connect(oscillator.frequency)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)

  oscillator.start(now)
  modulator.start(now)
  oscillator.stop(now + 0.15)
  modulator.stop(now + 0.15)
}

function Panel({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-[28px] border border-white/60 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}>
      {children}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  )
}

function BadgePill({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const tone =
    variant === 'primary'
      ? 'bg-cyan-100 text-cyan-700'
      : 'bg-slate-100 text-slate-700'

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{children}</span>
}

function BrandToolMascot({
  label,
  accent,
  face = 'happy',
  className = '',
}: {
  label: string
  accent: string
  face?: 'happy' | 'focus' | 'wow'
  className?: string
}) {
  const mouth =
    face === 'focus'
      ? 'M 28 40 Q 32 38 36 40'
      : face === 'wow'
        ? 'M 32 37 a 3 3 0 1 0 0.1 0'
        : 'M 25 38 Q 32 44 39 38'

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className="relative h-24 w-16 rounded-[22px] border-4 border-slate-900 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
        style={{ boxShadow: `0 12px 30px ${accent}33` }}
      >
        <div
          className="absolute left-1/2 top-2 h-3 w-10 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <svg viewBox="0 0 64 96" className="absolute inset-0 h-full w-full">
          <circle cx="24" cy="30" r="3.5" fill="#0f172a" />
          <circle cx="40" cy="30" r="3.5" fill="#0f172a" />
          {face === 'wow' ? (
            <circle cx="32" cy="39" r="4" fill="#0f172a" />
          ) : (
            <path d={mouth} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          )}
          <path d="M 10 48 Q 6 56 10 62" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <path d="M 54 48 Q 58 56 54 62" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <path d="M 22 92 L 18 82" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <path d="M 42 92 L 46 82" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <rect x="22" y="52" width="20" height="18" rx="6" fill={accent} opacity="0.9" />
        </svg>
      </div>
      <span className="text-center text-xs font-bold tracking-wide text-slate-700">{label}</span>
    </div>
  )
}

function PromoPoster() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-cyan-200/80 bg-[linear-gradient(180deg,#dff6ff_0%,#effbff_52%,#e0f2fe_100%)] p-4 shadow-[0_18px_50px_rgba(14,165,233,0.16)] md:rounded-[32px] md:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/50 to-transparent" />
      <div className="pointer-events-none absolute -left-6 top-4 h-28 w-28 rounded-full bg-cyan-200/45 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-sky-300/35 blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/40" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-700">
            Eighteeth Campaign
          </div>
          <div className="text-right text-sm font-black text-cyan-900">
            <div>5/12</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-500">Blue Edition</div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="text-xs font-black uppercase tracking-[0.34em] text-cyan-700">Medical Line Georgia</div>
          <h3 className="mt-2 text-2xl font-black italic tracking-wide text-cyan-950 md:text-4xl">
            Rescue The Canal
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Playful clinical energy inspired by Eighteeth campaign visuals and mascot-style instrument characters.
          </p>
        </div>

        <div className="mt-5 flex items-end justify-center gap-2 md:mt-6 md:gap-5">
          <BrandToolMascot label="UltraX" accent="#0ea5e9" face="happy" />
          <BrandToolMascot label="Scout" accent="#38bdf8" face="focus" className="translate-y-3" />
          <BrandToolMascot label="Irrigation" accent="#22d3ee" face="wow" />
          <BrandToolMascot label="Hero" accent="#2563eb" face="happy" className="translate-y-2" />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700">#Eighteeth</span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-sky-700">#DentalGame</span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-blue-700">#MedicalLineGeorgia</span>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
}) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export default function EndoRescueClient() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [levelIndex, setLevelIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].time)
  const [cursor, setCursor] = useState<Point>({ x: 180, y: 60 })
  const [zoom, setZoom] = useState(false)
  const [debris, setDebris] = useState<Debris[]>(makeDebris(LEVELS[0]))
  const [fragment, setFragment] = useState<Fragment>({ x: 180, y: 265, loosened: 0, grabbed: false })
  const [safety, setSafety] = useState(100)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('ჩართე ზუმი, გაწმინდე ნარჩენები, შემდეგ მოადუნე და ამოიღე ჩატეხილი ინსტრუმენტი.')
  const [best, setBest] = useState(0)
  const [dragging, setDragging] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const level = LEVELS[levelIndex]
  const cleanedCount = debris.filter((piece) => piece.cleaned).length
  const cleanProgress = Math.round((cleanedCount / debris.length) * 100)
  const canalCenterX = getCanalX(cursor.y, level)
  const wallDistance = Math.abs(cursor.x - canalCenterX)
  const fragmentDistance = distance(cursor, fragment)
  const nearFragment = fragmentDistance < level.targetSize
  const grabAssistDistance = level.targetSize + 18
  const canLoosen = zoom && cleanProgress >= 60 && nearFragment
  const canGrab = fragment.loosened >= 100 && fragmentDistance < grabAssistDistance

  const playIrrigationSound = () => {
    if (typeof window === 'undefined') return

    const AudioCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    const context = audioContextRef.current ?? new AudioCtor()
    audioContextRef.current = context

    if (context.state === 'suspended') {
      void context.resume().then(() => {
        playScalerPulse(context)
      })
      return
    }

    playScalerPulse(context)
  }

  useEffect(() => {
    try {
      const storedBest = window.localStorage.getItem('endo-rescue-best')
      if (storedBest) setBest(Number(storedBest) || 0)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('endo-rescue-best', String(best))
    } catch {}
  }, [best])

  const canalPath = useMemo(() => {
    let path = 'M 180 32 '
    for (let y = 40; y <= 360; y += 10) {
      path += `L ${getCanalX(y, level)} ${y} `
    }
    return path
  }, [level])

  const leftWall = useMemo(() => {
    let path = 'M 160 28 '
    for (let y = 40; y <= 360; y += 10) {
      path += `L ${getCanalX(y, level) - 26} ${y} `
    }
    return path
  }, [level])

  const rightWall = useMemo(() => {
    let path = 'M 200 28 '
    for (let y = 40; y <= 360; y += 10) {
      path += `L ${getCanalX(y, level) + 26} ${y} `
    }
    return path
  }, [level])

  const resetLevel = (index = levelIndex) => {
    const nextLevel = LEVELS[index]
    const fragmentY = 245 + index * 18
    setLevelIndex(index)
    setTimeLeft(nextLevel.time)
    setCursor({ x: getCanalX(60, nextLevel), y: 60 })
    setZoom(false)
    setDebris(makeDebris(nextLevel))
    setFragment({ x: getCanalX(fragmentY, nextLevel), y: fragmentY, loosened: 0, grabbed: false })
    setSafety(100)
    setMessage('ჩართე ზუმი, გაწმინდე ნარჩენები, შემდეგ მოადუნე და ამოიღე ჩატეხილი ინსტრუმენტი.')
    setScreen('playing')
  }

  useEffect(() => {
    if (screen !== 'playing') return
    if (timeLeft <= 0 || safety <= 0) {
      setScreen('gameover')
      setBest((current) => Math.max(current, score))
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [screen, timeLeft, safety, score])

  useEffect(() => {
    if (screen !== 'playing') return
    if (wallDistance > 22) {
      setSafety((value) => clamp(value - 0.7 * level.difficulty, 0, 100))
    } else if (wallDistance < 14) {
      setSafety((value) => clamp(value + 0.18, 0, 100))
    }
  }, [cursor, wallDistance, screen, level])

  const updateCursorFromPointer = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clamp(clientX - rect.left, 18, rect.width - 18)
    const y = clamp(clientY - rect.top, 18, rect.height - 18)
    setCursor({ x, y })
  }

  const handleClean = () => {
    const nextDebris = debris.map((piece) => {
      if (piece.cleaned) return piece
      return distance(cursor, piece) < 20 ? { ...piece, cleaned: true } : piece
    })
    const changed = nextDebris.some((piece, index) => piece.cleaned !== debris[index].cleaned)
    setDebris(nextDebris)

    if (changed) {
      playIrrigationSound()
      setScore((value) => value + 25)
      setMessage('კარგია. ნარჩენები გაწმენდილია.')
      return
    }

    setMessage('გაწმენდამდე ნარჩენებთან უფრო ახლოს მიიტანე ინსტრუმენტი.')
  }

  const handleLoosen = () => {
    if (!canLoosen) {
      setMessage('საჭიროა ზუმი, უკეთესი ხილვადობა და ფრაგმენტთან ზუსტი პოზიციონირება.')
      return
    }

    const nextLoosened = clamp(fragment.loosened + 22, 0, 100)
    setFragment((value) => ({ ...value, loosened: nextLoosened }))
    setScore((value) => value + 15)
    setMessage(
      nextLoosened >= 100
        ? 'ფრაგმენტი საკმარისად მოდუნებულია. ახლა მიიტანე წვერი ახლოს და დააჭირე ამოღებას.'
        : 'ულტრაბგერითი აქტივაცია წარმატებით შესრულდა.',
    )
  }

  const handleGrab = () => {
    if (fragment.loosened < 100) {
      setMessage('ამოღებამდე ჯერ სრულად უნდა მოადუნო ფრაგმენტი.')
      return
    }

    if (!canGrab) {
      setMessage('დაჭერამდე სრულად მოადუნე ფრაგმენტი და არხის ცენტრში დარჩი.')
      return
    }

    setFragment((value) => ({ ...value, grabbed: true }))
    const bonus = Math.round(safety + timeLeft * 3 + 120)
    const nextScore = score + bonus
    setScore(nextScore)
    setBest((value) => Math.max(value, nextScore))

    if (levelIndex < LEVELS.length - 1) {
      setMessage('ფრაგმენტი ამოღებულია. შემდეგი დონე გაიხსნა.')
      setScreen('win')
      return
    }

    setMessage('შესანიშნავია. ყველა დონე დასრულებულია.')
    setScreen('finished')
  }

  const nextLevel = () => {
    const nextIndex = levelIndex + 1
    if (nextIndex < LEVELS.length) resetLevel(nextIndex)
  }

  const stars = useMemo(() => {
    if (score > 700) return 3
    if (score > 420) return 2
    return 1
  }, [score])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dff6ff,transparent_30%),radial-gradient(circle_at_bottom_right,#c7f1ff,transparent_24%),linear-gradient(180deg,#f4fbff_0%,#edf8ff_54%,#e0f2fe_100%)] px-3 py-4 md:px-8 md:py-10">
      <div className="pointer-events-none absolute left-[8%] top-24 h-12 w-12 rounded-full bg-sky-200/45 blur-xl" />
      <div className="pointer-events-none absolute right-[10%] top-40 h-16 w-16 rounded-full bg-cyan-200/40 blur-2xl" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid gap-4 md:grid-cols-[1.2fr_.8fr]"
        >
          <Panel className="relative overflow-hidden p-4 md:p-6">
            <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-cyan-100/80 blur-2xl" />
            <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
              <BadgePill>Medical Line Georgia</BadgePill>
              <BadgePill variant="secondary">Eighteeth ენდო-გადარჩენის დემო</BadgePill>
              <Link
                href="/game"
                className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Game Lounge
              </Link>
            </div>
            <div className="mb-4 grid items-center gap-4 md:mb-5 md:grid-cols-[1fr_180px]">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-500 md:text-xs md:tracking-[0.35em]">
                  Playful Clinical Branding
                </p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-5xl">
                  ინტერაქტიული სტომატოლოგიური მინი-თამაშის კონცეფცია
                </h1>
              </div>
              <div className="hidden justify-center md:flex">
                <div className="rounded-[30px] bg-gradient-to-br from-sky-100 via-white to-cyan-100 p-4 shadow-inner">
                  <div className="flex gap-3">
                    <BrandToolMascot label="UltraX" accent="#0ea5e9" face="happy" />
                    <BrandToolMascot label="Irrigation" accent="#22d3ee" face="wow" className="translate-y-4" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:mt-4 md:text-base md:leading-7">
              უსაფრთხოდ ამოიღე ჩატეხილი ინსტრუმენტის ფრაგმენტი არხიდან. გამოიყენე ზუმი, გაწმინდე ნარჩენები,
              მოადუნე ფრაგმენტი და ამოიღე ისე, რომ არხის კედლები არ დააზიანო.
            </p>
          </Panel>

          <Panel className="relative overflow-hidden p-4 md:p-6">
            <div className="pointer-events-none absolute inset-x-6 top-5 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
            <div className="flex h-full flex-col justify-center gap-4 text-slate-700">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                საუკეთესო ქულა: <span className="font-bold">{best}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                უსაფრთხოება მნიშვნელოვანია
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-600" />
                მზადაა landing page-ისთვის
              </div>
              <div className="mt-2 hidden items-end justify-center gap-4 sm:flex">
                <BrandToolMascot label="Scout" accent="#38bdf8" face="focus" />
                <BrandToolMascot label="Hero Tool" accent="#2563eb" face="happy" className="translate-y-2" />
              </div>
            </div>
          </Panel>
        </motion.div>

        {screen === 'menu' && (
          <Panel className="relative overflow-hidden p-4 md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-100/60 via-transparent to-cyan-100/50" />
            <div className="grid gap-6 md:grid-cols-[1.1fr_.9fr]">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">როგორ მუშაობს</h2>
                <div className="space-y-3 text-slate-600">
                  <p>1. ჩართე ზუმი უკეთესი ხილვადობისთვის.</p>
                  <p>2. გაწმინდე ნარჩენები არხის გარშემო.</p>
                  <p>3. სწორად მიიტანე ინსტრუმენტი ჩატეხილ ფრაგმენტთან.</p>
                  <p>4. მოადუნე ფრაგმენტი და ფრთხილად ამოიღე.</p>
                </div>
                <ActionButton onClick={() => resetLevel(0)} className="w-full gap-2 sm:w-auto">
                  <Play className="h-4 w-4" />
                  დემოს დაწყება
                </ActionButton>
              </div>

              <div className="grid gap-3">
                <PromoPoster />
                <div className="mb-1 hidden justify-center gap-4 rounded-[24px] bg-gradient-to-r from-sky-50 to-cyan-50 p-4 sm:flex">
                  <BrandToolMascot label="Clean" accent="#22d3ee" face="happy" />
                  <BrandToolMascot label="Guide" accent="#0ea5e9" face="focus" />
                  <BrandToolMascot label="Rescue" accent="#2563eb" face="wow" />
                </div>
                {LEVELS.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="font-semibold text-slate-900">
                      დონე {item.id}: {item.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      უფრო ვიწრო არხები, ნაკლები დრო და მეტი სიზუსტეა საჭირო.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {(screen === 'playing' || screen === 'win' || screen === 'gameover' || screen === 'finished') && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <Panel className="p-3 md:p-6">
              <div
                ref={boardRef}
                className={`relative mx-auto h-[380px] w-full max-w-[360px] touch-none overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-b from-cyan-50 to-white sm:h-[420px] sm:rounded-[32px] ${zoom ? 'ring-4 ring-cyan-200' : ''}`}
                onMouseDown={(event) => {
                  setDragging(true)
                  updateCursorFromPointer(event.clientX, event.clientY)
                }}
                onMouseMove={(event) => dragging && updateCursorFromPointer(event.clientX, event.clientY)}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onTouchStart={(event) => {
                  setDragging(true)
                  const touch = event.touches[0]
                  if (touch) updateCursorFromPointer(touch.clientX, touch.clientY)
                }}
                onTouchMove={(event) => {
                  const touch = event.touches[0]
                  if (touch) updateCursorFromPointer(touch.clientX, touch.clientY)
                }}
                onTouchEnd={() => setDragging(false)}
              >
                <svg viewBox="0 0 360 420" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="toothFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#e2f8ff" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M110 12 C 88 42, 96 98, 118 140 C 135 172, 136 198, 128 240 C 120 278, 128 340, 170 392 L 190 392 C 232 340, 240 278, 232 240 C 224 198, 225 172, 242 140 C 264 98, 272 42, 250 12 Z"
                    fill="url(#toothFill)"
                    stroke="#cdeff6"
                    strokeWidth="3"
                  />

                  <path d={leftWall} fill="none" stroke="#d6d3d1" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                  <path d={rightWall} fill="none" stroke="#d6d3d1" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                  <path
                    d={canalPath}
                    fill="none"
                    stroke="#5eead4"
                    strokeWidth={zoom ? 12 : 10}
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {debris.map((piece) => (
                    <circle
                      key={piece.id}
                      cx={piece.x}
                      cy={piece.y}
                      r={piece.cleaned ? 0 : piece.size}
                      fill="#94a3b8"
                      opacity={piece.cleaned ? 0 : 0.85}
                    />
                  ))}

                  {!fragment.grabbed && (
                    <g>
                      <line
                        x1={fragment.x - 10}
                        y1={fragment.y - 10}
                        x2={fragment.x + 10}
                        y2={fragment.y + 10}
                        stroke="#0f172a"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <line
                        x1={fragment.x + 10}
                        y1={fragment.y - 10}
                        x2={fragment.x - 10}
                        y2={fragment.y + 10}
                        stroke="#0f172a"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  <line
                    x1={cursor.x}
                    y1="10"
                    x2={cursor.x}
                    y2={cursor.y}
                    stroke={nearFragment ? '#06b6d4' : '#334155'}
                    strokeWidth="3"
                    strokeDasharray="7 6"
                  />
                  <circle
                    cx={cursor.x}
                    cy={cursor.y}
                    r={zoom ? 16 : 12}
                    fill="white"
                    stroke={nearFragment ? '#06b6d4' : '#0f172a'}
                    strokeWidth="3"
                  />
                  <circle cx={cursor.x} cy={cursor.y} r="3" fill={nearFragment ? '#06b6d4' : '#0f172a'} />
                </svg>

                {screen === 'win' && (
                  <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm">
                    <div className="mx-3 rounded-3xl bg-white p-4 text-center shadow-xl sm:p-6">
                      <div className="mb-4 hidden justify-center gap-4 sm:flex">
                        <BrandToolMascot label="Bravo" accent="#0ea5e9" face="happy" />
                        <BrandToolMascot label="Star" accent="#38bdf8" face="wow" className="translate-y-2" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 sm:text-2xl">არხი გადარჩენილია</div>
                      <div className="mt-2 text-slate-600">დონე დასრულებულია. მზად ხარ შემდეგი გამოწვევისთვის.</div>
                      <ActionButton onClick={nextLevel} className="mt-4">
                        შემდეგი დონე
                      </ActionButton>
                    </div>
                  </div>
                )}

                {screen === 'gameover' && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-900/45 backdrop-blur-sm">
                    <div className="mx-3 rounded-3xl bg-white p-4 text-center shadow-xl sm:p-6">
                      <div className="mb-4 hidden justify-center sm:flex">
                        <BrandToolMascot label="Retry" accent="#0ea5e9" face="focus" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 sm:text-2xl">სცადე თავიდან</div>
                      <div className="mt-2 text-slate-600">დრო ან უსაფრთხოების მაჩვენებელი ამოიწურა.</div>
                      <ActionButton onClick={() => resetLevel(levelIndex)} className="mt-4">
                        დონის თავიდან დაწყება
                      </ActionButton>
                    </div>
                  </div>
                )}

                {screen === 'finished' && (
                  <div className="absolute inset-0 grid place-items-center bg-cyan-900/25 backdrop-blur-sm">
                    <div className="mx-3 rounded-3xl bg-white p-4 text-center shadow-xl sm:p-6">
                      <div className="mb-4 hidden justify-center gap-4 sm:flex">
                        <BrandToolMascot label="UltraX" accent="#0ea5e9" face="happy" />
                        <BrandToolMascot label="Hero" accent="#22d3ee" face="wow" className="translate-y-2" />
                        <BrandToolMascot label="Team" accent="#2563eb" face="happy" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 sm:text-2xl">Eighteeth-ის გადარჩენის ოსტატი</div>
                      <div className="mt-2 text-slate-600">
                        შენ დაასრულე სრული დემო. უფრო მეტი ინფორმაციისთვის შეგიძლია გადახვიდე ჩვენს ბლოგზე ან
                        კატალოგზე.
                      </div>
                      <div className="mt-4 flex justify-center gap-1 text-amber-500">
                        {Array.from({ length: stars }).map((_, index) => (
                          <span key={index}>★</span>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-3">
                        <Link
                          href="/blog"
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          მეტი ინფორმაცია ბლოგზე
                        </Link>
                        <Link
                          href="/catalog"
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                        >
                          პროდუქტების კატალოგი
                        </Link>
                        <ActionButton
                          variant="outline"
                          onClick={() => {
                            setScore(0)
                            resetLevel(0)
                          }}
                        >
                          თამაშზე დაბრუნება
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <div className="grid gap-6">
              <Panel className="relative overflow-hidden p-4 md:p-6">
                <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                  Eighteeth Play
                </div>
                <h2 className="mb-4 text-xl font-bold text-slate-900">თამაშის კონტროლები</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ActionButton
                    variant={zoom ? 'primary' : 'secondary'}
                    onClick={() => {
                      setZoom((value) => !value)
                      setMessage(!zoom ? 'ზუმი ჩართულია.' : 'ზუმი გამორთულია.')
                    }}
                    disabled={screen !== 'playing'}
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {zoom ? 'ზუმი ჩართულია' : 'ზუმის ჩართვა'}
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={handleClean} disabled={screen !== 'playing'}>
                    ნარჩენების გაწმენდა
                  </ActionButton>
                  <ActionButton onClick={handleLoosen} disabled={screen !== 'playing'}>
                    ულტრაბგერით მოდუნება
                  </ActionButton>
                  <ActionButton onClick={handleGrab} disabled={screen !== 'playing'}>
                    ფრაგმენტის ამოღება
                  </ActionButton>
                </div>

                <ActionButton
                  variant="outline"
                  onClick={() => resetLevel(levelIndex)}
                  className="mt-4 w-full gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  დონის თავიდან დაწყება
                </ActionButton>
              </Panel>

              <Panel className="relative overflow-hidden p-4 md:p-6">
                <div className="pointer-events-none absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-cyan-100/80 blur-2xl" />
                <h2 className="mb-4 text-xl font-bold text-slate-900">სტატუსი</h2>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>დონე</span>
                      <span>
                        {level.id} · {level.name}
                      </span>
                    </div>
                    <ProgressBar value={(level.id / LEVELS.length) * 100} />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>უსაფრთხოების მაჩვენებელი</span>
                      <span>{Math.round(safety)}%</span>
                    </div>
                    <ProgressBar value={safety} />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>გაწმენდილი ნარჩენები</span>
                      <span>{cleanProgress}%</span>
                    </div>
                    <ProgressBar value={cleanProgress} />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>მოდუნებული ფრაგმენტი</span>
                      <span>{fragment.loosened}%</span>
                    </div>
                    <ProgressBar value={fragment.loosened} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Time</div>
                      <div className="text-xl font-semibold text-slate-900">{timeLeft}s</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Score</div>
                      <div className="text-xl font-semibold text-slate-900">{score}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">ვარსკვლავები</div>
                      <div className="text-xl font-semibold text-amber-500">
                        {Array.from({ length: stars }).map((_, index) => (
                          <span key={index}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hidden rounded-[24px] border border-cyan-100 bg-gradient-to-r from-sky-50 to-white p-4 sm:block">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-500">
                      Promo Style
                    </div>
                    <div className="flex items-end justify-center gap-3">
                      <BrandToolMascot label="Ad Tool" accent="#0ea5e9" face="happy" />
                      <BrandToolMascot label="Clinic Star" accent="#2563eb" face="wow" className="translate-y-2" />
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel className="relative overflow-hidden p-4 md:p-6">
                <h2 className="mb-4 text-xl font-bold text-slate-900">მინიშნებების პანელი</h2>
                <div className="mb-4 flex items-start gap-3 sm:items-end sm:gap-4">
                  <div className="hidden sm:block">
                    <BrandToolMascot label="Helper" accent="#0ea5e9" face={nearFragment ? 'wow' : 'happy'} />
                  </div>
                  <div className="relative flex-1 rounded-[24px] bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-4 text-sm text-slate-700 shadow-inner">
                    <div className="absolute -left-2 bottom-5 hidden h-4 w-4 rotate-45 bg-cyan-50 sm:block" />
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-500">
                      Mascot Tip
                    </div>
                    {message}
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  წვერის გადასაადგილებლად გადაათრიე ან შეეხე სათამაშო არეს. უსაფრთხოებისთვის ეცადე არხის
                  ცენტრში დარჩე.
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

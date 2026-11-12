'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BatteryFull,
  Camera,
  Play,
  Radiation,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'

type Screen = 'menu' | 'playing' | 'win' | 'gameover'
type SensorSize = 1 | 2

type XrayCase = {
  id: string
  title: string
  zone: string
  description: string
  targetX: number
  targetY: number
  sensorY: number
  sensorTilt: number
  targetAngle: number
  targetExposure: number
  sensorSize: SensorSize
  passScore: number
}

type Point = { x: number; y: number }

type CaptureResult = {
  accepted: boolean
  quality: number
  centerScore: number
  angleScore: number
  exposureScore: number
  sensorScore: number
  impactDistance: number
  angleDiff: number
  exposureDiff: number
  caseTitle: string
}

const EXPOSURE_STEPS = [0.08, 0.1, 0.12, 0.16, 0.2, 0.25, 0.32] as const
const BOARD_WIDTH = 420
const BOARD_HEIGHT = 520
const DEVICE_WIDTH = 220
const DEVICE_HEIGHT = 140
const DEVICE_TIP = { x: 28, y: 72 }
const BEAM_LENGTH = 176
const MIN_ANGLE = -28
const MAX_ANGLE = 24

const XRAY_CASES: XrayCase[] = [
  {
    id: 'bitewing-right',
    title: 'მარჯვენა Bitewing',
    zone: 'პოსტერიორი კონტაქტები',
    description: 'გახსენი კონტაქტები სუფთად და ორივე გვირგვინი მკაფიოდ დატოვე კადრში.',
    targetX: 214,
    targetY: 230,
    sensorY: 228,
    sensorTilt: -1,
    targetAngle: 0,
    targetExposure: 0.16,
    sensorSize: 2,
    passScore: 74,
  },
  {
    id: 'upper-molar',
    title: 'ზედა მოლარის Apex',
    zone: 'ზედა პოსტერიორი',
    description: 'გამოიყენე HyperLight-ის კუთხე ისე, რომ აპექსის უბანი ჩანდეს და ფესვები არ მოიჭრას.',
    targetX: 208,
    targetY: 188,
    sensorY: 198,
    sensorTilt: -9,
    targetAngle: -20,
    targetExposure: 0.2,
    sensorSize: 2,
    passScore: 78,
  },
  {
    id: 'lower-premolar',
    title: 'ქვედა პრემოლარის დეტალი',
    zone: 'ქვედა პრემოლარი',
    description: 'გადადი NanoPix 1-ზე და beam უფრო ვიწროდ მოარგე, რომ პრემოლარის კადრი სუფთა გამოვიდეს.',
    targetX: 223,
    targetY: 286,
    sensorY: 284,
    sensorTilt: 12,
    targetAngle: 16,
    targetExposure: 0.12,
    sensorSize: 1,
    passScore: 76,
  },
  {
    id: 'anterior-apex',
    title: 'წინა კბილის Apex',
    zone: 'ანტერიორი',
    description: 'თხელი NanoPix-ის პოზიცია, ოდნავ აწეული კუთხე და მოკლე exposure ამ შემთხვევას იგებს.',
    targetX: 198,
    targetY: 248,
    sensorY: 246,
    sensorTilt: -14,
    targetAngle: -10,
    targetExposure: 0.1,
    sensorSize: 1,
    passScore: 80,
  },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const formatExposure = (value: number) => `${value.toFixed(2)} s`

function nearestExposure(value: number) {
  return EXPOSURE_STEPS.reduce((closest, step) =>
    Math.abs(step - value) < Math.abs(closest - value) ? step : closest,
  EXPOSURE_STEPS[0])
}

function stepExposure(value: number, direction: -1 | 1) {
  const currentIndex = EXPOSURE_STEPS.findIndex((step) => step === nearestExposure(value))
  return EXPOSURE_STEPS[clamp(currentIndex + direction, 0, EXPOSURE_STEPS.length - 1)]
}

function beamImpactPoint(tip: Point, angle: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: tip.x - Math.cos(radians) * BEAM_LENGTH,
    y: tip.y + Math.sin(radians) * BEAM_LENGTH,
  }
}

function beamPolygon(start: Point, end: Point, startWidth: number, endWidth: number) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.max(Math.hypot(dx, dy), 1)
  const nx = -dy / length
  const ny = dx / length

  const p1 = { x: start.x + nx * startWidth, y: start.y + ny * startWidth }
  const p2 = { x: start.x - nx * startWidth, y: start.y - ny * startWidth }
  const p3 = { x: end.x - nx * endWidth, y: end.y - ny * endWidth }
  const p4 = { x: end.x + nx * endWidth, y: end.y + ny * endWidth }

  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`
}

function ExposureBars({ value }: { value: number }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {EXPOSURE_STEPS.map((step) => (
        <div
          key={step}
          className={`h-10 rounded-2xl border text-center text-[10px] font-black uppercase tracking-[0.18em] ${
            step === value
              ? 'border-cyan-400 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <div className="pt-2">{step.toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  )
}

export default function XrayAlignmentClient() {
  const boardRef = useRef<HTMLDivElement>(null)

  const [screen, setScreen] = useState<Screen>('menu')
  const [caseIndex, setCaseIndex] = useState(0)
  const [beamTip, setBeamTip] = useState<Point>({ x: 372, y: 230 })
  const [beamAngle, setBeamAngle] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [sensorSize, setSensorSize] = useState<SensorSize>(2)
  const [exposure, setExposure] = useState<number>(0.16)
  const [timeLeft, setTimeLeft] = useState(95)
  const [battery, setBattery] = useState(100)
  const [comfort, setComfort] = useState(100)
  const [score, setScore] = useState(0)
  const [retakes, setRetakes] = useState(0)
  const [best, setBest] = useState(0)
  const [message, setMessage] = useState('მოარგე HyperLight, აირჩიე სწორი NanoPix ზომა, დაარეგულირე exposure და გადაიღე კადრი.')
  const [lastCapture, setLastCapture] = useState<CaptureResult | null>(null)
  const [patientShift, setPatientShift] = useState<Point>({ x: 0, y: 0 })
  const [flashTone, setFlashTone] = useState<'idle' | 'good' | 'bad'>('idle')

  const currentCase = useMemo(() => XRAY_CASES[caseIndex] ?? null, [caseIndex])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('hyperlight-nanopix-best')
      if (stored) setBest(Number(stored) || 0)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('hyperlight-nanopix-best', String(best))
    } catch {}
  }, [best])

  useEffect(() => {
    if (screen !== 'playing') return
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [screen, timeLeft])

  useEffect(() => {
    if (screen !== 'playing') return

    const interval = window.setInterval(() => {
      setBattery((value) => clamp(value - 0.28, 0, 100))
      setPatientShift({
        x: Math.sin(Date.now() / 950) * 1.2,
        y: Math.cos(Date.now() / 1200) * 0.9,
      })
    }, 180)

    return () => window.clearInterval(interval)
  }, [screen])

  useEffect(() => {
    if (screen !== 'playing') return
    if (timeLeft > 0 && battery > 0 && comfort > 0 && retakes < 6) return

    setBest((value) => Math.max(value, score))
    setScreen('gameover')
    setMessage('სესია შეწყდა. თავიდან დაალაგე პოზიცია და სცადე ხელახლა.')
  }, [battery, comfort, retakes, score, screen, timeLeft])

  useEffect(() => {
    if (flashTone === 'idle') return
    const timer = window.setTimeout(() => setFlashTone('idle'), 260)
    return () => window.clearTimeout(timer)
  }, [flashTone])

  function primeCase(nextIndex: number) {
    const nextCase = XRAY_CASES[nextIndex]
    if (!nextCase) return

    setBeamTip({ x: 368, y: clamp(nextCase.targetY - nextCase.targetAngle * 0.8, 156, 356) })
    setBeamAngle(clamp(nextCase.targetAngle + (nextIndex % 2 === 0 ? 6 : -7), MIN_ANGLE, MAX_ANGLE))
    setExposure(stepExposure(nextCase.targetExposure, nextIndex % 2 === 0 ? 1 : -1))
  }

  function resetGame() {
    setScreen('playing')
    setCaseIndex(0)
    setSensorSize(2)
    setExposure(0.16)
    setTimeLeft(95)
    setBattery(100)
    setComfort(100)
    setScore(0)
    setRetakes(0)
    setLastCapture(null)
    setMessage('პირველი შემთხვევა NanoPix 2-ით იწყება. გადაადგილე HyperLight, გაასწორე კუთხე და გადაიღე.')
    setPatientShift({ x: 0, y: 0 })
    setFlashTone('idle')
    setDragging(false)
    setBeamTip({ x: 372, y: 230 })
    setBeamAngle(6)
  }

  function stopDragging() {
    setDragging(false)
  }

  function moveBeam(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect || screen !== 'playing') return

    setBeamTip({
      x: clamp(clientX - rect.left, 296, rect.width - 18),
      y: clamp(clientY - rect.top, 146, rect.height - 132),
    })
  }

  function captureImage() {
    if (screen !== 'playing' || !currentCase) return

    const shiftedTarget = {
      x: currentCase.targetX + patientShift.x,
      y: currentCase.targetY + patientShift.y,
    }
    const impact = beamImpactPoint(beamTip, beamAngle)
    const impactDistance = distance(impact, shiftedTarget)
    const angleDiff = Math.abs(beamAngle - currentCase.targetAngle)
    const exposureDiff = Math.abs(exposure - currentCase.targetExposure)
    const centerScore = clamp(100 - impactDistance * 1.55, 0, 100)
    const angleScore = clamp(100 - angleDiff * 3.8, 0, 100)
    const exposureScore = clamp(100 - exposureDiff * 480, 0, 100)
    const sensorScore = sensorSize === currentCase.sensorSize ? 100 : 54
    const quality = Math.round(centerScore * 0.38 + angleScore * 0.24 + exposureScore * 0.18 + sensorScore * 0.2)
    const accepted = quality >= currentCase.passScore && centerScore >= 58 && angleScore >= 56

    const result: CaptureResult = {
      accepted,
      quality,
      centerScore,
      angleScore,
      exposureScore,
      sensorScore,
      impactDistance,
      angleDiff,
      exposureDiff,
      caseTitle: currentCase.title,
    }

    setLastCapture(result)
    setFlashTone(accepted ? 'good' : 'bad')
    setBattery((value) => clamp(value - (accepted ? 4.5 : 7), 0, 100))

    if (accepted) {
      const gain = Math.round(quality + comfort * 0.35 + battery * 0.15)
      const nextIndex = caseIndex + 1
      setScore((value) => value + gain)
      setComfort((value) => clamp(value - 4, 0, 100))

      if (nextIndex >= XRAY_CASES.length) {
        const nextScore = score + gain
        setBest((value) => Math.max(value, nextScore))
        setScreen('win')
        setMessage('დიაგნოსტიკური კადრი მიღებულია. HyperLight და NanoPix სესია წარმატებით დახურეს.')
        return
      }

      setCaseIndex(nextIndex)
      primeCase(nextIndex)
      setMessage(`${currentCase.title} წარმატებით ჩაითვალა. შემდეგი შემთხვევა: ${XRAY_CASES[nextIndex].title}.`)
      return
    }

    const nextRetakes = retakes + 1
    setRetakes(nextRetakes)
    setComfort((value) => clamp(value - 14, 0, 100))
    setTimeLeft((value) => Math.max(value - 4, 0))

    const exposureHint =
      exposure < currentCase.targetExposure
        ? 'Exposure ოდნავ გაზარდე.'
        : exposure > currentCase.targetExposure
          ? 'Exposure ზედმეტად მაღალია.'
          : 'Exposure ნორმაშია.'

    const sensorHint =
      sensorSize === currentCase.sensorSize
        ? 'სენსორის ზომა სწორია.'
        : `გადაერთე NanoPix ${currentCase.sensorSize}-ზე.`

    setMessage(`სჭირდება retake. ${sensorHint} ${exposureHint}`)
  }

  const shiftedCase = currentCase
    ? {
        ...currentCase,
        targetX: currentCase.targetX + patientShift.x,
        targetY: currentCase.targetY + patientShift.y,
        sensorY: currentCase.sensorY + patientShift.y,
      }
    : null

  const impact = beamImpactPoint(beamTip, beamAngle)
  const deviceFrame = { left: beamTip.x - DEVICE_TIP.x, top: beamTip.y - DEVICE_TIP.y }
  const glowActive = shiftedCase ? distance(impact, { x: shiftedCase.targetX, y: shiftedCase.targetY }) < 26 : false
  const beamShape = beamPolygon(beamTip, impact, 8, 24)
  const coverage = Math.round((caseIndex / XRAY_CASES.length) * 100)

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.45),_transparent_22%),linear-gradient(180deg,#f4fdff_0%,#eefbff_38%,#ecfdf5_100%)] px-3 py-4 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link href="/game" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800">
                <ArrowLeft size={14} />
                თამაშები
              </Link>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                HyperLight + NanoPix
              </span>
              <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                პოზიცია / სენსორი / ექსპოჟერი
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-emerald-600 md:text-xs">
              პორტატული რენტგენი + ინტრაორალური სენსორი
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              HyperLight ზუსტი კადრი
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 md:text-base">
              გადაადგილე HyperLight-ის თავი, მოარგე კუთხე, აირჩიე NanoPix 1 ან 2 და დააყენე სწორი exposure.
              სუფთა კადრი მეტ ქულას გაძლევს, ხოლო retake დროსაც აკლებს და პაციენტის კომფორტსაც.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-slate-950 p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300">საუკეთესო შედეგი</p>
            <div className="mt-2 text-4xl font-black">{best}</div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm font-bold leading-7 text-slate-200">
              HyperLight-ის theme აქ არის one-hand გამოყენება და კუთხის კონტროლი. NanoPix-ის მხარეა თხელი სენსორი,
              IP68 დაცვა და სწრაფი ციფრული capture.
            </div>
          </div>
        </motion.div>

        {screen === 'menu' && (
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.04fr_.96fr]">
              <div>
                <h2 className="text-2xl font-black text-slate-950">როგორ ითამაშო</h2>
                <div className="mt-4 space-y-3 text-sm font-bold leading-7 text-slate-600">
                  <p>1. გადაადგილე HyperLight, სანამ beam მონიშნულ კბილის უბანზე არ დაჯდება.</p>
                  <p>2. mouse wheel-ით ან ღილაკებით შეასწორე კუთხე.</p>
                  <p>3. შემთხვევის მიხედვით აირჩიე NanoPix 1 ან NanoPix 2.</p>
                  <p>4. დაამთხვიე exposure და დააჭირე capture-ს. ოთხი სწორი კადრი სესიას იგებს.</p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {XRAY_CASES.map((item, index) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">ქეისი {index + 1}</div>
                      <div className="mt-2 text-lg font-black text-slate-950">{item.title}</div>
                      <div className="mt-2 text-xs font-bold leading-6 text-slate-600">{item.description}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">NanoPix {item.sensorSize}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">{formatExposure(item.targetExposure)}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">{item.targetAngle} გრადუსი</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5">
                <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">პროდუქტის მინიშნება</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">კლინიკური შპარგალკა</h3>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-950 text-cyan-300">
                      <Radiation size={28} />
                    </div>
                  </div>
                  <div className="mt-4 space-y-4 text-sm font-bold leading-7 text-slate-600">
                    <p>HyperLight: პორტატული რენტგენი one-hand მუშაობით და კუთხის კონტროლის იდეით დაახლოებით +/-20 გრადუსში.</p>
                    <p>NanoPix: 2 ზომის სენსორი, 4.4 მმ თხელი პროფილი, IP68 დაცვა და 25 lp/mm თეორიული resolution.</p>
                    <p>1-2 ქეისი უკეთ ჯდება NanoPix 2-ზე. 3-4 ქეისში NanoPix 1 უფრო კომპაქტურ პოზიციას ითხოვს.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetGame}
                  className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-950 transition hover:bg-cyan-300"
                >
                  <Play size={16} />
                  სესიის დაწყება
                </button>
              </div>
            </div>
          </div>
        )}

        {(screen === 'playing' || screen === 'win' || screen === 'gameover') && (
          <div className="grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
            <div className="rounded-[30px] border border-white/70 bg-white/90 p-3 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div
                ref={boardRef}
                className={`relative mx-auto h-[520px] w-full max-w-[420px] touch-none overflow-hidden rounded-[30px] border border-emerald-200 bg-[linear-gradient(180deg,#dff7ff_0%,#f8fffd_45%,#ecfff6_100%)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={(event) => {
                  setDragging(true)
                  moveBeam(event.clientX, event.clientY)
                }}
                onMouseMove={(event) => dragging && moveBeam(event.clientX, event.clientY)}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onTouchStart={(event) => {
                  const touch = event.touches[0]
                  setDragging(true)
                  if (touch) moveBeam(touch.clientX, touch.clientY)
                }}
                onTouchMove={(event) => {
                  const touch = event.touches[0]
                  if (touch) moveBeam(touch.clientX, touch.clientY)
                }}
                onTouchEnd={stopDragging}
                onWheel={(event) => {
                  event.preventDefault()
                  if (screen !== 'playing') return
                  setBeamAngle((value) => clamp(value + (event.deltaY > 0 ? 3 : -3), MIN_ANGLE, MAX_ANGLE))
                }}
              >
                <div className="absolute inset-x-6 top-4 rounded-full bg-white/92 px-4 py-2 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-emerald-600">
                    HyperLight / NanoPix გადაღების ოთახი
                  </p>
                </div>

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(34,211,238,0.18),transparent_18%),radial-gradient(circle_at_16%_72%,rgba(16,185,129,0.14),transparent_22%)]" />

                <svg viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="beamFill" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(34,211,238,0.24)" />
                      <stop offset="75%" stopColor="rgba(34,211,238,0.08)" />
                      <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                    </linearGradient>
                    <linearGradient id="faceTone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5d0bf" />
                      <stop offset="100%" stopColor="#ebb496" />
                    </linearGradient>
                    <linearGradient id="mouthShade" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4b1123" />
                      <stop offset="100%" stopColor="#2a0b16" />
                    </linearGradient>
                    <linearGradient id="toothTone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#edf7ff" />
                    </linearGradient>
                  </defs>

                  <ellipse cx="172" cy="255" rx="154" ry="182" fill="url(#faceTone)" opacity="0.95" />
                  <path d="M70 167c40-24 82-38 126-38 54 0 100 20 131 56-12 10-21 22-27 38-11 29-34 53-69 71-38 20-79 26-123 15-27-7-49-22-66-44-15-19-23-41-25-65 5-13 16-25 33-33 7 0 13 0 20 0Z" fill="#f3c1a4" opacity="0.52" />
                  <path d="M98 188c32-17 67-25 106-25 43 0 78 11 104 32 10 8 16 20 19 36-5 15-13 26-25 36-25 20-58 31-99 33-51 3-91-7-121-31-13-10-22-23-27-38 2-17 10-31 24-43 5 0 12 0 19 0Z" fill="url(#mouthShade)" />
                  <path d="M118 194c20 9 50 13 87 13 35 0 67-4 94-13" fill="none" stroke="#fbd5de" strokeWidth="8" strokeLinecap="round" opacity="0.44" />
                  <path d="M118 290c20-9 50-13 87-13 35 0 67 4 94 13" fill="none" stroke="#f4a9ba" strokeWidth="8" strokeLinecap="round" opacity="0.44" />

                  {[116, 144, 171, 198, 226, 254, 282].map((x, index) => (
                    <g key={`upper-${x}`} transform={`translate(${x} ${210 + (index % 2 === 0 ? -2 : 2)})`}>
                      <ellipse cx="0" cy="0" rx="11" ry="23" fill="url(#toothTone)" />
                    </g>
                  ))}

                  {[116, 145, 173, 201, 229, 257, 285].map((x, index) => (
                    <g key={`lower-${x}`} transform={`translate(${x} ${274 + (index % 2 === 0 ? 2 : -2)})`}>
                      <ellipse cx="0" cy="0" rx="11" ry="23" fill="url(#toothTone)" />
                    </g>
                  ))}

                  {shiftedCase && (
                    <>
                      <g transform={`translate(126 ${shiftedCase.sensorY}) rotate(${shiftedCase.sensorTilt})`}>
                        <rect
                          x={shiftedCase.sensorSize === 1 ? -11 : -14}
                          y={shiftedCase.sensorSize === 1 ? -20 : -24}
                          width={shiftedCase.sensorSize === 1 ? 22 : 28}
                          height={shiftedCase.sensorSize === 1 ? 40 : 48}
                          rx="7"
                          fill="#101828"
                          stroke={sensorSize === shiftedCase.sensorSize ? '#22d3ee' : '#334155'}
                          strokeWidth="2"
                        />
                        <rect
                          x={shiftedCase.sensorSize === 1 ? -5 : -6}
                          y={shiftedCase.sensorSize === 1 ? 20 : 24}
                          width={shiftedCase.sensorSize === 1 ? 10 : 12}
                          height="54"
                          rx="5"
                          fill="#0f172a"
                        />
                      </g>

                      <g transform={`translate(${shiftedCase.targetX} ${shiftedCase.targetY})`}>
                        <circle r="24" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.28)" strokeWidth="2" strokeDasharray="4 5" />
                        <circle r="4" fill="rgba(16,185,129,0.95)" />
                      </g>
                    </>
                  )}

                  <polygon points={beamShape} fill="url(#beamFill)" />
                  <circle cx={impact.x} cy={impact.y} r={glowActive ? 9 : 6} fill={glowActive ? 'rgba(34,211,238,0.85)' : 'rgba(148,163,184,0.75)'} />
                  <circle cx={beamTip.x} cy={beamTip.y} r="7" fill="rgba(15,23,42,0.88)" />
                </svg>

                <div
                  className={`absolute z-20 transition ${glowActive ? 'drop-shadow-[0_0_26px_rgba(34,211,238,0.55)]' : 'drop-shadow-[0_10px_22px_rgba(15,23,42,0.18)]'}`}
                  style={{
                    left: deviceFrame.left,
                    top: deviceFrame.top,
                    width: DEVICE_WIDTH,
                    height: DEVICE_HEIGHT,
                    transform: `rotate(${beamAngle}deg)`,
                    transformOrigin: `${DEVICE_TIP.x}px ${DEVICE_TIP.y}px`,
                  }}
                >
                  <svg viewBox={`0 0 ${DEVICE_WIDTH} ${DEVICE_HEIGHT}`} className="h-full w-full">
                    <defs>
                      <linearGradient id="hyperBody" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e9f1f7" />
                      </linearGradient>
                      <linearGradient id="hyperDark" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    <path d="M24 46h104c12 0 22 10 22 22s-10 22-22 22H24c-11 0-20-9-20-20V66c0-11 9-20 20-20Z" fill="url(#hyperBody)" />
                    <rect x="78" y="52" width="42" height="32" rx="10" fill="url(#hyperDark)" />
                    <rect x="86" y="57" width="26" height="14" rx="4" fill="#60a5fa" opacity="0.85" />
                    <path d="M128 36h46c9 0 18 8 18 18v28c0 10-9 18-18 18h-46l12-64Z" fill="url(#hyperBody)" />
                    <path d="M142 100h20l31 28c6 6 7 16 1 22-6 6-16 6-22 0l-26-23-4-27Z" fill="url(#hyperBody)" />
                    <path d="M157 122h21v22h-21c-9 0-17-8-17-17s8-5 17-5Z" fill="#f97316" opacity="0.9" />
                    <circle cx="21" cy="68" r="12" fill="#111827" />
                    <circle cx="21" cy="68" r="4" fill="#ef4444" opacity="0.85" />
                    <text x="99" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="7" fontWeight="700">63kV</text>
                    <text x="99" y="86" textAnchor="middle" fill="#cbd5e1" fontSize="6">HyperLight</text>
                  </svg>
                </div>

                {flashTone !== 'idle' && (
                  <div
                    className={`pointer-events-none absolute inset-0 ${flashTone === 'good' ? 'bg-cyan-300/14' : 'bg-rose-300/16'}`}
                  />
                )}

                {(screen === 'win' || screen === 'gameover') && (
                  <div className={`absolute inset-0 grid place-items-center backdrop-blur-sm ${screen === 'win' ? 'bg-white/82' : 'bg-slate-950/42'}`}>
                    <div className="mx-3 rounded-3xl bg-white p-6 text-center shadow-xl">
                      <div className="text-2xl font-black text-slate-950">
                        {screen === 'win' ? 'სესია დასრულდა' : 'Retake ლიმიტი ამოიწურა'}
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-600">
                        {screen === 'win'
                          ? 'ყველა ქეისი დიაგნოსტიკური კადრით დაიხურა.'
                          : 'შემდეგ პაციენტამდე ოთახს reset სჭირდება.'}
                      </div>
                      <button
                        type="button"
                        onClick={resetGame}
                        className="mt-5 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white"
                      >
                        თავიდან დაწყება
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">მიმდინარე ქეისი</div>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">{currentCase?.title}</h2>
                  </div>
                  <div className="rounded-[18px] bg-emerald-100 p-3 text-emerald-600">
                    <ScanLine size={24} />
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold leading-6 text-slate-600">{currentCase?.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">ზონა</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{currentCase?.zone}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">სამიზნე</div>
                    <div className="mt-2 text-lg font-black text-slate-950">
                      NanoPix {currentCase?.sensorSize} / {formatExposure(currentCase?.targetExposure ?? 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <h2 className="mb-4 text-xl font-black text-slate-950">კონტროლი</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBeamAngle((value) => clamp(value - 4, MIN_ANGLE, MAX_ANGLE))}
                    disabled={screen !== 'playing'}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                  >
                    კუთხე -
                  </button>
                  <button
                    type="button"
                    onClick={() => setBeamAngle((value) => clamp(value + 4, MIN_ANGLE, MAX_ANGLE))}
                    disabled={screen !== 'playing'}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                  >
                    კუთხე +
                  </button>
                  <button
                    type="button"
                    onClick={() => setExposure((value) => stepExposure(value, -1))}
                    disabled={screen !== 'playing'}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-50"
                  >
                    ექსპოჟერი -
                  </button>
                  <button
                    type="button"
                    onClick={() => setExposure((value) => stepExposure(value, 1))}
                    disabled={screen !== 'playing'}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-50"
                  >
                    ექსპოჟერი +
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSensorSize(1)}
                    disabled={screen !== 'playing'}
                    className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.16em] disabled:opacity-50 ${sensorSize === 1 ? 'bg-cyan-400 text-slate-950' : 'border border-slate-300 bg-white text-slate-950'}`}
                  >
                    NanoPix 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSensorSize(2)}
                    disabled={screen !== 'playing'}
                    className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.16em] disabled:opacity-50 ${sensorSize === 2 ? 'bg-cyan-400 text-slate-950' : 'border border-slate-300 bg-white text-slate-950'}`}
                  >
                    NanoPix 2
                  </button>
                </div>

                <div className="mt-4">
                  <ExposureBars value={exposure} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={captureImage}
                    disabled={screen !== 'playing'}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-50"
                  >
                    <Camera size={16} />
                    გადაღება
                  </button>
                  <button
                    type="button"
                    onClick={resetGame}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950"
                  >
                    <RotateCcw size={16} />
                    თავიდან
                  </button>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <h2 className="mb-4 text-xl font-black text-slate-950">სტატუსი</h2>
                <div className="space-y-4">
                  <ProgressRow label="დაფარვა" value={coverage} tone="bg-gradient-to-r from-cyan-500 to-blue-500" />
                  <ProgressRow label="დრო" value={(timeLeft / 95) * 100} tone="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  <ProgressRow label="ბატარეა" value={battery} tone="bg-gradient-to-r from-amber-400 to-orange-500" />
                  <ProgressRow label="პაციენტის კომფორტი" value={comfort} tone="bg-gradient-to-r from-emerald-500 to-cyan-500" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ქულა</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{score}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">გადაღებები</div>
                    <div className="mt-2 text-2xl font-black text-rose-600">{retakes}/6</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">კუთხე</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{beamAngle} გრადუსი</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ექსპოჟერი</div>
                    <div className="mt-2 text-2xl font-black text-cyan-600">{formatExposure(exposure)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">კადრის შეფასება</h2>
                  <BatteryFull className="text-cyan-500" size={22} />
                </div>

                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 p-4">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)]">
                    <svg viewBox="0 0 320 240" className="h-full w-full">
                      <rect x="0" y="0" width="320" height="240" fill="transparent" />
                      <g opacity={lastCapture ? clamp(lastCapture.quality / 100, 0.35, 0.98) : 0.28}>
                        <path d="M118 38c14 0 25 8 28 21 6 24-6 34-9 53-5 30 9 46 9 71 0 18-13 31-30 31-18 0-31-13-31-31 0-26 15-43 12-74-2-18-15-27-10-50 3-13 15-21 31-21Z" fill="#f8fafc" />
                        <path d="M202 38c14 0 25 8 28 21 6 24-6 34-9 53-5 30 9 46 9 71 0 18-13 31-30 31-18 0-31-13-31-31 0-26 15-43 12-74-2-18-15-27-10-50 3-13 15-21 31-21Z" fill="#f8fafc" />
                        <path d="M103 102h128" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" opacity="0.85" />
                        <path d="M103 132h128" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
                      </g>
                      <rect
                        x="18"
                        y="18"
                        width="284"
                        height="204"
                        rx="16"
                        fill="none"
                        stroke={lastCapture?.accepted ? 'rgba(34,211,238,0.95)' : 'rgba(248,113,113,0.88)'}
                        strokeDasharray="5 6"
                        opacity={lastCapture ? 0.9 : 0.16}
                      />
                    </svg>
                    {!lastCapture && (
                      <div className="absolute inset-0 grid place-items-center text-center">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">კადრი ჯერ არ არის</div>
                          <p className="mt-3 text-sm font-bold text-slate-300">ქეისი გადაიღე, რომ NanoPix-ის preview გამოჩნდეს.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 text-sm font-bold leading-7 text-slate-700">
                  {message}
                </div>

                {lastCapture && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">ხარისხი</div>
                      <div className={`mt-2 text-2xl font-black ${lastCapture.accepted ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {lastCapture.quality}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">დარტყმის ცდომილება</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{lastCapture.impactDistance.toFixed(1)} px</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">კუთხის ცდომილება</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{lastCapture.angleDiff.toFixed(1)} გრადუსი</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">ექსპოჟერის ცდომილება</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{lastCapture.exposureDiff.toFixed(2)} s</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">ოფიციალური ინსპირაცია</h2>
                  <ShieldCheck className="text-emerald-500" size={22} />
                </div>
                <div className="space-y-3 text-sm font-bold leading-6 text-slate-600">
                  <p>HyperLight: კომპაქტური პორტატული რენტგენი, one-hand მუშაობა, ეკრანი და კუთხის კონტროლის კონცეფცია.</p>
                  <p>NanoPix: AED auto-exposure detection, CsI სენსორი, 25 lp/mm თეორიული resolution და 2 ზომის ვარიანტი.</p>
                  <p>ეს თამაში ამ იდეებს generic shooter-ად კი არ იყენებს, არამედ პოზიციის, სენსორის არჩევისა და exposure-ის gameplay-ად.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

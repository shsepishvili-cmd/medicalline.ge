'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Play, RotateCcw, Send, Wind } from 'lucide-react'

// =============================================================================
// Helios 700 Scan Hero – intraoral scanning simulator.
// The model is built live from captured frames; tracking is lost when moving
// too fast and is regained only on already captured data (stitching).
// Coordinates are in millimetres.
// =============================================================================

type Screen = 'menu' | 'playing' | 'report'
type Jaw = 'lower' | 'upper'
type Phase = Jaw | 'bite'
type ToothKind = 'I' | 'C' | 'P' | 'M'
type View = 'occ' | 'buc' | 'lin'
type ModeId = 'training' | 'full' | 'hard'

type Tooth = { kind: ToothKind; x: number; y: number; tx: number; ty: number; nx: number; ny: number; w: number; d: number }
type Sample = { x: number; y: number; view: View; state: 0 | 1 | 2 }
type Frame = { x: number; y: number; a: number; low: boolean }
type Arch = { jaw: Jaw; teeth: Tooth[]; gumOuter: string; gumInner: string; inner: { x: number; y: number }; depth: number }

type Sim = {
  pos: { x: number; y: number }
  prev: { x: number; y: number }
  speed: number
  hist: { t: number; x: number; y: number }[]
  scanning: boolean
  view: View
  rolling: number
  tracking: 'idle' | 'ok' | 'lost'
  regain: number
  wet: number
  drying: boolean
  frames: Record<Jaw, Frame[]>
  samples: Record<Jaw, Sample[]>
  bite: [number, number]
  phaseIndex: number
  elapsed: number
  losses: number
  aiFiltered: number
  message: string
  tone: 'info' | 'good' | 'warn' | 'bad'
}

const MODES: Record<ModeId, { title: string; desc: string; phases: Phase[]; speedLimit: number; wetRate: number; tongue: number }> = {
  training: {
    title: 'ქვედა ყბა: სწავლება',
    desc: 'მხოლოდ ქვედა თაღი. ნაკლები ნერწყვი, მშვიდი ენა.',
    phases: ['lower'],
    speedLimit: 28,
    wetRate: 0.03,
    tongue: 0.6,
  },
  full: {
    title: 'სრული სკანი და თანკბილვა',
    desc: 'ქვედა და ზედა თაღი და ბუკალური თანკბილვის რეგისტრაცია.',
    phases: ['lower', 'upper', 'bite'],
    speedLimit: 25,
    wetRate: 0.045,
    tongue: 1,
  },
  hard: {
    title: 'რთული პაციენტი',
    desc: 'ბევრი ნერწყვი, აქტიური ენა და უფრო მკაცრი ტრეკინგი.',
    phases: ['lower', 'upper', 'bite'],
    speedLimit: 20,
    wetRate: 0.08,
    tongue: 1.7,
  },
}

// Helios 700 wand image (1400 × 275 px, scan tip at the right edge, x 1399 / y 135)
const WAND_H = 22
const WAND_LEN = (WAND_H * 1400) / 275
const WAND_TIP_Y = (WAND_H * 135.5) / 275
const FRAME_W = 14
const FRAME_H = 11
const WET_LIMIT = 0.55
const DONE_COVERAGE = 0.9
const VIEW_LABEL: Record<View, string> = { occ: 'ოკლუზიური', buc: 'ბუკალური', lin: 'ლინგვალური' }
const JAW_LABEL: Record<Jaw, string> = { lower: 'ქვედა ყბა', upper: 'ზედა ყბა' }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// -----------------------------------------------------------------------------
// Arch geometry
// -----------------------------------------------------------------------------

const TOOTH_SIZES: Record<Jaw, [ToothKind, number, number][]> = {
  lower: [['I', 5.2, 6], ['I', 5.8, 6.4], ['C', 6.9, 7.6], ['P', 7, 7.6], ['P', 7.2, 8.2], ['M', 11, 10.4], ['M', 10.4, 10]],
  upper: [['I', 8.6, 7], ['I', 6.6, 6.2], ['C', 7.6, 8], ['P', 7, 9], ['P', 6.7, 9], ['M', 10.2, 11.2], ['M', 9.2, 11]],
}

function buildArch(jaw: Jaw): Arch {
  const sizes = TOOTH_SIZES[jaw]
  const ratio = jaw === 'lower' ? 1.45 : 1.3
  const need = sizes.reduce((sum, t) => sum + t[1], 0) * 1.02
  const N = 600
  const table: number[] = [0]
  for (let i = 1; i <= N; i++) {
    const u0 = (i - 1) / N
    const u1 = i / N
    table.push(table[i - 1] + Math.hypot(u1 - u0, ratio * (u1 * u1 - u0 * u0)))
  }
  const A = need / table[N]
  const B = A * ratio
  const uAt = (len: number) => {
    const target = len / A
    let lo = 0
    let hi = N
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (table[mid] < target) lo = mid
      else hi = mid
    }
    return hi / N
  }
  const depth = B
  const inner = { x: 0, y: depth * 0.72 }
  const frameAt = (u: number, side: 1 | -1) => {
    const x = side * A * u
    const y = B * u * u
    let tx = side * A
    let ty = 2 * B * u
    const l = Math.hypot(tx, ty)
    tx /= l
    ty /= l
    let nx = ty
    let ny = -tx
    if (nx * (x - inner.x) + ny * (y - inner.y) < 0) {
      nx = -nx
      ny = -ny
    }
    return { x, y, tx, ty, nx, ny }
  }

  const teeth: Tooth[] = []
  for (const side of [1, -1] as const) {
    let acc = 0
    for (const [kind, w, d] of sizes) {
      const f = frameAt(uAt(acc + w / 2), side)
      teeth.push({ kind, w, d, ...f })
      acc += w
    }
  }

  const outer: string[] = []
  const innerPts: string[] = []
  const total = need
  for (let s = -total - 3; s <= total + 3; s += 1.5) {
    const side = s < 0 ? -1 : 1
    const f = frameAt(uAt(Math.min(Math.abs(s), total)), side as 1 | -1)
    const k = clamp(Math.abs(s) / total, 0, 1)
    const half = 4.6 + k * 2.4
    outer.push(`${(f.x + f.nx * (half + 3.2)).toFixed(2)} ${(f.y + f.ny * (half + 3.2)).toFixed(2)}`)
    innerPts.unshift(`${(f.x - f.nx * (half + 3.5)).toFixed(2)} ${(f.y - f.ny * (half + 3.5)).toFixed(2)}`)
  }
  const gumOuter = `M ${outer.join(' L ')} L ${innerPts.join(' L ')} Z`
  const gumInner = `M ${innerPts.join(' L ')} Z`
  return { jaw, teeth, gumOuter, gumInner, inner, depth }
}

function toothOutline(t: Tooth) {
  const n = t.kind === 'M' ? 3.2 : t.kind === 'P' ? 2.4 : t.kind === 'C' ? 2.1 : 2.6
  const pts: string[] = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    let u = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * t.w * 0.5
    let v = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * t.d * 0.5
    if (t.kind === 'M') v *= 1 + 0.05 * Math.cos(a * 4)
    if (t.kind === 'I') v *= s > 0 ? 1 : 0.92
    u *= 0.96
    pts.push(`${u.toFixed(2)} ${v.toFixed(2)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

function toothMatrix(t: Tooth) {
  return `matrix(${t.tx} ${t.ty} ${t.nx} ${t.ny} ${t.x} ${t.y})`
}

function toLocal(t: Tooth, u: number, v: number) {
  return { x: t.x + t.tx * u + t.nx * v, y: t.y + t.ty * u + t.ny * v }
}

function buildSamples(arch: Arch): Sample[] {
  const out: Sample[] = []
  for (const t of arch.teeth) {
    const occ = t.kind === 'M' ? [-0.28, 0, 0.28] : t.kind === 'P' ? [-0.2, 0.2] : [0]
    for (const k of occ) out.push({ ...toLocal(t, t.w * k, 0), view: 'occ', state: 0 })
    const sides = t.kind === 'M' ? [-0.25, 0.25] : [0]
    for (const k of sides) {
      out.push({ ...toLocal(t, t.w * k, t.d * 0.5), view: 'buc', state: 0 })
      out.push({ ...toLocal(t, t.w * k, -t.d * 0.5), view: 'lin', state: 0 })
    }
  }
  return out
}

function biteTargets(arch: Arch) {
  // Buccal surfaces between the second premolar and the first molar, both sides
  return [arch.teeth[4], arch.teeth[11]].map((t) => toLocal(t, t.w * 0.55, t.d * 0.55))
}

// Soft-tissue intrusion (tongue on the lingual side of the lower arch)
function tongueLobes(arch: Arch, time: number, amp: number) {
  if (arch.jaw !== 'lower') return []
  return [1, -1].map((side, i) => {
    const t = arch.teeth[side === 1 ? 4 : 11]
    const push = Math.max(0, Math.sin(time * 0.7 + i * 2.4)) * 3.2 * amp
    const base = toLocal(t, 0, -t.d * 0.5 - 6 + push)
    return { x: base.x, y: base.y, r: 5.5 }
  })
}

function insideFrame(f: { x: number; y: number; a: number }, px: number, py: number, pad = 0.8) {
  const dx = px - f.x
  const dy = py - f.y
  const c = Math.cos(-f.a)
  const s = Math.sin(-f.a)
  const lx = dx * c - dy * s
  const ly = dx * s + dy * c
  return Math.abs(lx) <= FRAME_W / 2 + pad && Math.abs(ly) <= FRAME_H / 2 + pad
}

function nearestTooth(arch: Arch, x: number, y: number) {
  let best = arch.teeth[0]
  let bd = Infinity
  for (const t of arch.teeth) {
    const d = (t.x - x) ** 2 + (t.y - y) ** 2
    if (d < bd) {
      bd = d
      best = t
    }
  }
  return { tooth: best, dist: Math.sqrt(bd) }
}

// -----------------------------------------------------------------------------
// True-colour arch rendering (used for the live camera and the scanned model)
// -----------------------------------------------------------------------------

function ToothAnatomy({ t }: { t: Tooth }) {
  const w = t.w
  const d = t.d
  const groove = { stroke: '#8a6f4e', strokeWidth: 0.32, fill: 'none', strokeLinecap: 'round' as const, opacity: 0.75 }
  return (
    <g transform={toothMatrix(t)}>
      <path d={toothOutline(t)} fill="url(#sc-enamel)" stroke="#c9b08a" strokeWidth="0.25" />
      {t.kind === 'M' && (
        <>
          {[[-0.24, 0.22], [0.24, 0.22], [-0.22, -0.22], [0.22, -0.22], [0.36, 0.05]].map(([u, v], i) => (
            <ellipse key={i} cx={w * u} cy={d * v} rx={w * 0.13} ry={d * 0.13} fill="#fffaf0" opacity="0.75" />
          ))}
          <path d={`M ${-w * 0.38} ${d * 0.02} Q ${-w * 0.1} ${d * 0.1} 0 0 T ${w * 0.38} ${-d * 0.02}`} {...groove} />
          <path d={`M ${-w * 0.02} 0 L ${w * 0.04} ${d * 0.4}`} {...groove} />
          <path d={`M ${w * 0.02} 0 L ${-w * 0.03} ${-d * 0.38}`} {...groove} />
          <path d={`M ${w * 0.22} ${d * 0.02} L ${w * 0.3} ${d * 0.32}`} {...groove} />
        </>
      )}
      {t.kind === 'P' && (
        <>
          <ellipse cx={0} cy={d * 0.2} rx={w * 0.22} ry={d * 0.15} fill="#fffaf0" opacity="0.8" />
          <ellipse cx={0} cy={-d * 0.2} rx={w * 0.18} ry={d * 0.12} fill="#fffaf0" opacity="0.65" />
          <path d={`M ${-w * 0.32} 0 Q 0 ${d * 0.06} ${w * 0.32} 0`} {...groove} />
        </>
      )}
      {t.kind === 'C' && (
        <>
          <ellipse cx={0} cy={d * 0.12} rx={w * 0.16} ry={d * 0.16} fill="#fffaf0" opacity="0.85" />
          <path d={`M ${-w * 0.38} ${-d * 0.05} L 0 ${d * 0.12} L ${w * 0.38} ${-d * 0.05}`} {...groove} opacity="0.4" />
        </>
      )}
      {t.kind === 'I' && <path d={`M ${-w * 0.42} ${d * 0.12} L ${w * 0.42} ${d * 0.12}`} stroke="#fffaf0" strokeWidth={d * 0.16} strokeLinecap="round" opacity="0.8" />}
    </g>
  )
}

function ArchArt({ arch, lobes }: { arch: Arch; lobes: { x: number; y: number; r: number }[] }) {
  return (
    <g>
      {arch.jaw === 'lower' ? (
        <ellipse cx={arch.inner.x} cy={arch.inner.y + 2} rx={arch.depth * 0.48} ry={arch.depth * 0.62} fill="url(#sc-tongue)" />
      ) : (
        <g>
          <ellipse cx={arch.inner.x} cy={arch.inner.y - 2} rx={arch.depth * 0.6} ry={arch.depth * 0.68} fill="#d9918c" />
          {[-1, 1].flatMap((side) =>
            [0, 1, 2].map((i) => (
              <path
                key={`${side}${i}`}
                d={`M ${side * 2} ${10 + i * 5} q ${side * 5} -2 ${side * 9} 2`}
                stroke="#c6716d"
                strokeWidth="1.1"
                fill="none"
                strokeLinecap="round"
              />
            )),
          )}
          <line x1="0" y1="8" x2="0" y2={arch.depth * 0.9} stroke="#c6716d" strokeWidth="0.6" />
        </g>
      )}
      <path d={arch.gumOuter} fill="url(#sc-gum)" fillRule="evenodd" />
      {arch.teeth.map((t, i) => (
        <ToothAnatomy key={i} t={t} />
      ))}
      {lobes.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.r} fill="url(#sc-tongue)" />
      ))}
    </g>
  )
}

function SharedDefs() {
  return (
    <defs>
      <radialGradient id="sc-enamel" cx="45%" cy="40%" r="70%">
        <stop offset="0%" stopColor="#fbf4e4" />
        <stop offset="70%" stopColor="#ecdcbc" />
        <stop offset="100%" stopColor="#d4bd93" />
      </radialGradient>
      <linearGradient id="sc-gum" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e7a2a0" />
        <stop offset="100%" stopColor="#d4827f" />
      </linearGradient>
      <radialGradient id="sc-tongue" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#e2898a" />
        <stop offset="100%" stopColor="#b85a5f" />
      </radialGradient>
      <pattern id="sc-speckle" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
        <rect width="1.6" height="1.6" fill="#f59e0b" opacity="0.18" />
        <circle cx="0.5" cy="0.5" r="0.35" fill="#f59e0b" opacity="0.8" />
      </pattern>
    </defs>
  )
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

function newSim(arches: Record<Jaw, Arch>): Sim {
  return {
    pos: { x: arches.lower.teeth[6].x, y: arches.lower.teeth[6].y },
    prev: { x: arches.lower.teeth[6].x, y: arches.lower.teeth[6].y },
    speed: 0,
    hist: [],
    scanning: false,
    view: 'occ',
    rolling: 0,
    tracking: 'idle',
    regain: 0,
    wet: 0.15,
    drying: false,
    frames: { lower: [], upper: [] },
    samples: { lower: buildSamples(arches.lower), upper: buildSamples(arches.upper) },
    bite: [0, 0],
    phaseIndex: 0,
    elapsed: 0,
    losses: 0,
    aiFiltered: 0,
    message: 'დაიწყე მარჯვენა ბოლო მოლარის ოკლუზიური ზედაპირიდან. სკანირება: მაუსის დაჭერა ან Space.',
    tone: 'info',
  }
}

function coverageOf(samples: Sample[], view?: View) {
  const list = view ? samples.filter((s) => s.view === view) : samples
  const captured = list.filter((s) => s.state > 0).length
  const good = list.filter((s) => s.state === 2).length
  return { captured: captured / list.length, good: good / list.length }
}

export default function ScannerRushClient() {
  const arches = useMemo(() => ({ lower: buildArch('lower'), upper: buildArch('upper') }), [])
  const [screen, setScreen] = useState<Screen>('menu')
  const [modeId, setModeId] = useState<ModeId>('full')
  const [best, setBest] = useState(0)
  const [result, setResult] = useState<{ score: number; time: number; coverage: number; good: number; losses: number; ai: number } | null>(null)
  const [, setTick] = useState(0)
  const simRef = useRef<Sim>(newSim(arches))
  const svgRef = useRef<SVGSVGElement>(null)
  const mode = MODES[modeId]
  const modeRef = useRef(mode)
  modeRef.current = mode
  const sim = simRef.current
  const phase: Phase = mode.phases[Math.min(sim.phaseIndex, mode.phases.length - 1)]
  const jaw: Jaw = phase === 'upper' ? 'upper' : 'lower'
  const arch = arches[jaw]

  useEffect(() => {
    try {
      setBest(Number(window.localStorage.getItem('helios-scan-sim-best')) || 0)
    } catch {}
  }, [])

  const start = (id: ModeId) => {
    setModeId(id)
    simRef.current = newSim(arches)
    setResult(null)
    setScreen('playing')
  }

  const setView = useCallback((v: View) => {
    const s = simRef.current
    if (s.view === v) return
    s.view = v
    s.rolling = 0.35
  }, [])

  // ---------------------------------------------------------------------------
  // Simulation loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (screen !== 'playing') return
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = simRef.current
      const m = modeRef.current
      const ph = m.phases[s.phaseIndex]
      const j: Jaw = ph === 'upper' ? 'upper' : 'lower'
      const a = arches[j]

      s.elapsed += dt
      // Speed over a ~0.3 s window, so pointer-event bursts do not read as jerks
      s.hist.push({ t: s.elapsed, x: s.pos.x, y: s.pos.y })
      while (s.hist.length > 2 && s.elapsed - s.hist[0].t > 0.3) s.hist.shift()
      const h0 = s.hist[0]
      const span = s.elapsed - h0.t
      s.speed = span > 0.08 ? Math.hypot(s.pos.x - h0.x, s.pos.y - h0.y) / span : 0
      s.prev = { ...s.pos }
      s.rolling = Math.max(0, s.rolling - dt)
      s.wet = clamp(s.wet + (s.drying ? -0.9 : m.wetRate) * dt, 0, 1)

      const { tooth, dist } = nearestTooth(a, s.pos.x, s.pos.y)
      const angle = Math.atan2(tooth.ty, tooth.tx)
      const frame = { x: s.pos.x, y: s.pos.y, a: angle }
      const frames = s.frames[j]
      const lobes = tongueLobes(a, s.elapsed, m.tongue)

      if (!s.scanning) {
        if (s.tracking === 'ok') s.tracking = 'idle'
      } else {
        if (s.tracking === 'idle') {
          s.speed = 0
          s.hist = [{ t: s.elapsed, x: s.pos.x, y: s.pos.y }]
          const onData = ph === 'bite' || frames.length === 0 || frames.some((f) => Math.hypot(f.x - s.pos.x, f.y - s.pos.y) < 6)
          s.tracking = onData ? 'ok' : 'lost'
          if (!onData) {
            s.message = 'სკანირება უნდა გაგრძელდეს უკვე დასკანერებული უბნიდან, რომ მოდელი შეიკრას.'
            s.tone = 'warn'
          }
        }

        if (s.tracking === 'ok' && s.speed > m.speedLimit && ph !== 'bite') {
          s.tracking = 'lost'
          s.losses += 1
          s.regain = 0
          s.message = 'ტრეკინგი დაიკარგა: მოძრაობა ზედმეტად სწრაფია. დაბრუნდი დასკანერებულ უბანზე და იმოძრავე ნელა.'
          s.tone = 'bad'
        } else if (s.tracking === 'lost') {
          const near = frames.length === 0 || frames.some((f) => Math.hypot(f.x - s.pos.x, f.y - s.pos.y) < 5)
          if (near && s.speed < m.speedLimit * 0.6) {
            s.regain += dt
            if (s.regain > 0.35) {
              s.tracking = 'ok'
              s.message = 'ტრეკინგი აღდგა. გააგრძელე თანაბარი სიჩქარით.'
              s.tone = 'good'
            }
          } else s.regain = 0
        }

        if (s.tracking === 'ok' && s.rolling === 0 && dist < 14) {
          if (ph === 'bite') {
            const targets = biteTargets(arches.lower)
            targets.forEach((tp, i) => {
              if (s.view === 'buc' && insideFrame(frame, tp.x, tp.y, 0) && s.speed < 12) {
                s.bite[i] = clamp(s.bite[i] + dt / 1.3, 0, 1)
                s.message = s.bite[i] >= 1 ? 'თანკბილვის ეს მხარე დარეგისტრირდა.' : 'სტაბილურად გააჩერე: თანკბილვის რეგისტრაცია მიმდინარეობს…'
                s.tone = s.bite[i] >= 1 ? 'good' : 'info'
              }
            })
            if (s.view !== 'buc') {
              s.message = 'თანკბილვა მხოლოდ ბუკალური ხედით რეგისტრირდება.'
              s.tone = 'warn'
            }
          } else {
            const low = s.wet > WET_LIMIT
            const lastFrame = frames[frames.length - 1]
            if (!lastFrame || Math.hypot(lastFrame.x - frame.x, lastFrame.y - frame.y) > 1.8) frames.push({ ...frame, low })
            let blocked = false
            for (const smp of s.samples[j]) {
              if (smp.view !== s.view || smp.state === 2) continue
              if (!insideFrame(frame, smp.x, smp.y)) continue
              if (smp.view === 'lin' && lobes.some((l) => Math.hypot(l.x - smp.x, l.y - smp.y) < l.r + 1)) {
                blocked = true
                continue
              }
              smp.state = low ? Math.max(smp.state, 1) as 1 | 2 : 2
            }
            if (blocked) {
              s.aiFiltered += dt
              s.message = 'ენა ხედშია. Helios AI ფილტრი რბილ ქსოვილს აშორებს, მაგრამ ზედაპირი არ ჩანს. დაელოდე ან გადაინაცვლე.'
              s.tone = 'warn'
            } else if (low) {
              s.message = 'ზედაპირი სველია: მონაცემი დაბალი ხარისხისაა. გააშრე ჰაერით (A) და გადაუარე ხელახლა.'
              s.tone = 'warn'
            } else if (s.tone !== 'good' || s.message.startsWith('ტრეკინგი')) {
              s.message = `სკანირება: ${VIEW_LABEL[s.view]} ზედაპირი · ${JAW_LABEL[j]}`
              s.tone = 'info'
            }
          }
        }
      }

      setTick((t) => (t + 1) % 1_000_000)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [screen, arches])

  // Keyboard
  useEffect(() => {
    if (screen !== 'playing') return
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const s = simRef.current
      if (k === ' ') {
        e.preventDefault()
        s.scanning = true
      }
      if (k === 'a') s.drying = true
      if (k === '1') setView('occ')
      if (k === '2') setView('lin')
      if (k === '3') setView('buc')
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === ' ') simRef.current.scanning = false
      if (k === 'a') simRef.current.drying = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [screen, setView])

  const toMm = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: clamp(p.x, -44, 44), y: clamp(p.y, -14, 60) }
  }

  // ---------------------------------------------------------------------------
  // Phase handling and report
  // ---------------------------------------------------------------------------
  const cov = phase === 'bite' ? null : coverageOf(sim.samples[jaw])
  const phaseDone = phase === 'bite' ? sim.bite[0] >= 1 && sim.bite[1] >= 1 : (cov?.captured ?? 0) >= DONE_COVERAGE
  const isLastPhase = sim.phaseIndex >= mode.phases.length - 1

  const finish = () => {
    const s = simRef.current
    const jaws = mode.phases.filter((p): p is Jaw => p !== 'bite')
    const all = jaws.flatMap((jw) => s.samples[jw])
    const c = coverageOf(all)
    const targetTime = jaws.length * 45 + (mode.phases.includes('bite') ? 15 : 0)
    const timeBonus = clamp(Math.round((targetTime - s.elapsed) * 4), -150, 200)
    const score = clamp(Math.round(c.captured * 500 + c.good * 300 + timeBonus - s.losses * 15), 0, 1000)
    setResult({ score, time: s.elapsed, coverage: c.captured, good: c.good, losses: s.losses, ai: s.aiFiltered })
    setBest((b) => {
      const next = Math.max(b, score)
      try {
        window.localStorage.setItem('helios-scan-sim-best', String(next))
      } catch {}
      return next
    })
    setScreen('report')
  }

  const nextPhase = () => {
    const s = simRef.current
    if (isLastPhase) return finish()
    s.phaseIndex += 1
    s.tracking = 'idle'
    s.scanning = false
    const nextJaw: Jaw = mode.phases[s.phaseIndex] === 'upper' ? 'upper' : 'lower'
    const t = arches[nextJaw].teeth[6]
    s.pos = { x: t.x, y: t.y }
    s.prev = { ...s.pos }
    if (mode.phases[s.phaseIndex] === 'bite') {
      setView('buc')
      s.message = 'პაციენტმა კბილები დახუროს. ბუკალური ხედით დაარეგისტრირე თანკბილვა ორივე მხარეს, პრემოლარ-მოლარის მიდამოში.'
    } else {
      setView('occ')
      s.message = 'ზედა ყბა: ისევ ბოლო მოლარიდან დაიწყე, ჯერ ოკლუზიური ზედაპირი.'
    }
    s.tone = 'info'
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const nearest = nearestTooth(arch, sim.pos.x, sim.pos.y)
  const frameAngle = Math.atan2(nearest.tooth.ty, nearest.tooth.tx)
  const frameDeg = (frameAngle * 180) / Math.PI
  const lobes = tongueLobes(arch, sim.elapsed, mode.tongue)
  const frames = sim.frames[jaw]
  const frameColor =
    sim.tracking === 'lost' ? '#f87171' : sim.rolling > 0 ? '#94a3b8' : sim.scanning && sim.wet > WET_LIMIT ? '#fbbf24' : sim.scanning ? '#4ade80' : '#7dd3fc'
  const facing = sim.view === 'buc' ? 1 : sim.view === 'lin' ? -1 : 0
  // The wand enters from the front corner of the mouth on the side being scanned
  const entry = { x: (sim.pos.x >= 0 ? 1 : -1) * 24, y: -42 }
  const wandDeg = (Math.atan2(-(entry.y - sim.pos.y), -(entry.x - sim.pos.x)) * 180) / Math.PI
  const toneClass = {
    info: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    warn: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    bad: 'border-rose-400/40 bg-rose-500/15 text-rose-100',
  }[sim.tone]
  const speedPct = clamp((sim.speed / mode.speedLimit) * 100, 0, 130)
  const occ = coverageOf(sim.samples[jaw], 'occ')
  const lin = coverageOf(sim.samples[jaw], 'lin')
  const buc = coverageOf(sim.samples[jaw], 'buc')

  return (
    <div className="min-h-screen bg-[#0b1016] px-3 py-5 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/game" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
              თამაშები
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white md:text-2xl">Helios 700 Scan Hero</h1>
              <p className="text-xs text-slate-400">ინტრაორალური სკანირება · კლინიკური სიმულატორი</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            საუკეთესო: <b className="text-white">{best}</b>
          </span>
        </header>

        {screen === 'menu' && (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <h2 className="text-xl font-bold text-white md:text-2xl">ციფრული ანაბეჭდი Helios 700-ით</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                ეკრანზე ხედავთ სკანირების პროგრამას: 3D მოდელი იწყობა მხოლოდ იქ, სადაც სკანერმა უკვე გაიარა. კადრები ერთმანეთს
                გადაფარვით „იკერება“. თუ ზედმეტად სწრაფად ამოძრავებთ, ტრეკინგი იკარგება და გაგრძელება მხოლოდ უკვე დასკანერებული
                უბნიდან შეიძლება, როგორც რეალურ კლინიკაში.
              </p>
              <ol className="mt-5 space-y-2 text-sm text-slate-300">
                <li><b className="text-white">1.</b> დაიწყეთ ბოლო მოლარიდან, ოკლუზიური ხედით (1) და გაიარეთ მთელი თაღი.</li>
                <li><b className="text-white">2.</b> გადაატრიალეთ სკანერი ლინგვალურად (2) და დაბრუნდით, შემდეგ ბუკალურად (3).</li>
                <li><b className="text-white">3.</b> სკანირება: მაუსის დაჭერა ან Space. ჰაერი: A. ნერწყვი ამცირებს მონაცემის ხარისხს.</li>
                <li><b className="text-white">4.</b> ბოლოს ზედა ყბა და თანკბილვის ბუკალური რეგისტრაცია ორივე მხარეს.</li>
              </ol>
              <p className="mt-5 rounded-lg border border-white/10 p-3 text-xs text-slate-400">
                Helios 700: უკაბელო, სიზუსტე 16 μm, სრული თაღი 30 წამამდე, AI ფილტრი ენისა და ლოყის მოსაშორებლად.
              </p>
            </section>
            <section className="grid content-start gap-3">
              {(Object.entries(MODES) as [ModeId, (typeof MODES)[ModeId]][]).map(([id, m]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => start(id)}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-sky-400/40 hover:bg-sky-400/[0.06]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{m.title}</span>
                    <Play className="h-4 w-4 text-sky-300" />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    მაქს. სიჩქარე {m.speedLimit} მმ/წმ · {m.phases.map((p) => (p === 'bite' ? 'თანკბილვა' : JAW_LABEL[p])).join(' → ')}
                  </p>
                </button>
              ))}
            </section>
          </div>
        )}

        {screen === 'report' && result && (
          <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs font-semibold text-emerald-300">მოდელი მზადაა · {mode.title}</div>
            <div className="mt-2 text-5xl font-bold text-white">{result.score}</div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-400">დრო</dt>
              <dd className="text-right text-white">{Math.round(result.time)} წმ</dd>
              <dt className="text-slate-400">დაფარვა</dt>
              <dd className="text-right text-white">{Math.round(result.coverage * 100)}%</dd>
              <dt className="text-slate-400">მაღალი ხარისხის მონაცემი</dt>
              <dd className="text-right text-white">{Math.round(result.good * 100)}%</dd>
              <dt className="text-slate-400">ტრეკინგის დაკარგვა</dt>
              <dd className="text-right text-white">{result.losses}</dd>
              <dt className="text-slate-400">AI ფილტრი (ენა ხედში)</dt>
              <dd className="text-right text-white">{result.ai.toFixed(1)} წმ</dd>
            </dl>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              {result.good < 0.85
                ? 'მოდელში ბევრი სველი ზედაპირია: ლაბორატორია ზღვრებს ვერ წაიკითხავს. სკანირებამდე და შუალედში გამოიყენეთ ჰაერი.'
                : result.losses > 4
                  ? 'მოდელი სრულია, მაგრამ ხშირი ტრეკინგის დაკარგვა დროს კარგავს. იმოძრავეთ თანაბრად, დაახლოებით 1–2 სმ/წმ სიჩქარით.'
                  : 'კარგი სკანი: სრული დაფარვა, მშრალი ზედაპირი და თანაბარი მოძრაობა. მოდელი ლაბორატორიაში გასაგზავნად მზადაა.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => start(modeId)} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950">
                <RotateCcw className="h-4 w-4" />
                თავიდან
              </button>
              <button type="button" onClick={() => setScreen('menu')} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200">
                სხვა რეჟიმი
              </button>
            </div>
          </section>
        )}

        {screen === 'playing' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b2027]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#232a33] px-3 py-2 text-[11px] text-slate-300">
                <span className="font-semibold text-white">Helios · {phase === 'bite' ? 'თანკბილვა' : JAW_LABEL[jaw]}</span>
                <span className="tabular-nums">
                  {Math.floor(sim.elapsed / 60)}:{String(Math.floor(sim.elapsed % 60)).padStart(2, '0')} · ეტაპი {sim.phaseIndex + 1}/{mode.phases.length}
                </span>
              </div>
              <div className="relative aspect-[6/5] w-full">
                <svg
                  ref={svgRef}
                  viewBox="-44 -14 88 74"
                  className="absolute inset-0 h-full w-full touch-none select-none"
                  style={{ cursor: 'none' }}
                  onPointerMove={(e) => {
                    const p = toMm(e.clientX, e.clientY)
                    if (p) simRef.current.pos = p
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const p = toMm(e.clientX, e.clientY)
                    if (p) {
                      simRef.current.pos = p
                      simRef.current.prev = p
                    }
                    simRef.current.scanning = true
                  }}
                  onPointerUp={() => {
                    simRef.current.scanning = false
                  }}
                  onPointerCancel={() => {
                    simRef.current.scanning = false
                  }}
                  onWheel={(e) => {
                    const order: View[] = ['occ', 'lin', 'buc']
                    const i = order.indexOf(simRef.current.view)
                    setView(order[(i + (e.deltaY > 0 ? 1 : 2)) % 3])
                  }}
                >
                  <SharedDefs />
                  <defs>
                    <clipPath id="sc-cap">
                      {frames.map((f, i) => (
                        <rect key={i} x={f.x - FRAME_W / 2} y={f.y - FRAME_H / 2} width={FRAME_W} height={FRAME_H} rx="2" transform={`rotate(${(f.a * 180) / Math.PI} ${f.x} ${f.y})`} />
                      ))}
                    </clipPath>
                    <clipPath id="sc-low">
                      {frames
                        .filter((f) => f.low)
                        .map((f, i) => (
                          <rect key={i} x={f.x - FRAME_W / 2} y={f.y - FRAME_H / 2} width={FRAME_W} height={FRAME_H} rx="2" transform={`rotate(${(f.a * 180) / Math.PI} ${f.x} ${f.y})`} />
                        ))}
                    </clipPath>
                    <filter id="sc-wand-shadow" x="-20%" y="-50%" width="140%" height="200%">
                      <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" floodColor="#000" floodOpacity="0.55" />
                    </filter>
                    <radialGradient id="sc-light" cx="40%" cy="25%" r="80%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
                    </radialGradient>
                  </defs>

                  {/* Guide: faint outline of what still has to be scanned */}
                  <g opacity="0.55">
                    <path d={arch.gumOuter} fill="none" stroke="#3a4552" strokeWidth="0.3" strokeDasharray="1 1" fillRule="evenodd" />
                    {arch.teeth.map((t, i) => (
                      <path key={i} d={toothOutline(t)} transform={toothMatrix(t)} fill="#222a33" stroke="#4b5867" strokeWidth="0.25" />
                    ))}
                  </g>

                  {/* Captured model in true colour */}
                  <g clipPath="url(#sc-cap)">
                    <ArchArt arch={arch} lobes={[]} />
                    <rect x="-44" y="-14" width="88" height="74" fill="url(#sc-light)" />
                  </g>
                  <g clipPath="url(#sc-low)">
                    <rect x="-44" y="-14" width="88" height="74" fill="url(#sc-speckle)" />
                  </g>

                  {/* Side surfaces (rim) and remaining holes */}
                  {phase !== 'bite' &&
                    sim.samples[jaw]
                      .filter((smp) => smp.view !== 'occ')
                      .map((smp, i) => (
                        <circle
                          key={i}
                          cx={smp.x}
                          cy={smp.y}
                          r={smp.state === 0 ? 0.55 : 0.75}
                          fill={smp.state === 2 ? '#f5ead4' : smp.state === 1 ? '#f59e0b' : 'none'}
                          stroke={smp.state === 0 ? (smp.view === 'buc' ? '#38bdf8' : '#c084fc') : 'none'}
                          strokeWidth="0.25"
                          opacity={smp.state === 0 ? 0.8 : 1}
                        />
                      ))}

                  {/* Bite registration targets */}
                  {phase === 'bite' &&
                    biteTargets(arches.lower).map((tp, i) => (
                      <g key={i}>
                        <circle cx={tp.x} cy={tp.y} r="4" fill="none" stroke={sim.bite[i] >= 1 ? '#4ade80' : '#38bdf8'} strokeWidth="0.4" strokeDasharray="1 0.8" />
                        <circle cx={tp.x} cy={tp.y} r={4 * sim.bite[i]} fill="#4ade80" opacity="0.25" />
                      </g>
                    ))}

                  {/* Helios 700 wand: head over the scan window, handle exits through the front of the mouth */}
                  <g transform={`translate(${sim.pos.x} ${sim.pos.y}) rotate(${wandDeg})`} opacity="0.88" pointerEvents="none" filter="url(#sc-wand-shadow)">
                    <image href="/images/helios700-wand.webp" x={-WAND_LEN} y={-WAND_TIP_Y} width={WAND_LEN} height={WAND_H} />
                    {sim.scanning && <rect x={-9} y={-3.2} width={8} height={6.4} rx="1.5" fill="#38bdf8" opacity="0.35" />}
                  </g>

                  {/* Scanner field of view */}
                  <g transform={`rotate(${frameDeg} ${sim.pos.x} ${sim.pos.y})`}>
                    <rect x={sim.pos.x - FRAME_W / 2} y={sim.pos.y - FRAME_H / 2} width={FRAME_W} height={FRAME_H} rx="1.5" fill={frameColor} opacity="0.07" />
                    {[
                      [-1, -1],
                      [1, -1],
                      [1, 1],
                      [-1, 1],
                    ].map(([sx, sy], i) => (
                      <path
                        key={i}
                        d={`M ${sim.pos.x + (sx * FRAME_W) / 2} ${sim.pos.y + sy * (FRAME_H / 2 - 2.5)} L ${sim.pos.x + (sx * FRAME_W) / 2} ${sim.pos.y + (sy * FRAME_H) / 2} L ${sim.pos.x + sx * (FRAME_W / 2 - 2.5)} ${sim.pos.y + (sy * FRAME_H) / 2}`}
                        fill="none"
                        stroke={frameColor}
                        strokeWidth="0.45"
                        strokeLinecap="round"
                      />
                    ))}
                    <circle cx={sim.pos.x} cy={sim.pos.y} r="0.5" fill={frameColor} />
                  </g>
                  {facing !== 0 && (
                    <line
                      x1={sim.pos.x - nearest.tooth.nx * facing * 6}
                      y1={sim.pos.y - nearest.tooth.ny * facing * 6}
                      x2={sim.pos.x - nearest.tooth.nx * facing * 2.5}
                      y2={sim.pos.y - nearest.tooth.ny * facing * 2.5}
                      stroke={frameColor}
                      strokeWidth="0.45"
                      markerEnd=""
                    />
                  )}
                </svg>
              </div>
              <div className={`m-2 rounded-xl border px-3 py-2.5 text-sm ${toneClass}`}>{sim.message}</div>
            </section>

            <aside className="grid content-start gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-400">
                  <span>ცოცხალი კამერა · {VIEW_LABEL[sim.view]}</span>
                  <span className={sim.scanning ? 'text-emerald-300' : ''}>{sim.scanning ? '● REC' : 'პაუზა'}</span>
                </div>
                <svg viewBox="0 0 240 170" className="block w-full">
                  <SharedDefs />
                  <g transform={`translate(120 85) rotate(${-frameDeg}) scale(14) translate(${-sim.pos.x} ${-sim.pos.y})`}>
                    <rect x="-60" y="-30" width="120" height="110" fill="#7a2f33" />
                    <ArchArt arch={arch} lobes={lobes} />
                  </g>
                  <g opacity={sim.wet}>
                    {[
                      [40, 50, 16, 5],
                      [150, 110, 22, 6],
                      [190, 40, 10, 4],
                      [90, 130, 12, 4],
                    ].map(([x, y, rx, ry], i) => (
                      <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#fff" opacity="0.55" />
                    ))}
                  </g>
                  {sim.rolling > 0 && <rect width="240" height="170" fill="#0b1016" opacity="0.6" />}
                  <rect x="1" y="1" width="238" height="168" fill="none" stroke={frameColor} strokeWidth="2" />
                  <rect width="240" height="170" fill="url(#sc-vig)" />
                  <defs>
                    <radialGradient id="sc-vig" cx="50%" cy="50%" r="70%">
                      <stop offset="65%" stopColor="#000" stopOpacity="0" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>სიჩქარე</span>
                  <span className={`whitespace-nowrap tabular-nums ${speedPct > 100 ? 'text-rose-300' : 'text-white'}`}>
                    {sim.speed.toFixed(0)} / {mode.speedLimit}
                    <span className="ml-1 font-normal text-slate-500">მმ/წმ</span>
                  </span>
                </div>
                <div className="relative mt-2 h-1.5 rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${speedPct > 100 ? 'bg-rose-500' : speedPct > 75 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(speedPct, 100)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>ზედაპირის სინესტე</span>
                  <span className={`tabular-nums ${sim.wet > WET_LIMIT ? 'text-amber-300' : 'text-white'}`}>{Math.round(sim.wet * 100)}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${sim.wet > WET_LIMIT ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${sim.wet * 100}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-400">ტრეკინგი</span>
                  <span className={sim.tracking === 'lost' ? 'font-bold text-rose-300' : sim.tracking === 'ok' ? 'font-bold text-emerald-300' : 'text-slate-400'}>
                    {sim.tracking === 'lost' ? 'დაკარგულია' : sim.tracking === 'ok' ? 'აქტიური' : 'პაუზა'}
                  </span>
                </div>
              </div>

              {phase !== 'bite' ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px]">
                  <div className="mb-2 font-semibold text-slate-400">დაფარვა · {JAW_LABEL[jaw]}</div>
                  {(
                    [
                      ['ოკლუზიური', occ],
                      ['ლინგვალური', lin],
                      ['ბუკალური', buc],
                    ] as [string, { captured: number; good: number }][]
                  ).map(([label, c]) => (
                    <div key={label} className="mb-2">
                      <div className="flex justify-between text-slate-300">
                        <span>{label}</span>
                        <span className="tabular-nums">{Math.round(c.captured * 100)}%</span>
                      </div>
                      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-emerald-400" style={{ width: `${c.good * 100}%` }} />
                        <div className="h-full bg-amber-400" style={{ width: `${(c.captured - c.good) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-1 text-[10px] text-slate-500">მწვანე: მშრალი მონაცემი · ყვითელი: სველი, დაბალი ხარისხი</div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-300">
                  <div className="mb-2 font-semibold text-slate-400">თანკბილვის რეგისტრაცია</div>
                  <div>მარჯვენა მხარე: {Math.round(sim.bite[0] * 100)}%</div>
                  <div>მარცხენა მხარე: {Math.round(sim.bite[1] * 100)}%</div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-400">სკანერის ხედი (1 / 2 / 3, ან ბორბალი)</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['occ', 'lin', 'buc'] as View[]).map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={`rounded-lg px-1 py-2 text-[11px] font-bold ${sim.view === v ? 'bg-white text-slate-950' : 'bg-white/[0.06] text-slate-300 hover:bg-white/10'}`}
                    >
                      {i + 1}. {VIEW_LABEL[v]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    simRef.current.drying = true
                  }}
                  onPointerUp={() => {
                    simRef.current.drying = false
                  }}
                  onPointerCancel={() => {
                    simRef.current.drying = false
                  }}
                  className={`mt-2 flex w-full touch-none select-none items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold ${sim.drying ? 'bg-sky-400 text-slate-950' : 'bg-white/[0.06] text-slate-200 hover:bg-white/10'}`}
                >
                  <Wind className="h-4 w-4" />
                  ჰაერით გაშრობა (A)
                </button>
              </div>

              <button
                type="button"
                disabled={!phaseDone}
                onClick={nextPhase}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-500"
              >
                {isLastPhase ? <Send className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isLastPhase ? 'მოდელის დასრულება და გაგზავნა' : 'შემდეგი ეტაპი'}
              </button>
              <p className="text-[10px] leading-4 text-slate-600">
                სასწავლო სიმულაცია. გეომეტრია და პარამეტრები გამარტივებულია.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

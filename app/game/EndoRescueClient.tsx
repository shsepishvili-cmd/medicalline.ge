'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Droplets, Play, RotateCcw, ScanLine, Volume2, VolumeX, Wind, Zap } from 'lucide-react'

// =============================================================================
// Endo Rescue – clinical simulator for separated-instrument retrieval
// (staging platform + ultrasonic trephination under the microscope).
// =============================================================================

type Screen = 'menu' | 'decision' | 'playing' | 'success' | 'fail' | 'judgement' | 'finished'
type ToothKind = 'premolar' | 'molar'
type FailReason = 'perforation' | 'thermal' | 'apical' | 'tipFracture'
type Decision = 'retrieve' | 'bypass' | 'leave'

type CaseData = {
  id: number
  title: string
  kind: ToothKind
  canalLen: number
  fragDepth: number
  fragLen: number
  curve: number
  initialDentin: number
  dangerAngle: number
  dangerLabel: string
  rCanal: number
  rFrag: number
  note: string
  decision?: boolean
}

type Point = { x: number; y: number }

type Sim = {
  tip: Point
  active: boolean
  irrigating: boolean
  drying: boolean
  debris: number
  wet: number
  heat: number
  maxHeat: number
  dentin: number
  sectors: number[]
  mobility: number
  loose: boolean
  flushTime: number
  removed: boolean
  removeAnim: number
  fragDepth: number
  pushes: number
  fragmentHits: number
  irrigations: number
  elapsed: number
  gouges: Point[]
  chips: { x: number; y: number; vx: number; vy: number; life: number }[]
  usedHighMag: boolean
  visibleOnce: boolean
  coverageDone: boolean
  message: string
  tone: 'info' | 'good' | 'warn' | 'bad'
}

const CASES: CaseData[] = [
  {
    id: 1,
    title: 'ქვედა მეორე პრემოლარი (45)',
    kind: 'premolar',
    canalLen: 21,
    fragDepth: 7,
    fragLen: 3,
    curve: 0.08,
    initialDentin: 1.6,
    dangerAngle: Math.PI,
    dangerLabel: 'ლინგვალური კედელი',
    rCanal: 84,
    rFrag: 15,
    note: 'სწორი არხი, ფრაგმენტი კორონალურ მესამედშია. კარგი ხილვადობა და საკმარისი დენტინი.',
  },
  {
    id: 2,
    title: 'ზედა პირველი მოლარი (16), MB არხი',
    kind: 'molar',
    canalLen: 20,
    fragDepth: 11,
    fragLen: 3,
    curve: 0.45,
    initialDentin: 1.15,
    dangerAngle: 0,
    dangerLabel: 'ფურკაციის მხარე',
    rCanal: 70,
    rFrag: 13,
    note: 'საშუალო მოხრილობა, ფრაგმენტი შუა მესამედში. დისტალური კედელი ფურკაციისკენ თხელია.',
  },
  {
    id: 3,
    title: 'ქვედა პირველი მოლარი (36), MB არხი',
    kind: 'molar',
    canalLen: 21,
    fragDepth: 16,
    fragLen: 2.5,
    curve: 0.95,
    initialDentin: 0.8,
    dangerAngle: 0,
    dangerLabel: 'ფურკაციის მხარე (danger zone)',
    rCanal: 58,
    rFrag: 11,
    note: 'მკვეთრი მოხრილობა, ფრაგმენტი მოხრილობის მიღმა, აპიკალურ მესამედში.',
    decision: true,
  },
]

const SECTORS = 16
const MAGS = [4, 8, 16] as const
const HEAT_WARN = 6
const HEAT_FAIL = 10
const PERFORATION_MM = 0.25
const C = 250 // microscope view centre

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const FAIL_TEXT: Record<FailReason, { title: string; body: string }> = {
  perforation: {
    title: 'ფესვის პერფორაცია',
    body: 'ტრეფინაციის ზონის გარეთ ზედმეტად ბევრი დენტინი მოიხსნა საშიშ მხარეს. პლატფორმა ფრაგმენტის ირგვლივ ვიწრო ღარი უნდა იყოს და არა არხის კედლის გაფართოება.',
  },
  thermal: {
    title: 'თერმული დაზიანება',
    body: 'ფესვის ზედაპირზე ტემპერატურამ 10 °C-ით მოიმატა. ამ ზღვარს ზემოთ პერიოდონტის იოგი და ძვალი ზიანდება. იმუშავე მოკლე იმპულსებით და ინტერვალებში გამოიყენე ირიგაცია.',
  },
  apical: {
    title: 'ფრაგმენტი აპიკალურად გადავიდა',
    body: 'მაღალ სიმძლავრეზე წვერმა ფრაგმენტს პირდაპირ დაარტყა და ის უფრო ღრმად, მოხრილობის მიღმა ჩავიდა. წვერი ფრაგმენტის გვერდით, დენტინში უნდა მოძრაობდეს, ფრაგმენტზე კი არა.',
  },
  tipFracture: {
    title: 'ულტრაბგერითი წვერი მოტყდა',
    body: 'თხელი ენდო-წვერი მაღალ სიმძლავრეზე ლითონთან კონტაქტისას ტყდება. ახლა არხში ორი ფრაგმენტია. ამ წვერებისთვის რეკომენდებულია დაბალი სიმძლავრე (2–4).',
  },
}

const JUDGEMENT_TEXT: Record<Exclude<Decision, 'retrieve'>, { title: string; score: number; body: string }> = {
  bypass: {
    title: 'სწორი გადაწყვეტილება: შემოვლა (bypass)',
    score: 900,
    body: 'ფრაგმენტი მოხრილობის მიღმაა, მიკროსკოპით არ ჩანს და კედელი ფურკაციისკენ მხოლოდ ~0.8 მმ-ია. ამოღების ცდას დიდი დენტინის მოხსნა სჭირდება, რაც პერფორაციის რისკს ზრდის. მცირე ზომის ხელის ფაილით ფრაგმენტის გვერდის ავლა, არხის დამუშავება და ობტურაცია, რომელიც ფრაგმენტს მოიცავს, აქ ყველაზე უსაფრთხო გზაა.',
  },
  leave: {
    title: 'მისაღები, მაგრამ არა ოპტიმალური',
    score: 600,
    body: 'ფრაგმენტის დატოვება და კორონალური ნაწილის ობტურაცია ზოგჯერ გამართლებულია, განსაკუთრებით თუ არხი ფრაგმენტის ჩატეხვამდე უკვე დამუშავებული იყო. თუმცა ჯერ bypass-ის ცდაა რეკომენდებული. პაციენტს უნდა მიეწოდოს ინფორმაცია და საჭიროა რენტგენოლოგიური მონიტორინგი.',
  },
}

// -----------------------------------------------------------------------------
// Tooth geometry for the radiograph (viewBox 240 × 360)
// -----------------------------------------------------------------------------

const ORIFICE_Y = 118
const APEX_Y = 330

type Root = { baseX: number; curve: number; topW: number; apexW: number }

function toothRoots(kind: ToothKind, curve: number): { roots: Root[]; target: number; crownX: [number, number] } {
  if (kind === 'premolar') {
    return { roots: [{ baseX: 120, curve, topW: 42, apexW: 9 }], target: 0, crownX: [82, 158] }
  }
  return {
    roots: [
      { baseX: 88, curve, topW: 38, apexW: 9 },
      { baseX: 154, curve: 0.18, topW: 40, apexW: 10 },
    ],
    target: 0,
    crownX: [46, 196],
  }
}

function rootCenterX(root: Root, y: number) {
  const t = clamp((y - ORIFICE_Y) / (APEX_Y - ORIFICE_Y), 0, 1)
  return root.baseX + root.curve * t * t * 46
}

function rootPolygon(root: Root, startY: number, topW: number, apexW: number) {
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const y = startY + t * (APEX_Y - startY)
    const cx = rootCenterX(root, y)
    const w = topW + (apexW - topW) * t
    left.push(`${(cx - w / 2).toFixed(1)} ${y.toFixed(1)}`)
    right.unshift(`${(cx + w / 2).toFixed(1)} ${y.toFixed(1)}`)
  }
  const apexX = rootCenterX(root, APEX_Y)
  return `M ${left.join(' L ')} Q ${apexX.toFixed(1)} ${APEX_Y + apexW * 0.6} ${right.join(' L ')} Z`
}

function crownPath(kind: ToothKind) {
  if (kind === 'premolar') {
    return 'M 84 120 C 76 92, 74 60, 88 38 C 100 22, 112 18, 120 24 C 128 18, 140 22, 152 38 C 166 60, 164 92, 156 120 Z'
  }
  return 'M 50 122 C 40 96, 38 58, 54 36 C 66 22, 82 18, 94 26 C 104 18, 118 16, 128 24 C 140 16, 158 18, 172 28 C 194 44, 200 92, 192 122 Z'
}

function mmToY(c: CaseData, mm: number) {
  return ORIFICE_Y + (mm / c.canalLen) * (APEX_Y - ORIFICE_Y)
}

function Radiograph({
  caseData,
  fragDepth,
  dentin,
  showTip,
  removed,
  className = '',
}: {
  caseData: CaseData
  fragDepth: number
  dentin: number
  showTip: boolean
  removed: boolean
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const { roots, target, crownX } = toothRoots(caseData.kind, caseData.curve)
  const root = roots[target]
  const fragTop = mmToY(caseData, fragDepth)
  const fragBottom = mmToY(caseData, fragDepth + caseData.fragLen)
  const fragPoints: string[] = []
  for (let y = fragTop; y <= fragBottom; y += 2) fragPoints.push(`${rootCenterX(root, y).toFixed(1)},${y.toFixed(1)}`)
  const tipPoints: string[] = []
  for (let y = ORIFICE_Y - 30; y <= fragTop - 2; y += 4) tipPoints.push(`${rootCenterX(root, Math.max(y, ORIFICE_Y)).toFixed(1)},${y.toFixed(1)}`)
  const dangerSide = Math.cos(caseData.dangerAngle) >= 0 ? 1 : -1
  const markerY = (fragTop + fragBottom) / 2
  const markerX = rootCenterX(root, markerY) + dangerSide * 22
  const dentinColor = dentin > 0.8 ? '#4ade80' : dentin > 0.5 ? '#fbbf24' : '#f87171'

  return (
    <svg viewBox="0 0 240 360" className={className} role="img" aria-label="პერიაპიკალური რენტგენი">
      <defs>
        <filter id={`bone-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="3" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.66  0 0 0 0 0.7  0 0 0 1.4 -0.45" />
        </filter>
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.22 0" />
        </filter>
        <linearGradient id={`dentin-${uid}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#9aa3ac" />
          <stop offset="50%" stopColor="#c9d0d6" />
          <stop offset="100%" stopColor="#9aa3ac" />
        </linearGradient>
        <radialGradient id={`vignette-${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>

      <rect width="240" height="360" fill="#14181d" />
      <rect y="112" width="240" height="248" fill="#4b535b" />
      <rect y="112" width="240" height="248" filter={`url(#bone-${uid})`} opacity="0.75" />

      {roots.map((r, i) => (
        <g key={i}>
          <path d={rootPolygon(r, ORIFICE_Y - 8, r.topW + 5, r.apexW + 4)} fill="#2a3037" />
          <path d={rootPolygon(r, ORIFICE_Y - 8, r.topW, r.apexW)} fill={`url(#dentin-${uid})`} />
          <path d={rootPolygon(r, ORIFICE_Y, 7, 1.6)} fill="#3a4148" />
        </g>
      ))}

      <path d={crownPath(caseData.kind)} fill="#eef1f4" />
      <path d={crownPath(caseData.kind)} fill={`url(#dentin-${uid})`} transform="translate(120 70) scale(0.86) translate(-120 -70)" />
      <rect x={crownX[0] + 28} y="66" width={crownX[1] - crownX[0] - 56} height="50" rx="16" fill="#3a4148" />
      <path
        d={`M ${root.baseX - 13} 22 L ${root.baseX + 13} 22 L ${root.baseX + 6} 72 L ${root.baseX - 6} 72 Z`}
        fill="#1b2026"
      />

      {showTip && (
        <polyline points={tipPoints.join(' ')} fill="none" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
      )}

      {!removed && (
        <polyline points={fragPoints.join(' ')} fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
      )}

      {!removed && (
        <g>
          <line x1={markerX - dangerSide * 6} y1={markerY} x2={markerX + dangerSide * 6} y2={markerY} stroke={dentinColor} strokeWidth="1.5" />
          <text
            x={markerX + dangerSide * 9}
            y={markerY + 3}
            fontSize="9"
            fontWeight="700"
            fill={dentinColor}
            textAnchor={dangerSide > 0 ? 'start' : 'end'}
          >
            {dentin.toFixed(2)} მმ
          </text>
        </g>
      )}

      <rect width="240" height="360" filter={`url(#grain-${uid})`} />
      <rect width="240" height="360" fill={`url(#vignette-${uid})`} />
      <text x="8" y="352" fontSize="8" fill="#94a3b8" letterSpacing="1">NanoPix · RVG</text>
    </svg>
  )
}

// -----------------------------------------------------------------------------
// Microscope scene: occlusal view of the tooth under rubber dam
// (target canal orifice is always at the view centre C)
// -----------------------------------------------------------------------------

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Smooth irregular closed shape (Catmull-Rom through jittered points)
function blobPath(cx: number, cy: number, rx: number, ry: number, irregularity: number, seed: number, points = 14) {
  const rand = seeded(seed)
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2
    const k = 1 + (rand() - 0.5) * irregularity
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k }
  })
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % points]
    const p3 = pts[(i + 2) % points]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return `${d} Z`
}

function sceneLayout(c: CaseData) {
  const r = c.rCanal
  if (c.kind === 'premolar') {
    const o = { x: C, y: C + r * 0.45 }
    return {
      o,
      tooth: { x: o.x, y: o.y + r * 0.1, rx: r * 2.55, ry: r * 2.9 },
      cavity: { rx: r * 1.45, ry: r * 1.95 },
      floor: { rx: r * 1.1, ry: r * 1.55 },
      orifices: [] as { x: number; y: number; r: number }[],
      neighbour: { x: o.x - r * 0.3, y: o.y - r * 3.9, rx: r * 2.4, ry: r * 1.3 },
    }
  }
  const o = { x: C + r * 0.95, y: C + r * 0.8 }
  return {
    o,
    tooth: { x: o.x + r * 0.1, y: o.y + r * 0.15, rx: r * 3.45, ry: r * 3.25 },
    cavity: { rx: r * 2.35, ry: r * 2.2 },
    floor: { rx: r * 1.85, ry: r * 1.7 },
    orifices: [
      { x: o.x + r * 1.05, y: o.y - r * 0.85, r: r * 0.5 },
      { x: o.x + r * 0.1, y: o.y + r * 1.15, r: r * 0.46 },
    ],
    neighbour: { x: o.x - r * 0.4, y: o.y - r * 4.45, rx: r * 3.0, ry: r * 1.5 },
  }
}

function AccessScene({ caseData }: { caseData: CaseData }) {
  const L = useMemo(() => sceneLayout(caseData), [caseData])
  const seed = caseData.id * 31
  const paths = useMemo(
    () => ({
      neighbour: blobPath(L.neighbour.x, L.neighbour.y, L.neighbour.rx, L.neighbour.ry, 0.12, seed + 1),
      tooth: blobPath(L.tooth.x, L.tooth.y, L.tooth.rx, L.tooth.ry, 0.14, seed + 2, 16),
      toothShadow: blobPath(L.tooth.x + 6, L.tooth.y + 8, L.tooth.rx * 1.02, L.tooth.ry * 1.02, 0.14, seed + 2, 16),
      cavity: blobPath(L.o.x, L.o.y, L.cavity.rx, L.cavity.ry, 0.22, seed + 3, 12),
      floor: blobPath(L.o.x, L.o.y + 6, L.floor.rx, L.floor.ry, 0.26, seed + 4, 11),
    }),
    [L, seed],
  )
  const r = caseData.rCanal
  const grooves = [{ x: C, y: C }, ...L.orifices]

  return (
    <g>
      <defs>
        <linearGradient id="as-dam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3cc4a6" />
          <stop offset="55%" stopColor="#2aa98d" />
          <stop offset="100%" stopColor="#22937a" />
        </linearGradient>
        <filter id="as-dam-tex" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="3" seed="5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.9 -0.35" />
        </filter>
        <radialGradient id="as-crown" gradientUnits="userSpaceOnUse" cx={L.tooth.x - r * 0.4} cy={L.tooth.y - r * 0.6} r={L.tooth.rx * 1.25}>
          <stop offset="0%" stopColor="#fbf6ea" />
          <stop offset="70%" stopColor="#f1e5c8" />
          <stop offset="100%" stopColor="#d9c497" />
        </radialGradient>
        <radialGradient id="as-neigh" gradientUnits="userSpaceOnUse" cx={L.neighbour.x} cy={L.neighbour.y + L.neighbour.ry * 0.4} r={L.neighbour.rx}>
          <stop offset="0%" stopColor="#f8f1e2" />
          <stop offset="100%" stopColor="#dccaa3" />
        </radialGradient>
        <radialGradient id="as-cavity" gradientUnits="userSpaceOnUse" cx={L.o.x} cy={L.o.y} r={Math.max(L.cavity.rx, L.cavity.ry) * 1.05}>
          <stop offset="0%" stopColor="#a8957a" />
          <stop offset="62%" stopColor="#c9b48f" />
          <stop offset="86%" stopColor="#e6d3ab" />
          <stop offset="100%" stopColor="#f3e5c6" />
        </radialGradient>
        <radialGradient id="as-floor" gradientUnits="userSpaceOnUse" cx={L.o.x - r * 0.2} cy={L.o.y - r * 0.3} r={Math.max(L.floor.rx, L.floor.ry) * 1.1}>
          <stop offset="0%" stopColor="#c4b39b" />
          <stop offset="100%" stopColor="#9a8770" />
        </radialGradient>
        <radialGradient id="as-orifice">
          <stop offset="0%" stopColor="#1d120b" />
          <stop offset="55%" stopColor="#3b2719" />
          <stop offset="100%" stopColor="#8a7559" stopOpacity="0" />
        </radialGradient>
        <filter id="as-soft">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Rubber dam */}
      <rect x={-600} y={-600} width={1700} height={1700} fill="url(#as-dam)" />
      <rect x={-600} y={-600} width={1700} height={1700} filter="url(#as-dam-tex)" opacity="0.55" />

      {/* Neighbouring tooth */}
      <path d={paths.neighbour} fill="#16614f" opacity="0.5" transform="translate(5 8)" filter="url(#as-soft)" />
      <path d={paths.neighbour} fill="url(#as-neigh)" />

      {/* Crown (enamel rim) */}
      <path d={paths.toothShadow} fill="#14594a" opacity="0.55" filter="url(#as-soft)" />
      <path d={paths.tooth} fill="url(#as-crown)" />
      <path d={paths.tooth} filter="url(#er-texture)" opacity="0.5" />

      {/* Access cavity walls and pulp-chamber floor */}
      <path d={paths.cavity} fill="url(#as-cavity)" />
      <path d={paths.cavity} fill="none" stroke="#fff8e8" strokeWidth="3" opacity="0.55" />
      <path d={paths.floor} fill="url(#as-floor)" />
      <path d={paths.floor} filter="url(#er-texture)" opacity="0.7" />

      {/* Developmental grooves between orifices (the "dentin map") */}
      <g stroke="#5b4a39" strokeWidth={r * 0.07} strokeLinecap="round" fill="none" opacity="0.45" filter="url(#as-soft)">
        {grooves.slice(1).map((g, i) => (
          <path key={i} d={`M ${C} ${C} Q ${(C + g.x) / 2 + r * 0.25} ${(C + g.y) / 2 - r * 0.15} ${g.x} ${g.y}`} />
        ))}
      </g>

      {/* Untreated orifices */}
      {L.orifices.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={o.r * 1.5} fill="url(#as-orifice)" />
          <circle cx={o.x} cy={o.y} r={o.r * 0.75} fill="#1a100a" />
          <ellipse cx={o.x - o.r * 0.25} cy={o.y - o.r * 0.55} rx={o.r * 0.5} ry={o.r * 0.14} fill="#f3e6cc" opacity="0.35" />
        </g>
      ))}

      {/* Flared target orifice rim */}
      <circle cx={C} cy={C} r={r * 1.18} fill="url(#as-orifice)" />
    </g>
  )
}

// -----------------------------------------------------------------------------
// Sound
// -----------------------------------------------------------------------------

function playUltrasonicPulse(ctx: AudioContext, power: number) {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const mod = ctx.createOscillator()
  const modGain = ctx.createGain()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1800 + power * 90, now)
  mod.type = 'square'
  mod.frequency.setValueAtTime(28 + power * 3, now)
  modGain.gain.setValueAtTime(180, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.012 + power * 0.002, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
  mod.connect(modGain)
  modGain.connect(osc.frequency)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  mod.start(now)
  osc.stop(now + 0.13)
  mod.stop(now + 0.13)
}

// -----------------------------------------------------------------------------
// Small UI pieces
// -----------------------------------------------------------------------------

function Gauge({ label, value, unit, pct, tone }: { label: string; value: string; unit?: string; pct: number; tone: 'good' | 'warn' | 'bad' | 'info' }) {
  const bar = { good: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-rose-500', info: 'bg-sky-400' }[tone]
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-400">{label}</span>
        <span className="text-sm font-bold tabular-nums text-white">
          {value}
          {unit && <span className="ml-0.5 text-[11px] font-medium text-slate-400">{unit}</span>}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-[width] duration-150 ${bar}`} style={{ width: `${clamp(pct, 0, 100)}%` }} />
      </div>
    </div>
  )
}

function HoldButton({
  label,
  icon,
  onHold,
  active,
  hint,
}: {
  label: string
  icon: React.ReactNode
  onHold: (on: boolean) => void
  active: boolean
  hint: string
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onHold(true)
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex select-none flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold transition touch-none ${
        active ? 'border-sky-300 bg-sky-400 text-slate-950' : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`text-[10px] font-medium ${active ? 'text-slate-800' : 'text-slate-500'}`}>{hint}</span>
    </button>
  )
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

function newSim(c: CaseData): Sim {
  return {
    tip: { x: C + c.rCanal * 0.5, y: C + c.rCanal * 0.4 },
    active: false,
    irrigating: false,
    drying: false,
    debris: 0.85,
    wet: 0.25,
    heat: 0,
    maxHeat: 0,
    dentin: c.initialDentin,
    sectors: Array(SECTORS).fill(0),
    mobility: 0,
    loose: false,
    flushTime: 0,
    removed: false,
    removeAnim: 0,
    fragDepth: c.fragDepth,
    pushes: 0,
    fragmentHits: 0,
    irrigations: 0,
    elapsed: 0,
    gouges: [],
    chips: [],
    usedHighMag: false,
    visibleOnce: false,
    coverageDone: false,
    message: 'არხი ნარჩენებით და სისხლიანი ექსუდატითაა დაფარული. ჯერ ირიგაცია, მერე გაშრობა.',
    tone: 'info',
  }
}

export default function EndoRescueClient() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [caseIndex, setCaseIndex] = useState(0)
  const [mag, setMag] = useState<(typeof MAGS)[number]>(8)
  const [power, setPower] = useState(3)
  const [muted, setMuted] = useState(false)
  const [failReason, setFailReason] = useState<FailReason | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [caseScore, setCaseScore] = useState(0)
  const [best, setBest] = useState(0)
  const [, setFrame] = useState(0)

  const caseData = CASES[caseIndex]
  const simRef = useRef<Sim>(newSim(caseData))
  const svgRef = useRef<SVGSVGElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const lastPulseRef = useRef(0)
  const settingsRef = useRef({ mag, power, muted })
  settingsRef.current = { mag, power, muted }

  const sim = simRef.current

  useEffect(() => {
    try {
      setBest(Number(window.localStorage.getItem('endo-rescue-sim-best')) || 0)
    } catch {}
  }, [])

  const saveBest = useCallback((score: number) => {
    setBest((current) => {
      const next = Math.max(current, score)
      try {
        window.localStorage.setItem('endo-rescue-sim-best', String(next))
      } catch {}
      return next
    })
  }, [])

  const startCase = useCallback((index: number) => {
    const c = CASES[index]
    setCaseIndex(index)
    simRef.current = newSim(c)
    setMag(8)
    setPower(3)
    setFailReason(null)
    setDecision(null)
    setScreen(c.decision ? 'decision' : 'playing')
  }, [])

  const visibility = (s: Sim, m: number) => clamp(1 - s.debris * 0.9 - s.wet * 0.55, 0, 1) * (m === 4 ? 0.62 : 1)

  // ---------------------------------------------------------------------------
  // Simulation loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (screen !== 'playing') return
    let raf = 0
    let last = performance.now()

    const fail = (reason: FailReason) => {
      setFailReason(reason)
      setScreen('fail')
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = simRef.current
      const c = CASES[caseIndex]
      const { mag: m, power: p, muted: mute } = settingsRef.current
      const pEff = clamp(p / 3.5, 0.3, 2.4)

      s.elapsed += dt
      if (m >= 8) s.usedHighMag = true

      // Irrigation / drying
      if (s.irrigating) {
        s.debris = clamp(s.debris - 0.75 * dt, 0, 1)
        s.wet = clamp(s.wet + 1.8 * dt, 0, 1)
        s.heat = clamp(s.heat - 3.2 * dt, 0, 99)
        if (s.loose && !s.removed) {
          s.flushTime += dt
          if (s.flushTime >= 1.2) {
            s.removed = true
            s.message = 'ფრაგმენტი ამოირეცხა არხიდან. გადაიღე საკონტროლო რენტგენი.'
            s.tone = 'good'
          }
        }
      }
      if (s.drying) s.wet = clamp(s.wet - 0.85 * dt, 0, 1)
      if (s.removed) s.removeAnim = clamp(s.removeAnim + dt * 1.4, 0, 1)

      const vis = visibility(s, m)
      if (!s.visibleOnce && vis >= 0.6) {
        s.visibleOnce = true
        s.message = 'ფრაგმენტი ჩანს. შექმენი ვიწრო ღარი მის ირგვლივ: წვერი გაატარე წრიულად, საათის ისრის საწინააღმდეგოდ.'
        s.tone = 'good'
      }

      // Ultrasonic activation
      const dx = s.tip.x - C
      const dy = s.tip.y - C
      const r = Math.hypot(dx, dy)
      const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
      const bandIn = c.rFrag + 1.5
      const bandOut = c.rFrag + 14
      const overcut = c.rFrag + 20

      if (s.active && !s.removed) {
        s.heat += (0.16 + 0.11 * p) * dt * (r < overcut ? 1.25 : 0.9)
        s.debris = clamp(s.debris + 0.035 * p * dt, 0, 1)

        if (!mute && now - lastPulseRef.current > 115) {
          lastPulseRef.current = now
          const ctx = audioRef.current
          if (ctx) playUltrasonicPulse(ctx, p)
        }

        if (Math.random() < 0.6) {
          s.chips.push({ x: s.tip.x, y: s.tip.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.5 })
        }

        if (r < bandIn) {
          // Direct contact with the fragment
          s.fragmentHits += dt
          if (p >= 8 && Math.random() < 0.4 * dt) return fail('tipFracture')
          if (p >= 6 && Math.random() < 0.55 * dt) {
            s.pushes += 1
            s.fragDepth += 0.8
            s.sectors = s.sectors.map((v) => v * 0.5)
            s.coverageDone = false
            s.mobility = 0
            if (s.pushes >= 2) return fail('apical')
            s.message = 'ფრაგმენტი 0.8 მმ-ით ღრმად ჩავიდა! ნუ შეეხები მას პირდაპირ და შეამცირე სიმძლავრე.'
            s.tone = 'bad'
          } else if (s.tone !== 'bad') {
            s.message = 'წვერი ფრაგმენტს ეხება. იმუშავე მის გვერდით, დენტინში.'
            s.tone = 'warn'
          }
        } else if (vis < 0.45) {
          s.message = 'ხედვა დაკარგულია: ნარჩენები და სითხე ფარავს ველს. ირიგაცია → გაშრობა.'
          s.tone = 'warn'
        } else if (r <= bandOut) {
          const idx = Math.floor((angle / (Math.PI * 2)) * SECTORS) % SECTORS
          const work = 0.45 * pEff * dt
          s.sectors[idx] = clamp(s.sectors[idx] + work, 0, 1)
          s.sectors[(idx + 1) % SECTORS] = clamp(s.sectors[(idx + 1) % SECTORS] + work * 0.35, 0, 1)
          s.sectors[(idx + SECTORS - 1) % SECTORS] = clamp(s.sectors[(idx + SECTORS - 1) % SECTORS] + work * 0.35, 0, 1)
          if (s.coverageDone && !s.loose) {
            s.mobility = clamp(s.mobility + 16 * pEff * dt, 0, 100)
            if (s.mobility >= 100) {
              s.loose = true
              s.message = 'ფრაგმენტი მოძრავია და „ცეკვავს“. ჩართე ირიგაცია, რომ გამოირეცხოს.'
              s.tone = 'good'
            }
          }
        } else {
          const danger = 1 + 1.6 * Math.max(0, Math.cos(angle - c.dangerAngle))
          const rate = r > overcut ? 0.011 : 0.003
          s.dentin = clamp(s.dentin - rate * p * danger * dt, 0, 9)
          if (Math.random() < 6 * dt) s.gouges.push({ x: s.tip.x, y: s.tip.y })
          if (r > overcut) {
            s.message = `ზედმეტი დენტინი იხსნება (${c.dangerLabel}). დაბრუნდი ფრაგმენტთან ახლოს.`
            s.tone = 'warn'
          }
          if (s.dentin <= PERFORATION_MM) return fail('perforation')
        }
      } else {
        s.heat = clamp(s.heat - 0.7 * dt, 0, 99)
      }

      s.maxHeat = Math.max(s.maxHeat, s.heat)
      if (s.heat >= HEAT_FAIL) return fail('thermal')
      if (s.heat >= HEAT_WARN && s.tone !== 'bad') {
        s.message = `ΔT ${s.heat.toFixed(1)} °C — შეაჩერე აქტივაცია და გააგრილე ირიგაციით.`
        s.tone = 'warn'
      }

      const doneSectors = s.sectors.filter((v) => v >= 0.9).length
      if (!s.coverageDone && doneSectors >= SECTORS - 2) {
        s.coverageDone = true
        s.message = 'ღარი მზადაა. გააგრძელე მსუბუქი აქტივაცია ფრაგმენტის გვერდით, სანამ არ მოძრავდება.'
        s.tone = 'good'
      }

      s.chips = s.chips
        .map((ch) => ({ ...ch, x: ch.x + ch.vx * dt, y: ch.y + ch.vy * dt, life: ch.life - dt }))
        .filter((ch) => ch.life > 0)
        .slice(-40)

      setFrame((f) => (f + 1) % 1_000_000)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [screen, caseIndex])

  // Keyboard controls
  useEffect(() => {
    if (screen !== 'playing') return
    const set = (key: string, on: boolean) => {
      const s = simRef.current
      if (key === ' ') s.active = on
      if (key === 'i') {
        if (on && !s.irrigating) s.irrigations += 1
        s.irrigating = on
      }
      if (key === 'a') s.drying = on
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'i' || k === 'a') {
        e.preventDefault()
        ensureAudio()
        set(k, true)
      }
    }
    const up = (e: KeyboardEvent) => set(e.key.toLowerCase(), false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [screen])

  const ensureAudio = () => {
    if (typeof window === 'undefined') return
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioRef.current) audioRef.current = new Ctor()
    if (audioRef.current.state === 'suspended') void audioRef.current.resume()
  }

  const scale = mag / 8

  const pointerToContent = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    const x = (p.x - C) / scale + C
    const y = (p.y - C) / scale + C
    const limit = caseData.rCanal + 26
    const d = Math.hypot(x - C, y - C)
    if (d > limit) return { x: C + ((x - C) / d) * limit, y: C + ((y - C) / d) * limit }
    return { x, y }
  }

  const takeRadiograph = () => {
    const s = simRef.current
    const timePenalty = Math.round(s.elapsed * 2)
    const heatPenalty = Math.round(Math.max(0, s.maxHeat - 4) * 45)
    const dentinPenalty = Math.round((caseData.initialDentin - s.dentin) * 420)
    const hitPenalty = Math.round(s.fragmentHits * 60) + s.pushes * 120
    const magPenalty = s.usedHighMag ? 0 : 120
    const score = clamp(1000 - timePenalty - heatPenalty - dentinPenalty - hitPenalty - magPenalty, 50, 1000)
    setCaseScore(score)
    const total = totalScore + score
    setTotalScore(total)
    saveBest(total)
    setScreen('success')
  }

  const chooseDecision = (d: Decision) => {
    setDecision(d)
    if (d === 'retrieve') {
      setScreen('playing')
      return
    }
    const score = JUDGEMENT_TEXT[d].score
    setCaseScore(score)
    const total = totalScore + score
    setTotalScore(total)
    saveBest(total)
    setScreen('judgement')
  }

  const nextCase = () => {
    if (caseIndex < CASES.length - 1) startCase(caseIndex + 1)
    else setScreen('finished')
  }

  const restartAll = () => {
    setTotalScore(0)
    startCase(0)
  }

  // ---------------------------------------------------------------------------
  // Derived values for rendering
  // ---------------------------------------------------------------------------
  const vis = visibility(sim, mag)
  const trephination = sim.coverageDone
    ? 100
    : Math.min(99, Math.round((sim.sectors.reduce((sum, v) => sum + Math.min(v, 0.9), 0) / (0.9 * SECTORS)) * 100))
  const jitter = sim.active ? { x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 1.6 } : { x: 0, y: 0 }
  const tremor = { x: Math.sin(sim.elapsed * 7.3) * 0.5, y: Math.cos(sim.elapsed * 6.1) * 0.5 }
  const tipX = sim.tip.x + jitter.x + tremor.x
  const tipY = sim.tip.y + jitter.y + tremor.y
  const fragShake = sim.loose && !sim.removed ? { x: (Math.random() - 0.5) * 2.4, y: (Math.random() - 0.5) * 2.4 } : { x: 0, y: 0 }
  const fragScale = 1 + sim.removeAnim * 1.6
  const fragOpacity = (1 - sim.removeAnim) * clamp(vis * 1.4, 0.15, 1)
  const toneClass = {
    info: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    warn: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    bad: 'border-rose-400/40 bg-rose-500/15 text-rose-100',
  }[sim.tone]

  const steps = [
    { label: 'გადიდება ≥ 8x', done: sim.usedHighMag },
    { label: 'ირიგაცია და გაშრობა', done: sim.visibleOnce },
    { label: 'ტრეფინაცია ფრაგმენტის ირგვლივ', done: sim.coverageDone },
    { label: 'ფრაგმენტის მობილიზაცია', done: sim.loose },
    { label: 'ამორეცხვა', done: sim.removed },
    { label: 'საკონტროლო რენტგენი', done: false },
  ]

  const debrisParticles = useMemo(() => {
    let seed = caseData.id * 97
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: 46 }, () => {
      const a = rand() * Math.PI * 2
      const rr = Math.sqrt(rand()) * (caseData.rCanal - 4)
      return { x: C + Math.cos(a) * rr, y: C + Math.sin(a) * rr, r: 1.2 + rand() * 3.2, c: rand() > 0.6 ? '#7f2d1d' : '#d8c7a6' }
    })
  }, [caseData])

  const sectorArcs = useMemo(() => {
    const r1 = caseData.rFrag + 3
    const r2 = caseData.rFrag + 12
    return Array.from({ length: SECTORS }, (_, i) => {
      const a0 = (i / SECTORS) * Math.PI * 2
      const a1 = ((i + 1) / SECTORS) * Math.PI * 2
      const p = (r: number, a: number) => `${(C + Math.cos(a) * r).toFixed(2)} ${(C + Math.sin(a) * r).toFixed(2)}`
      return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r2, a1)} A ${r2} ${r2} 0 0 0 ${p(r2, a0)} Z`
    })
  }, [caseData])

  // Tip shaft: from the tip toward the lower-right edge of the field (perspective)
  const shaftEnd = { x: tipX + 300, y: tipY + 330 }
  const ang = Math.atan2(shaftEnd.y - tipY, shaftEnd.x - tipX)
  const nx = -Math.sin(ang)
  const ny = Math.cos(ang)
  const shaft = `M ${tipX + nx * 1.3} ${tipY + ny * 1.3} L ${shaftEnd.x + nx * 11} ${shaftEnd.y + ny * 11} L ${shaftEnd.x - nx * 11} ${shaftEnd.y - ny * 11} L ${tipX - nx * 1.3} ${tipY - ny * 1.3} Z`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0a0f16] px-3 py-5 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/game" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
              თამაშები
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white md:text-2xl">Endo Rescue</h1>
              <p className="text-xs text-slate-400">ჩატეხილი ინსტრუმენტის ამოღება · კლინიკური სიმულატორი</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              საუკეთესო: <b className="text-white">{best}</b>
            </span>
            {screen !== 'menu' && (
              <span>
                ჯამი: <b className="text-white">{totalScore}</b>
              </span>
            )}
            <button type="button" onClick={() => setMuted((v) => !v)} className="rounded-lg border border-white/10 p-2 hover:bg-white/5" aria-label="ხმა">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {screen === 'menu' && (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
              <h2 className="text-xl font-bold text-white md:text-2xl">ფრაგმენტის ამოღება ულტრაბგერით, მიკროსკოპის ქვეშ</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                არხში NiTi ფაილის ფრაგმენტია ჩარჩენილი. თქვენ ხედავთ არხს Acuvision X მიკროსკოპით, ზემოდან. ულტრაბგერითი წვერით
                ფრაგმენტის ირგვლივ ვიწრო ღარი უნდა ამოჭრათ (ტრეფინაცია), სანამ ის არ მოძრავდება, შემდეგ კი ირიგაციით ამორეცხოთ.
                დენტინი, სითბო და სიმძლავრე რეალურ კლინიკურ ზღვრებს მიჰყვება.
              </p>
              <ol className="mt-5 space-y-2 text-sm text-slate-300">
                <li><b className="text-white">1.</b> აირჩიეთ გადიდება. 4x-ზე ფრაგმენტი ბუნდოვნად ჩანს, 16x-ზე ხელის კანკალი იზრდება.</li>
                <li><b className="text-white">2.</b> ირიგაცია (I) ხსნის ნარჩენებს და აგრილებს, გაშრობა (A) კი სველ ველს ასუფთავებს.</li>
                <li><b className="text-white">3.</b> აქტივაცია (Space ან დაჭერა): წვერი ფრაგმენტის გვერდით გაატარეთ წრიულად.</li>
                <li><b className="text-white">4.</b> როცა ფრაგმენტი მოძრავდება, ჩართეთ ირიგაცია და ამორეცხეთ.</li>
                <li><b className="text-white">5.</b> საკონტროლო რენტგენი დაადასტურებს შედეგს.</li>
              </ol>
              <div className="mt-5 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 p-3"><b className="text-rose-300">ΔT ≥ 10 °C</b>: პერიოდონტის თერმული დაზიანება</div>
                <div className="rounded-lg border border-white/10 p-3"><b className="text-rose-300">დენტინი ≤ 0.25 მმ</b>: პერფორაცია</div>
                <div className="rounded-lg border border-white/10 p-3"><b className="text-amber-300">სიმძლავრე ≥ 6</b> ფრაგმენტზე: გადაგდების რისკი</div>
                <div className="rounded-lg border border-white/10 p-3"><b className="text-amber-300">სიმძლავრე ≥ 8</b> ლითონზე: წვერის მოტეხვა</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  ensureAudio()
                  restartAll()
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-sky-300"
              >
                <Play className="h-4 w-4" />
                პირველი ქეისის დაწყება
              </button>
            </section>

            <section className="grid gap-3">
              {CASES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    ensureAudio()
                    setTotalScore(0)
                    startCase(c.id - 1)
                  }}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-sky-400/40 hover:bg-sky-400/[0.06]"
                >
                  <Radiograph caseData={c} fragDepth={c.fragDepth} dentin={c.initialDentin} showTip={false} removed={false} className="h-36 w-24 shrink-0 rounded-lg" />
                  <div className="py-1">
                    <div className="text-[11px] font-semibold text-sky-300">ქეისი {c.id} · დაწყება →</div>
                    <div className="mt-1 font-bold text-white">{c.title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{c.note}</p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      ფრაგმენტი {c.fragDepth} მმ სიღრმეზე · კედელი {c.initialDentin} მმ
                    </p>
                  </div>
                </button>
              ))}
            </section>
          </div>
        )}

        {screen === 'decision' && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
            <div className="grid gap-5 md:grid-cols-[150px_1fr]">
              <Radiograph caseData={caseData} fragDepth={caseData.fragDepth} dentin={caseData.initialDentin} showTip={false} removed={false} className="h-56 w-36 rounded-lg" />
              <div>
                <div className="text-xs font-semibold text-sky-300">ქეისი {caseData.id} · კლინიკური გადაწყვეტილება</div>
                <h2 className="mt-1 text-xl font-bold text-white">{caseData.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  რენტგენზე ფრაგმენტი მოხრილობის მიღმაა, აპიკალურ მესამედში. მიკროსკოპით არ ჩანს. მეზიალური ფესვის კედელი ფურკაციისკენ
                  მხოლოდ ~{caseData.initialDentin} მმ-ია. რას გააკეთებთ?
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {(
                [
                  ['retrieve', 'ფრაგმენტის ამოღების ცდა', 'ულტრაბგერითი ტრეფინაცია თხელ, მოხრილ ფესვში.'],
                  ['bypass', 'შემოვლა (bypass) და არხის დამუშავება', 'მცირე ზომის ხელის ფაილით ფრაგმენტის გვერდის ავლა და ობტურაცია.'],
                  ['leave', 'დატოვება, ობტურაცია და მონიტორინგი', 'კორონალური ნაწილის დამუშავება, ფრაგმენტი რჩება ადგილზე.'],
                ] as [Decision, string, string][]
              ).map(([key, title, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseDecision(key)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-sky-400/50 hover:bg-sky-400/10"
                >
                  <div className="font-bold text-white">{title}</div>
                  <div className="mt-1 text-sm text-slate-400">{desc}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'judgement' && decision && decision !== 'retrieve' && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
            <div className={`text-xs font-semibold ${decision === 'bypass' ? 'text-emerald-300' : 'text-amber-300'}`}>
              ქულა: {caseScore}
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">{JUDGEMENT_TEXT[decision].title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{JUDGEMENT_TEXT[decision].body}</p>
            <button type="button" onClick={nextCase} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-sky-300">
              შედეგების ნახვა
            </button>
          </section>
        )}

        {(screen === 'playing' || screen === 'success' || screen === 'fail') && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-2xl border border-white/10 bg-black p-2 md:p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 pt-1 text-xs text-slate-400">
                <span>
                  <b className="text-white">ქეისი {caseData.id}</b> · {caseData.title}
                  {decision === 'retrieve' && <span className="ml-2 text-amber-300">(ამოღების ცდა)</span>}
                </span>
                <span className="tabular-nums">
                  Acuvision X · {mag}x · {Math.floor(sim.elapsed / 60)}:{String(Math.floor(sim.elapsed % 60)).padStart(2, '0')}
                </span>
              </div>

              <div className="relative mx-auto aspect-square w-full max-w-[560px]">
                <svg
                  ref={svgRef}
                  viewBox="0 0 500 500"
                  className="absolute inset-0 h-full w-full touch-none select-none"
                  style={{ cursor: screen === 'playing' ? 'none' : 'default' }}
                  onPointerMove={(e) => {
                    if (screen !== 'playing') return
                    const p = pointerToContent(e.clientX, e.clientY)
                    if (p) simRef.current.tip = p
                  }}
                  onPointerDown={(e) => {
                    if (screen !== 'playing') return
                    ensureAudio()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const p = pointerToContent(e.clientX, e.clientY)
                    if (p) simRef.current.tip = p
                    if (e.pointerType === 'mouse') simRef.current.active = true
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType === 'mouse') simRef.current.active = false
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse') simRef.current.active = false
                  }}
                >
                  <defs>
                    <radialGradient id="er-wall" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#3b2a1a" />
                      <stop offset="34%" stopColor="#7a6040" />
                      <stop offset="62%" stopColor="#c7ad82" />
                      <stop offset="100%" stopColor="#efe0c0" />
                    </radialGradient>
                    <radialGradient id="er-lumen" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1a1009" />
                      <stop offset="45%" stopColor="#2c1e11" />
                      <stop offset="80%" stopColor="#5a4428" />
                      <stop offset="100%" stopColor="#8f7650" />
                    </radialGradient>
                    <radialGradient id="er-floor" cx="50%" cy="45%" r="55%">
                      <stop offset="0%" stopColor="#9c8058" />
                      <stop offset="100%" stopColor="#5a4429" />
                    </radialGradient>
                    <radialGradient id="er-metal" cx="38%" cy="34%" r="70%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="45%" stopColor="#a3aab3" />
                      <stop offset="100%" stopColor="#4b5260" />
                    </radialGradient>
                    <linearGradient id="er-shaft" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e5e7eb" />
                      <stop offset="50%" stopColor="#9ca3af" />
                      <stop offset="100%" stopColor="#d1d5db" />
                    </linearGradient>
                    <radialGradient id="er-vignette" cx="50%" cy="50%" r="50%">
                      <stop offset="80%" stopColor="#000" stopOpacity="0" />
                      <stop offset="96%" stopColor="#000" stopOpacity="1" />
                    </radialGradient>
                    <filter id="er-texture" x="0" y="0" width="100%" height="100%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" />
                      <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.35 0" />
                      <feComposite in2="SourceAlpha" operator="in" />
                    </filter>
                    <filter id="er-soft">
                      <feGaussianBlur stdDeviation={mag === 4 ? 1.6 : 0.25} />
                    </filter>
                    <filter id="er-blur8">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                    <clipPath id="er-field">
                      <circle cx={C} cy={C} r="238" />
                    </clipPath>
                  </defs>

                  <rect width="500" height="500" fill="#000" />

                  <g clipPath="url(#er-field)">
                    <g transform={`translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})`} filter="url(#er-soft)">
                      {/* Rubber dam, crown, access cavity and pulp-chamber floor */}
                      <AccessScene caseData={caseData} />
                      <circle cx={C} cy={C} r={caseData.rCanal} fill="url(#er-lumen)" />
                      <circle cx={C - 8} cy={C - 10} r={caseData.rCanal - 4} fill="none" stroke="#f5e6c8" strokeWidth="1.2" opacity="0.25" />
                      <circle cx={C} cy={C} r={caseData.rFrag + 22} fill="url(#er-floor)" />
                      <circle cx={C} cy={C} r={caseData.rFrag + 22} filter="url(#er-texture)" opacity="0.8" />

                      {/* Over-cut gouges */}
                      {sim.gouges.slice(-160).map((g, i) => (
                        <ellipse key={i} cx={g.x} cy={g.y} rx="3.2" ry="2.2" fill="#f6ead2" opacity="0.55" />
                      ))}

                      {/* Trephination groove */}
                      {sectorArcs.map((d, i) => (
                        <path key={i} d={d} fill="#efe3c9" opacity={sim.sectors[i] * 0.85} />
                      ))}
                      {sectorArcs.map((d, i) => (
                        <path key={`s${i}`} d={d} fill="#1f150c" opacity={sim.sectors[i] * 0.35} transform={`translate(${C} ${C}) scale(0.82) translate(${-C} ${-C})`} />
                      ))}

                      {/* Fragment (cross-section of a fluted NiTi file) */}
                      {sim.removeAnim < 1 && (
                        <g
                          opacity={fragOpacity}
                          transform={`translate(${C + fragShake.x - sim.removeAnim * 40} ${C + fragShake.y - sim.removeAnim * 70}) scale(${fragScale}) translate(${-C} ${-C})`}
                        >
                          <circle cx={C} cy={C} r={caseData.rFrag + 1.5} fill="#1c130b" opacity="0.7" />
                          <circle cx={C} cy={C} r={caseData.rFrag} fill="url(#er-metal)" />
                          {[0, 1, 2].map((k) => {
                            const a = (k * Math.PI * 2) / 3
                            const rf = caseData.rFrag
                            return (
                              <path
                                key={k}
                                d={`M ${C + Math.cos(a) * rf * 0.15} ${C + Math.sin(a) * rf * 0.15} Q ${C + Math.cos(a + 0.9) * rf * 0.7} ${C + Math.sin(a + 0.9) * rf * 0.7} ${C + Math.cos(a + 0.5) * rf} ${C + Math.sin(a + 0.5) * rf}`}
                                fill="none"
                                stroke="#3f4652"
                                strokeWidth="2"
                              />
                            )
                          })}
                          <ellipse cx={C - caseData.rFrag * 0.3} cy={C - caseData.rFrag * 0.35} rx={caseData.rFrag * 0.35} ry={caseData.rFrag * 0.18} fill="#fff" opacity="0.7" />
                        </g>
                      )}

                      {/* Debris, blood and smear */}
                      <g opacity={sim.debris}>
                        {debrisParticles.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity="0.85" />
                        ))}
                        <circle cx={C} cy={C} r={caseData.rCanal - 2} fill="#5c2417" opacity="0.45" filter="url(#er-blur8)" />
                      </g>

                      {/* Irrigant film */}
                      <g opacity={sim.wet}>
                        <circle cx={C} cy={C} r={caseData.rCanal + 6} fill="#9cc8e0" opacity="0.32" />
                        <ellipse cx={C - caseData.rCanal * 0.35} cy={C - caseData.rCanal * 0.4} rx={caseData.rCanal * 0.38} ry={caseData.rCanal * 0.12} fill="#fff" opacity="0.55" filter="url(#er-blur8)" />
                        <ellipse cx={C + caseData.rCanal * 0.3} cy={C + caseData.rCanal * 0.2} rx="9" ry="4" fill="#fff" opacity="0.6" />
                      </g>
                      {sim.irrigating && (
                        <circle cx={C} cy={C} r={caseData.rCanal} fill="#bfe3f5" opacity={0.25 + Math.random() * 0.15} />
                      )}

                      {/* Dentin chips */}
                      {sim.chips.map((ch, i) => (
                        <circle key={i} cx={ch.x} cy={ch.y} r="1.3" fill="#fff8e8" opacity={ch.life * 1.6} />
                      ))}

                      {/* Ultrasonic tip */}
                      {screen === 'playing' && (
                        <g>
                          <path d={shaft} fill="#000" opacity="0.35" transform="translate(5 7)" />
                          <path d={shaft} fill="url(#er-shaft)" stroke="#6b7280" strokeWidth="0.6" />
                          <circle cx={tipX} cy={tipY} r="2.4" fill="#e5e7eb" stroke="#4b5563" strokeWidth="0.6" />
                          {sim.active && <circle cx={tipX} cy={tipY} r={6 + Math.random() * 3} fill="none" stroke="#e0f2fe" strokeWidth="0.8" opacity="0.6" />}
                        </g>
                      )}
                    </g>

                    {/* Warm microscope light */}
                    <rect width="500" height="500" fill="#ffe9c4" opacity="0.06" />
                  </g>
                  <circle cx={C} cy={C} r="250" fill="url(#er-vignette)" />
                </svg>

                {screen === 'success' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/80 p-4">
                    <div className="grid w-full max-w-lg gap-4 rounded-2xl border border-white/10 bg-[#0f1620] p-5 sm:grid-cols-[120px_1fr]">
                      <Radiograph caseData={caseData} fragDepth={sim.fragDepth} dentin={sim.dentin} showTip={false} removed className="h-44 w-28 rounded-lg" />
                      <div>
                        <div className="text-xs font-semibold text-emerald-300">ფრაგმენტი ამოღებულია</div>
                        <div className="mt-1 text-3xl font-bold text-white">{caseScore}</div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                          <dt>დრო</dt><dd className="text-right text-slate-200">{Math.round(sim.elapsed)} წმ</dd>
                          <dt>მაქს. ΔT</dt><dd className="text-right text-slate-200">{sim.maxHeat.toFixed(1)} °C</dd>
                          <dt>დარჩენილი კედელი</dt><dd className="text-right text-slate-200">{sim.dentin.toFixed(2)} მმ</dd>
                          <dt>ფრაგმენტთან კონტაქტი</dt><dd className="text-right text-slate-200">{sim.fragmentHits.toFixed(1)} წმ</dd>
                          <dt>ირიგაციები</dt><dd className="text-right text-slate-200">{sim.irrigations}</dd>
                        </dl>
                        <button type="button" onClick={nextCase} className="mt-4 w-full rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300">
                          {caseIndex < CASES.length - 1 ? 'შემდეგი ქეისი' : 'შედეგები'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {screen === 'fail' && failReason && (
                  <div className="absolute inset-0 grid place-items-center bg-black/80 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[#1a0f12] p-5">
                      <div className="text-xs font-semibold text-rose-300">გართულება</div>
                      <h3 className="mt-1 text-xl font-bold text-white">{FAIL_TEXT[failReason].title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{FAIL_TEXT[failReason].body}</p>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => startCase(caseIndex)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">
                          <RotateCcw className="h-4 w-4" />
                          თავიდან ცდა
                        </button>
                        <button type="button" onClick={() => setScreen('menu')} className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200">
                          მენიუ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {screen === 'playing' && (
                <div className={`mx-1 mt-2 rounded-xl border px-3 py-2.5 text-sm ${toneClass}`}>{sim.message}</div>
              )}
            </section>

            <aside className="grid content-start gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Radiograph
                  caseData={caseData}
                  fragDepth={sim.fragDepth}
                  dentin={sim.dentin}
                  showTip={screen === 'playing'}
                  removed={sim.removed}
                  className="mx-auto h-48 w-32 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Gauge label="ΔT ფესვზე" value={sim.heat.toFixed(1)} unit="°C" pct={(sim.heat / HEAT_FAIL) * 100} tone={sim.heat >= HEAT_WARN ? 'bad' : sim.heat >= 3.5 ? 'warn' : 'good'} />
                <Gauge
                  label="კედლის სისქე"
                  value={sim.dentin.toFixed(2)}
                  unit="მმ"
                  pct={(sim.dentin / caseData.initialDentin) * 100}
                  tone={sim.dentin > 0.8 ? 'good' : sim.dentin > 0.5 ? 'warn' : 'bad'}
                />
                <Gauge label="ხილვადობა" value={String(Math.round(vis * 100))} unit="%" pct={vis * 100} tone={vis >= 0.6 ? 'good' : vis >= 0.45 ? 'warn' : 'bad'} />
                <Gauge label="ტრეფინაცია" value={String(trephination)} unit="%" pct={trephination} tone="info" />
              </div>
              {sim.coverageDone && <Gauge label="ფრაგმენტის მობილობა" value={String(Math.round(sim.mobility))} unit="%" pct={sim.mobility} tone="info" />}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-400">გადიდება (Acuvision X)</div>
                <div className="grid grid-cols-3 gap-2">
                  {MAGS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMag(m)}
                      className={`rounded-lg py-2 text-sm font-bold ${mag === m ? 'bg-white text-slate-950' : 'bg-white/[0.06] text-slate-300 hover:bg-white/10'}`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
                <div className="mb-1 mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>ულტრაბგერის სიმძლავრე</span>
                  <span className={`tabular-nums ${power >= 8 ? 'text-rose-300' : power >= 6 ? 'text-amber-300' : 'text-emerald-300'}`}>{power} / 10</span>
                </div>
                <input type="range" min={1} max={10} value={power} onChange={(e) => setPower(Number(e.target.value))} className="w-full accent-sky-400" />
                <div className="mt-1 text-[10px] text-slate-500">ენდო-წვერისთვის რეკომენდებულია 2–4</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <HoldButton label="აქტივაცია" hint="Space" icon={<Zap className="h-4 w-4" />} active={sim.active} onHold={(on) => { ensureAudio(); simRef.current.active = on }} />
                <HoldButton
                  label="ირიგაცია"
                  hint="I · NaOCl"
                  icon={<Droplets className="h-4 w-4" />}
                  active={sim.irrigating}
                  onHold={(on) => {
                    if (on && !simRef.current.irrigating) simRef.current.irrigations += 1
                    simRef.current.irrigating = on
                  }}
                />
                <HoldButton label="გაშრობა" hint="A · ჰაერი" icon={<Wind className="h-4 w-4" />} active={sim.drying} onHold={(on) => { simRef.current.drying = on }} />
              </div>

              {screen === 'playing' && (
                <button
                  type="button"
                  disabled={!sim.removed}
                  onClick={takeRadiograph}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-500"
                >
                  <ScanLine className="h-4 w-4" />
                  საკონტროლო რენტგენი
                </button>
              )}

              <ol className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                {steps.map((s, i) => (
                  <li key={s.label} className={`flex items-center gap-2 py-1 ${s.done ? 'text-emerald-300' : 'text-slate-400'}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${s.done ? 'bg-emerald-400 text-slate-950' : 'bg-white/10'}`}>
                      {s.done ? '✓' : i + 1}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
              <p className="text-[10px] leading-4 text-slate-600">
                სასწავლო სიმულაცია. პარამეტრები გამარტივებულია და ვერ ჩაანაცვლებს კლინიკურ ტრენინგს.
              </p>
            </aside>
          </div>
        )}

        {screen === 'finished' && (
          <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <div className="text-xs font-semibold text-emerald-300">ყველა ქეისი დასრულებულია</div>
            <div className="mt-2 text-5xl font-bold text-white">{totalScore}</div>
            <p className="mt-2 text-sm text-slate-400">მაქსიმუმი: 2900 · საუკეთესო: {best}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {totalScore >= 2400
                ? 'შესანიშნავი შედეგი: ზუსტი ტრეფინაცია, კონტროლირებადი სითბო და სწორი კლინიკური გადაწყვეტილება.'
                : totalScore >= 1700
                  ? 'კარგი შედეგი. ყურადღება მიაქციეთ სითბოს და ზედმეტ დენტინის მოხსნას.'
                  : 'სცადეთ ხელახლა: დაბალი სიმძლავრე, მოკლე იმპულსები და ირიგაცია ინტერვალებში.'}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" onClick={restartAll} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950">
                <RotateCcw className="h-4 w-4" />
                თავიდან
              </button>
              <Link href="/game" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200">
                სხვა თამაშები
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

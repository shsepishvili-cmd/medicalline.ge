'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ═══════════════ CONSTANTS ═══════════════
const CW = 380, CH = 560, CX = 190
const CT = 158, CB = 474, CHLEN = CB - CT

type Screen = 'start' | 'howto' | 'levels' | 'game' | 'win' | 'lose'
type Tool = 'ultrasonic' | 'grabber' | 'irrigation' | 'scope'

interface Lvl {
  id: number; name: string; sub: string
  w: number; cv: number; ft: number; sec: number; db: number
}
const LVLS: Lvl[] = [
  { id: 1, name: 'სწორი არხი',        sub: 'Straight Canal',   w: 46, cv: 0,   ft: .52, sec: 60, db: 0 },
  { id: 2, name: 'ვიწრო არხი',        sub: 'Narrow Canal',     w: 30, cv: 0,   ft: .60, sec: 55, db: 2 },
  { id: 3, name: 'მოხრილი არხი',      sub: 'Curved Canal',     w: 36, cv: .28, ft: .67, sec: 50, db: 3 },
  { id: 4, name: 'ღრმა ფრაგმენტი',   sub: 'Deep Fragment',    w: 28, cv: .18, ft: .75, sec: 45, db: 4 },
  { id: 5, name: 'ოსტატის გამოწვევა', sub: 'Master Challenge', w: 22, cv: .40, ft: .82, sec: 38, db: 5 },
]

// ═══════════════ MATH ═══════════════
const ccx = (y: number, cv: number) => CX + cv * 65 * Math.sin(((y - CT) / CHLEN) * Math.PI * 1.6)
const inC = (x: number, y: number, w: number, cv: number) =>
  y >= CT && y <= CB && Math.abs(x - ccx(y, cv)) <= w / 2
const d2 = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)

// ═══════════════ AUDIO ═══════════════
let _ac: AudioContext | null = null
const getAC = () => {
  if (typeof window === 'undefined') return null
  if (!_ac) try { _ac = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null }
  return _ac
}
const tone = (f: number, dur: number, v = .12, t: OscillatorType = 'sine') => {
  const ac = getAC(); if (!ac) return
  const o = ac.createOscillator(), g = ac.createGain()
  o.type = t; o.frequency.value = f
  g.gain.setValueAtTime(v, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur)
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur)
}
const sfx = {
  buzz: () => tone(85, .08, .12, 'sawtooth'),
  wall: () => { tone(160, .08, .2, 'square'); tone(90, .12, .15) },
  grab: () => { tone(440, .1, .15); tone(550, .08, .1) },
  irr:  () => tone(2400, .05, .07),
  win:  () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .3, .18), i * 140)),
  lose: () => [380, 260, 150].forEach((f, i) => setTimeout(() => tone(f, .35, .2), i * 190)),
}

// ═══════════════ GAME STATE ═══════════════
interface Db { x: number; y: number; gone: boolean }
interface GS {
  cx: number; cy: number; fx: number; fy: number
  grabbed: boolean; loosen: number; safety: number; smile: number
  score: number; timer: number; flash: number; zoom: boolean
  isDown: boolean; tool: Tool; lvl: Lvl; debris: Db[]
  lastHit: number; lastBuzz: number; shake: number; particles: Pt[]
}
interface Pt { x: number; y: number; vx: number; vy: number; life: number; color: string }

// ═══════════════ DRAW ═══════════════
function draw(c: CanvasRenderingContext2D, s: GS, ts: number) {
  const { cx, cy, fx, fy, grabbed, loosen, safety, smile, score, timer, flash, zoom, tool, lvl, debris, shake, particles } = s
  const { w, cv } = lvl
  const shx = shake > 0 ? (Math.random() - .5) * shake * 3 : 0

  c.clearRect(0, 0, CW, CH)

  // Background
  const bg = c.createLinearGradient(0, 0, 0, CH)
  bg.addColorStop(0, '#EBF5FB'); bg.addColorStop(1, '#D4E8F5')
  c.fillStyle = bg; c.fillRect(0, 0, CW, CH)
  c.strokeStyle = 'rgba(100,160,210,.07)'; c.lineWidth = 1
  for (let x = 0; x < CW; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke() }
  for (let y = 0; y < CH; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke() }

  // ── CROWN ──
  c.save()
  c.shadowColor = 'rgba(0,0,0,.14)'; c.shadowBlur = 14; c.shadowOffsetY = 3
  const tg = c.createLinearGradient(118, 0, 262, 0)
  tg.addColorStop(0, '#F0EFE4'); tg.addColorStop(.3, '#FFFFF8')
  tg.addColorStop(.7, '#FFFFF8'); tg.addColorStop(1, '#E8E6D8')
  c.fillStyle = tg
  c.beginPath()
  c.moveTo(132, 22); c.lineTo(248, 22)
  c.quadraticCurveTo(260, 22, 260, 34)
  c.lineTo(252, CT); c.lineTo(128, CT); c.lineTo(120, 34)
  c.quadraticCurveTo(120, 22, 132, 22)
  c.closePath(); c.fill()
  c.strokeStyle = 'rgba(180,175,150,.5)'; c.lineWidth = 1.5; c.stroke()
  c.restore()

  // ── ROOT ──
  c.save()
  c.shadowColor = 'rgba(0,0,0,.08)'; c.shadowBlur = 6
  const rg = c.createLinearGradient(CX - 38, 0, CX + 38, 0)
  rg.addColorStop(0, '#E5DEC8'); rg.addColorStop(.2, '#F0EAD4')
  rg.addColorStop(.5, '#FDFAF0'); rg.addColorStop(.8, '#F0EAD4'); rg.addColorStop(1, '#E5DEC8')
  c.fillStyle = rg
  c.beginPath()
  c.moveTo(128, CT); c.lineTo(252, CT)
  c.bezierCurveTo(252, CT + 80, CX + 30, CB - 18, CX, CB + 8)
  c.bezierCurveTo(CX - 30, CB - 18, 128, CT + 80, 128, CT)
  c.closePath(); c.fill()
  c.strokeStyle = 'rgba(165,155,125,.4)'; c.lineWidth = 1; c.stroke()
  c.restore()

  // ── CANAL ──
  const pts: number[][] = []
  for (let y = CT; y <= CB; y += 2) pts.push([ccx(y, cv), y])

  c.save()
  c.beginPath()
  c.moveTo(pts[0][0] - w / 2, pts[0][1])
  for (const p of pts) c.lineTo(p[0] - w / 2, p[1])
  for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0] + w / 2, pts[i][1])
  c.closePath()

  const cg = c.createLinearGradient(CX - 24, 0, CX + 24, 0)
  cg.addColorStop(0, '#23100A'); cg.addColorStop(.35, '#3C1C0E')
  cg.addColorStop(.5, '#140804'); cg.addColorStop(.65, '#3C1C0E'); cg.addColorStop(1, '#23100A')
  c.fillStyle = cg; c.fill()
  if (flash > 0) { c.fillStyle = `rgba(255,50,50,${flash * .5})`; c.fill() }
  c.strokeStyle = 'rgba(65,30,12,.8)'; c.lineWidth = 1.5; c.stroke()

  // Canal inner glow when cursor inside
  if (inC(cx, cy, w, cv)) {
    c.fillStyle = 'rgba(93,202,165,.06)'; c.fill()
  }
  c.restore()

  // Scope vignette
  if (zoom) {
    const sr = 74
    c.save()
    c.beginPath(); c.rect(0, 0, CW, CH)
    c.arc(CX, fy, sr, 0, Math.PI * 2, true)
    c.fillStyle = 'rgba(0,0,0,.65)'; c.fill()
    c.beginPath(); c.arc(CX, fy, sr + 2, 0, Math.PI * 2)
    c.strokeStyle = 'rgba(0,150,210,.8)'; c.lineWidth = 3; c.stroke()
    c.strokeStyle = 'rgba(0,150,210,.25)'; c.lineWidth = 1
    c.beginPath(); c.moveTo(CX - sr - 10, fy); c.lineTo(CX + sr + 10, fy)
    c.moveTo(CX, fy - sr - 10); c.lineTo(CX, fy + sr + 10); c.stroke()
    c.restore()
  }

  // Debris
  for (const d of debris) {
    if (d.gone) continue
    c.save()
    c.beginPath(); c.arc(d.x, d.y, 5, 0, Math.PI * 2)
    c.fillStyle = 'rgba(88,48,18,.8)'; c.fill()
    c.strokeStyle = 'rgba(120,70,30,.5)'; c.lineWidth = .8; c.stroke()
    c.restore()
  }

  // ── FRAGMENT ──
  if (fy < CB + 30) {
    c.save()
    c.translate(fx + shx, fy)
    c.rotate(.32)
    if (loosen >= 100) { c.shadowColor = '#5DCAA5'; c.shadowBlur = 16 }
    const fg = c.createLinearGradient(-5, -15, 5, 15)
    fg.addColorStop(0, '#ACACAC'); fg.addColorStop(.3, '#E8E8E8')
    fg.addColorStop(.5, '#F8F8F8'); fg.addColorStop(.75, '#C0C0C0'); fg.addColorStop(1, '#949494')
    c.fillStyle = fg
    c.beginPath()
    c.moveTo(-3, -14); c.lineTo(3, -14); c.lineTo(4.5, 0)
    c.lineTo(2.5, 14); c.lineTo(-2.5, 14); c.lineTo(-4.5, 0)
    c.closePath(); c.fill()
    c.strokeStyle = 'rgba(150,150,150,.5)'; c.lineWidth = .7
    for (let ly = -10; ly < 12; ly += 4) { c.beginPath(); c.moveTo(-4, ly); c.lineTo(4, ly); c.stroke() }
    c.restore()

    // Loosen ring
    if (loosen > 0 && loosen < 100) {
      c.save(); c.beginPath()
      c.arc(fx, fy, 22, -Math.PI / 2, -Math.PI / 2 + (loosen / 100) * Math.PI * 2)
      c.strokeStyle = '#5DCAA5'; c.lineWidth = 3; c.lineCap = 'round'; c.stroke(); c.restore()
    }
    if (loosen >= 100 && !grabbed) {
      c.save(); c.beginPath(); c.arc(fx, fy, 22, 0, Math.PI * 2)
      c.strokeStyle = '#5DCAA5'; c.lineWidth = 2; c.stroke()
      c.fillStyle = '#5DCAA5'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'
      c.fillText('✓', fx + 22, fy - 22); c.restore()
    }
  }

  // Particles
  for (const p of particles) {
    if (p.life <= 0) continue
    c.save()
    c.globalAlpha = p.life
    c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2)
    c.fillStyle = p.color; c.fill()
    c.restore()
  }

  // ── TOOL CURSOR ──
  if (cy > 0) {
    c.save()
    const ic = inC(cx, cy, w, cv)
    c.globalAlpha = ic ? 1 : .42
    switch (tool) {
      case 'ultrasonic': {
        c.fillStyle = '#1260A0'
        c.beginPath(); c.moveTo(cx, cy - 22); c.lineTo(cx - 2.5, cy + 6); c.lineTo(cx + 2.5, cy + 6); c.closePath(); c.fill()
        c.fillStyle = '#3A3A3A'; c.fillRect(cx - 4.5, cy + 6, 9, 15)
        if (ic && s.isDown && d2(cx, cy, fx, fy) < 34) {
          for (let i = 0; i < 6; i++) {
            const a = (ts / 70 + i * 60) * Math.PI / 180
            const r = 9 + Math.sin(ts / 45 + i) * 3
            c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2)
            c.fillStyle = `hsl(${48 + i * 8},100%,60%)`; c.fill()
          }
        }
        break
      }
      case 'grabber': {
        c.strokeStyle = '#A02820'; c.lineWidth = 2.5; c.lineCap = 'round'
        c.beginPath(); c.moveTo(cx, cy - 22); c.lineTo(cx, cy + 2); c.stroke()
        c.beginPath(); c.arc(cx + 5, cy + 2, 5, Math.PI, 0, true); c.stroke()
        c.fillStyle = '#5A0808'; c.fillRect(cx - 4, cy + 7, 8, 14)
        break
      }
      case 'irrigation': {
        c.fillStyle = '#0E5E96'
        c.beginPath(); c.moveTo(cx, cy - 22); c.lineTo(cx - 2, cy - 3); c.lineTo(cx + 2, cy - 3); c.closePath(); c.fill()
        c.fillStyle = '#2980B9'; c.fillRect(cx - 5.5, cy - 3, 11, 20)
        c.fillStyle = '#0E5E96'; c.fillRect(cx - 6.5, cy + 17, 13, 4)
        if (ic && s.isDown) { c.fillStyle = 'rgba(52,152,219,.22)'; c.beginPath(); c.arc(cx, cy, 18, 0, Math.PI * 2); c.fill() }
        break
      }
      case 'scope': {
        c.globalAlpha = .55; c.strokeStyle = '#0288D1'; c.lineWidth = 2.5
        c.beginPath(); c.arc(cx, cy, 35, 0, Math.PI * 2); c.stroke()
        c.strokeStyle = 'rgba(2,136,209,.3)'; c.lineWidth = 1
        c.beginPath(); c.moveTo(cx - 40, cy); c.lineTo(cx + 40, cy)
        c.moveTo(cx, cy - 40); c.lineTo(cx, cy + 40); c.stroke()
        break
      }
    }
    c.restore()
  }

  // ── HUD ──
  // Safety
  c.save()
  c.fillStyle = 'rgba(0,0,0,.48)'; c.fillRect(8, 8, 104, 20)
  c.fillStyle = safety > 50 ? '#5DCAA5' : safety > 25 ? '#F39C12' : '#E74C3C'
  c.fillRect(10, 10, (safety / 100) * 100, 16)
  c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '8px sans-serif'; c.textAlign = 'left'
  c.fillText('🛡 SAFETY', 12, 22); c.restore()

  // Timer
  c.save()
  c.fillStyle = timer <= 10 ? '#C0392B' : 'rgba(0,0,0,.55)'; c.fillRect(CX - 28, 8, 56, 20)
  c.fillStyle = '#fff'; c.font = 'bold 12px monospace'; c.textAlign = 'center'
  c.fillText(`${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`, CX, 22); c.restore()

  // Score
  c.save()
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(CW - 78, 8, 70, 20)
  c.fillStyle = '#FFD700'; c.font = 'bold 11px sans-serif'; c.textAlign = 'right'
  c.fillText(`⭐ ${score}`, CW - 8, 22); c.restore()

  // Smile
  c.save()
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(8, 32, 104, 10)
  const sg = c.createLinearGradient(8, 0, 112, 0)
  sg.addColorStop(0, '#E74C3C'); sg.addColorStop(.5, '#F39C12'); sg.addColorStop(1, '#5DCAA5')
  c.fillStyle = sg; c.fillRect(8, 32, (smile / 100) * 104, 10)
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '7px sans-serif'; c.textAlign = 'left'
  c.fillText('😊 PATIENT', 10, 31); c.restore()

  // Hint
  const hint = !grabbed && loosen < 100
    ? (loosen === 0 ? '⚡ Ultrasonic → hold near fragment' : `⚡ Loosening… ${Math.floor(loosen)}%`)
    : !grabbed ? '🔗 Switch Grabber → click fragment!'
    : '↑  Pull fragment UP carefully!'
  c.save()
  c.fillStyle = 'rgba(8,80,65,.88)'; c.fillRect(CX - 100, CH - 36, 200, 26)
  c.fillStyle = grabbed ? '#5DCAA5' : '#9FE1CB'; c.font = '11px sans-serif'; c.textAlign = 'center'
  c.fillText(hint, CX, CH - 18); c.restore()
}

// ═══════════════ COMPONENT ═══════════════
export default function GamePage() {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const gs     = useRef<GS>({
    cx: CX, cy: -100, fx: CX, fy: 0, grabbed: false, loosen: 0,
    safety: 100, smile: 80, score: 0, timer: 60, flash: 0, zoom: false,
    isDown: false, tool: 'ultrasonic', lvl: LVLS[0],
    debris: [], lastHit: 0, lastBuzz: 0, shake: 0, particles: [],
  })

  const [screen, setScreen] = useState<Screen>('start')
  const [tool,   setTool]   = useState<Tool>('ultrasonic')
  const [lvlId,  setLvlId]  = useState(1)
  const [scores, setScores] = useState<Record<number, number>>({})
  const [endScore, setEndScore] = useState(0)

  useEffect(() => { gs.current.tool = tool }, [tool])

  useEffect(() => {
    try { const s = localStorage.getItem('ml_gs'); if (s) setScores(JSON.parse(s)) } catch {}
  }, [])

  function saveScr(lvl: number, sc: number) {
    setScores(p => {
      const n = { ...p, [lvl]: Math.max(p[lvl] || 0, sc) }
      try { localStorage.setItem('ml_gs', JSON.stringify(n)) } catch {}
      return n
    })
  }

  const startLevel = useCallback((id: number) => {
    const l = LVLS[id - 1]
    const fy = CT + CHLEN * l.ft
    const fx = ccx(fy, l.cv)
    const db: Db[] = []
    for (let i = 0; i < l.db; i++) {
      const t = .15 + (i / Math.max(l.db, 1)) * .45
      const dy = CT + CHLEN * t
      db.push({ x: ccx(dy, l.cv) + (Math.random() - .5) * l.w * .35, y: dy, gone: false })
    }
    const s = gs.current
    Object.assign(s, {
      cx: CX, cy: -100, fx, fy, grabbed: false, loosen: 0, safety: 100,
      smile: 80, score: 0, timer: l.sec, flash: 0, zoom: false,
      isDown: false, tool: 'ultrasonic', lvl: l, debris: db,
      lastHit: 0, lastBuzz: 0, shake: 0, particles: [],
    })
    setTool('ultrasonic'); setLvlId(id); setScreen('game')
  }, [])

  // ── GAME LOOP ──
  useEffect(() => {
    if (screen !== 'game') { cancelAnimationFrame(rafRef.current); return }
    const cv = cvRef.current; if (!cv) return
    const ctxRaw = cv.getContext('2d'); if (!ctxRaw) return
    const ctx = ctxRaw
    let last = performance.now(), tacc = 0

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, .1); last = now
      const s = gs.current

      // Timer
      if (s.timer > 0) { tacc += dt; if (tacc >= 1) { tacc -= 1; s.timer-- } }
      if (s.timer <= 0) { setEndScore(s.score); saveScr(s.lvl.id, s.score); sfx.lose(); setScreen('lose'); return }

      // Score
      if (s.grabbed) s.score += Math.floor(dt * 6)
      if (s.flash  > 0) s.flash  = Math.max(0, s.flash  - dt * 3)
      if (s.shake  > 0) s.shake  = Math.max(0, s.shake  - dt * 4)

      // Particles
      for (const p of s.particles) {
        if (p.life <= 0) continue
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt * 1.5
      }
      s.particles = s.particles.filter(p => p.life > 0)

      const ic = inC(s.cx, s.cy, s.lvl.w, s.lvl.cv)

      // Irrigation
      if (s.tool === 'irrigation' && ic && s.isDown) {
        for (const d of s.debris) {
          if (!d.gone && d2(s.cx, s.cy, d.x, d.y) < 22) {
            d.gone = true; s.score += 15; sfx.irr()
            for (let i = 0; i < 8; i++) s.particles.push({
              x: d.x, y: d.y,
              vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 80,
              life: 1, color: `hsl(${200 + Math.random() * 40},80%,60%)`
            })
          }
        }
      }

      s.zoom = s.tool === 'scope'

      // Wall collision
      if (s.cy >= CT && s.cy <= CB && !ic) {
        const now2 = Date.now()
        if (now2 - s.lastHit > 280) {
          s.safety = Math.max(0, s.safety - 8)
          s.smile  = Math.max(0, s.smile  - 5)
          s.flash = 1; s.lastHit = now2; sfx.wall()
        }
        if (s.safety <= 0) { setEndScore(s.score); saveScr(s.lvl.id, s.score); sfx.lose(); setScreen('lose'); return }
      }

      // Ultrasonic loosen
      if (s.tool === 'ultrasonic' && ic && s.isDown && d2(s.cx, s.cy, s.fx, s.fy) < 34 && s.loosen < 100) {
        s.loosen = Math.min(100, s.loosen + dt * 38)
        s.shake  = Math.min(1, s.shake + dt * 2)
        s.score += Math.floor(dt * 2)
        const now2 = Date.now()
        if (now2 - s.lastBuzz > 160) { sfx.buzz(); s.lastBuzz = now2 }
        if (s.loosen >= 100) {
          for (let i = 0; i < 12; i++) s.particles.push({
            x: s.fx, y: s.fy,
            vx: (Math.random() - .5) * 180, vy: -80 - Math.random() * 120,
            life: 1, color: `hsl(${150 + Math.random() * 30},80%,60%)`
          })
        }
      }

      // Fragment follows cursor when grabbed
      if (s.grabbed) {
        s.fx += (s.cx - s.fx) * .75
        s.fy += (s.cy - s.fy) * .75
        if (s.fy < CT - 15) {
          const bonus = s.timer * 8 + Math.floor(s.safety * 3) + Math.floor(s.smile * 2)
          s.score += bonus
          // Win particles
          for (let i = 0; i < 30; i++) s.particles.push({
            x: s.fx, y: s.fy,
            vx: (Math.random() - .5) * 300, vy: -150 - Math.random() * 200,
            life: 1, color: `hsl(${Math.random() * 60 + 30},90%,60%)`
          })
          setEndScore(s.score); saveScr(s.lvl.id, s.score); sfx.win(); setScreen('win'); return
        }
      }

      draw(ctx, s, now)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen])

  // ── INPUT ──
  function coords(e: React.MouseEvent | React.TouchEvent): [number, number] {
    const cv = cvRef.current; if (!cv) return [0, 0]
    const r = cv.getBoundingClientRect()
    const sx = CW / r.width, sy = CH / r.height
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return [(t.clientX - r.left) * sx, (t.clientY - r.top) * sy]
    }
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy]
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (screen !== 'game') return; e.preventDefault()
    const [x, y] = coords(e); gs.current.cx = x; gs.current.cy = y
  }
  function onDown(e: React.MouseEvent | React.TouchEvent) {
    if (screen !== 'game') return; e.preventDefault()
    const [x, y] = coords(e); const s = gs.current
    s.cx = x; s.cy = y; s.isDown = true
    if (s.tool === 'grabber' && s.loosen >= 100 && !s.grabbed) {
      if (d2(x, y, s.fx, s.fy) < 24) { s.grabbed = true; s.score += 50; sfx.grab() }
    }
  }
  function onUp() { gs.current.isDown = false }

  function stars(sc: number, l: Lvl) {
    if (sc >= l.sec * 22) return 3; if (sc >= l.sec * 13) return 2; if (sc >= l.sec * 5) return 1; return 0
  }

  // ── STYLE HELPERS ──
  const btnStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: '#085041', color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'opacity .15s', ...extra,
  })
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'rgba(255,255,255,.96)', borderRadius: 20, padding: 28,
    border: '.5px solid rgba(0,0,0,.08)', ...extra,
  })

  // ══════════════════════════════════════════
  // START SCREEN
  // ══════════════════════════════════════════
  if (screen === 'start') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0B3528 0%,#085041 50%,#0A6655 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
      <div style={card({ maxWidth: 400, width: '100%', textAlign: 'center' })}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ width: 76, height: 76, background: 'linear-gradient(135deg,#085041,#0A6655)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 38, boxShadow: '0 10px 28px rgba(8,80,65,.32)' }}>🦷</div>
          <p style={{ fontSize: 10, color: '#085041', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 6 }}>Medical Line Georgia × Eighteeth®</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.2 }}>Broken File Rescue</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Endodontic Arcade Challenge</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg,#EBF5FB,#D6EAF8)', borderRadius: 14, padding: '14px 16px', marginBottom: 22, textAlign: 'left' }}>
          <p style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.8, margin: 0 }}>
            🔬 A file fragment is stuck in the root canal.<br />
            ⚡ Loosen it with ultrasonic energy.<br />
            🔗 Grab it and pull it out carefully!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={btnStyle()} onClick={() => startLevel(1)}>▶ Play Now</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnStyle({ flex: 1, background: 'transparent', color: '#085041', border: '1.5px solid #085041', padding: '10px' })} onClick={() => setScreen('howto')}>📖 How to Play</button>
            <button style={btnStyle({ flex: 1, background: 'transparent', color: '#085041', border: '1.5px solid #085041', padding: '10px' })} onClick={() => setScreen('levels')}>🎯 Levels</button>
          </div>
        </div>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(0,0,0,.07)', display: 'flex', justifyContent: 'center', gap: 28 }}>
          {[
            { label: 'Best Score', val: scores && Object.values(scores).length ? Math.max(0, ...Object.values(scores)) : 0 },
            { label: 'Completed', val: `${Object.keys(scores).length}/5` },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#085041', margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: '#ccc', marginTop: 18 }}>Powered by Eighteeth® Endodontic Technology</p>
      </div>
    </div>
  )

  // ══════════════════════════════════════════
  // HOW TO PLAY
  // ══════════════════════════════════════════
  if (screen === 'howto') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0B3528,#085041)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
      <div style={card({ maxWidth: 400, width: '100%' })}>
        <button onClick={() => setScreen('start')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, padding: '0 0 14px', display: 'block' }}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 18 }}>How to Play</h2>
        {[
          { icon: '⚡', title: '1. Loosen the Fragment', text: 'Select the Ultrasonic tool. Navigate into the canal and hold near the broken fragment until the progress ring fills 100%.' },
          { icon: '🔗', title: '2. Grab It', text: 'Switch to the Grabber tool. Click precisely on the fragment to latch onto it.' },
          { icon: '↑', title: '3. Extract Carefully', text: 'Drag the fragment slowly upward through the canal. Avoid touching the walls or the fragment will slip!' },
          { icon: '💧', title: 'Bonus: Irrigation', text: 'Clear debris particles for extra points. Helps visibility too.' },
          { icon: '🔬', title: 'Scope Mode', text: 'Activates a magnification zoom around the fragment for precision work on harder levels.' },
        ].map(item => (
          <div key={item.icon} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14, background: '#f8f8f6', borderRadius: 12, padding: '12px 14px' }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 3, margin: '0 0 3px' }}>{item.title}</p>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 }}>{item.text}</p>
            </div>
          </div>
        ))}
        <button style={btnStyle({ width: '100%', marginTop: 6 })} onClick={() => startLevel(1)}>▶ Start Playing</button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════
  // LEVEL SELECT
  // ══════════════════════════════════════════
  if (screen === 'levels') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0B3528,#085041)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
      <div style={card({ maxWidth: 400, width: '100%' })}>
        <button onClick={() => setScreen('start')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, padding: '0 0 14px', display: 'block' }}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 18 }}>Select Level</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LVLS.map(l => {
            const sc = scores[l.id] || 0
            const st = stars(sc, l)
            return (
              <button key={l.id} onClick={() => startLevel(l.id)}
                style={{ background: '#f5f5f0', border: '.5px solid rgba(0,0,0,.09)', borderRadius: 14, padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', transition: 'all .2s' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                  {l.id}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 2px' }}>{l.name}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{l.sub} · {l.sec}s</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, color: '#F39C12', margin: '0 0 2px' }}>{'★'.repeat(st)}{'☆'.repeat(3 - st)}</p>
                  {sc > 0 && <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>{sc} pts</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════
  // WIN SCREEN
  // ══════════════════════════════════════════
  if (screen === 'win') {
    const l = LVLS[lvlId - 1]
    const st = stars(endScore, l)
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0A4030,#085041,#0A6655)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
        <div style={card({ maxWidth: 400, width: '100%', textAlign: 'center' })}>
          <div style={{ fontSize: 68, marginBottom: 10 }}>🏆</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#085041', margin: '0 0 4px' }}>Canal Saved!</h1>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 22 }}>Flawless endodontic technique!</p>

          <div style={{ background: 'linear-gradient(135deg,#085041,#0A6655)', borderRadius: 18, padding: 22, marginBottom: 20, color: '#fff' }}>
            <p style={{ fontSize: 12, color: '#9FE1CB', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Final Score</p>
            <p style={{ fontSize: 52, fontWeight: 800, margin: '0 0 6px' }}>{endScore}</p>
            <p style={{ fontSize: 22, color: '#FFD700', margin: 0 }}>{'★'.repeat(st)}{'☆'.repeat(3 - st)}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            {[
              { icon: '🎯', label: 'Precision Doctor', got: endScore > 200 },
              { icon: '🏅', label: 'Eighteeth Rescue Master', got: endScore > 400 },
            ].map(b => (
              <div key={b.label} style={{ background: b.got ? '#E1F5EE' : '#f5f5f0', borderRadius: 14, padding: '12px 10px', border: b.got ? '1px solid #5DCAA5' : 'none' }}>
                <p style={{ fontSize: 22, margin: '0 0 5px' }}>{b.icon}</p>
                <p style={{ fontSize: 11, color: b.got ? '#085041' : '#ccc', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{b.label}</p>
                {b.got && <p style={{ fontSize: 10, color: '#5DCAA5', margin: '4px 0 0' }}>✓ Earned!</p>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {lvlId < 5 && <button style={btnStyle()} onClick={() => startLevel(lvlId + 1)}>Next Level →</button>}
            <button style={btnStyle({ background: '#0A5848' })} onClick={() => startLevel(lvlId)}>↩ Replay</button>
            <button style={btnStyle({ background: 'transparent', color: '#085041', border: '1.5px solid #085041' })} onClick={() => setScreen('levels')}>🎯 All Levels</button>
          </div>

          <p style={{ fontSize: 10, color: '#ccc', marginTop: 18 }}>Medical Line Georgia · Official Eighteeth® Partner</p>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // LOSE SCREEN
  // ══════════════════════════════════════════
  if (screen === 'lose') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#3A0E0E,#5C1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
      <div style={card({ maxWidth: 400, width: '100%', textAlign: 'center' })}>
        <div style={{ fontSize: 64, marginBottom: 10 }}>😬</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#C0392B', margin: '0 0 4px' }}>Canal Compromised</h1>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 22 }}>The fragment wasn't retrieved.<br />Practice and try again!</p>

        <div style={{ background: '#f8f8f6', borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Score</p>
          <p style={{ fontSize: 44, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{endScore}</p>
        </div>

        <div style={{ background: '#EBF5FB', borderRadius: 14, padding: 16, marginBottom: 22, textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>💡 Tips for next attempt:</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#555', lineHeight: 2 }}>
            <li>Move slowly through curved sections</li>
            <li>Use Scope 🔬 for precision on deep fragments</li>
            <li>Fully loosen before switching to Grabber</li>
            <li>Keep cursor centered in the canal</li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button style={btnStyle({ background: '#C0392B' })} onClick={() => startLevel(lvlId)}>↩ Try Again</button>
          <button style={btnStyle({ background: 'transparent', color: '#888', border: '1px solid #ddd' })} onClick={() => setScreen('start')}>← Main Menu</button>
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════
  // GAME SCREEN
  // ══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#15232F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, padding: '8px 10px', background: 'rgba(255,255,255,.07)', borderRadius: 16 }}>
        {([
          { id: 'ultrasonic', icon: '⚡', label: 'Ultrasonic' },
          { id: 'grabber',    icon: '🔗', label: 'Grabber' },
          { id: 'irrigation', icon: '💧', label: 'Irrigate' },
          { id: 'scope',      icon: '🔬', label: 'Scope' },
        ] as { id: Tool; icon: string; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTool(t.id)}
            style={{ background: tool === t.id ? '#085041' : 'rgba(255,255,255,.08)', border: tool === t.id ? '1px solid #5DCAA5' : '1px solid transparent', borderRadius: 10, padding: '8px 12px', color: tool === t.id ? '#fff' : 'rgba(255,255,255,.65)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 58, transition: 'all .18s' }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: .5 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.55)', cursor: 'none' }}>
        <canvas ref={cvRef} width={CW} height={CH}
          style={{ display: 'block', maxWidth: 'min(380px,96vw)', height: 'auto', touchAction: 'none' }}
          onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchMove={onMove} onTouchStart={onDown} onTouchEnd={onUp}
        />
      </div>

      {/* Level info */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 18, color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
        <span>Level {lvlId}: {LVLS[lvlId - 1].name}</span>
        <button onClick={() => setScreen('start')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', fontSize: 11 }}>✕ Quit</button>
      </div>
    </div>
  )
}

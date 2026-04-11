"use client"
import { useState, useRef, useEffect, useCallback } from "react"

type Phase = "start" | "cases" | "brief" | "file_pick" | "device" | "canal" | "rinse" | "result"

interface NiTiFile {
  id: string
  name: string
  taper: string
  size: number
  maxTorque: number
  rpm: number
  color: string
  order: number
}

interface ClinicalCase {
  id: string
  tooth: string
  diagnosis: string
  wl: number
  canals: number
  curvature: "straight" | "moderate" | "severe"
  desc: string
  difficulty: number
}

const FILES: NiTiFile[] = [
  { id: "gp", name: "GP",  taper: ".03", size: 15, maxTorque: 1.0, rpm: 350, color: "#FFD700", order: 1 },
  { id: "s1", name: "S1",  taper: ".04", size: 19, maxTorque: 2.0, rpm: 300, color: "#9B59B6", order: 2 },
  { id: "s2", name: "S2",  taper: ".06", size: 21, maxTorque: 2.0, rpm: 300, color: "#95A5A6", order: 3 },
  { id: "f1", name: "F1",  taper: ".07", size: 20, maxTorque: 1.5, rpm: 250, color: "#F1C40F", order: 4 },
  { id: "f2", name: "F2",  taper: ".08", size: 25, maxTorque: 1.5, rpm: 250, color: "#E74C3C", order: 5 },
  { id: "f3", name: "F3",  taper: ".09", size: 30, maxTorque: 1.5, rpm: 250, color: "#3498DB", order: 6 },
]

const CASES: ClinicalCase[] = [
  { id: "c1", tooth: "#21", diagnosis: "Pulpitis Irreversibilis",  wl: 23, canals: 1, curvature: "straight", desc: "ზედა მარცხენა ცენტრალური საჭრელი. მწვავე ტკივილი. 23მმ სამუშაო სიგრძე.", difficulty: 1 },
  { id: "c2", tooth: "#35", diagnosis: "Necrosis Pulpae",          wl: 20, canals: 2, curvature: "moderate", desc: "ქვედა მარცხენა პრემოლარი. 2 არხი. ზომიერი მოხრილობა. 20მმ.", difficulty: 2 },
  { id: "c3", tooth: "#16", diagnosis: "Periodontitis Apicalis",   wl: 19, canals: 4, curvature: "moderate", desc: "ზედა მარჯვენა პირველი მოლარი. 4 არხი (MB1, MB2, DB, P). 19მმ.", difficulty: 3 },
  { id: "c4", tooth: "#36", diagnosis: "Pulpitis Irreversibilis",  wl: 18, canals: 3, curvature: "severe",   desc: "ქვედა მარჯვენა პირველი მოლარი. 3 არხი. მძიმე მოხრილობა 45. 18მმ.", difficulty: 4 },
  { id: "c5", tooth: "#45", diagnosis: "Retreatment",              wl: 21, canals: 1, curvature: "moderate", desc: "ქვედა მარჯვენა პრემოლარი. გადამუშავება. ძველი მასალის მოშორება. 21მმ.", difficulty: 5 },
]

const WRONG_CHOICES: NiTiFile[][] = [
  [FILES[3], FILES[1], FILES[4], FILES[0]],
  [FILES[2], FILES[0], FILES[5], FILES[3]],
  [FILES[1], FILES[4], FILES[0], FILES[2]],
  [FILES[5], FILES[2], FILES[3], FILES[1]],
  [FILES[4], FILES[3], FILES[1], FILES[5]],
  [FILES[0], FILES[5], FILES[2], FILES[4]],
]

export default function GamePage() {
  const [phase, setPhase] = useState<Phase>("start")
  const [selectedCase, setSelectedCase] = useState<ClinicalCase | null>(null)
  const [fileIndex, setFileIndex] = useState(0)
  const [torque, setTorque] = useState(1.5)
  const [rpm, setRpm] = useState(300)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [fileChoices, setFileChoices] = useState<NiTiFile[]>([])
  const [chosenFile, setChosenFile] = useState<NiTiFile | null>(null)
  const [deviceOk, setDeviceOk] = useState(false)
  const [canalProgress, setCanalProgress] = useState(0)
  const [apexReached, setApexReached] = useState(false)
  const [broken, setBroken] = useState(false)
  const [fileScores, setFileScores] = useState<number[]>([])
  const [shake, setShake] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const progressRef = useRef(0)
  const brokenRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const currentFile = FILES[fileIndex]

  function beep(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type; osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(); osc.stop(ctx.currentTime + dur)
    } catch { /* ignore */ }
  }

  function makeChoices(correct: NiTiFile) {
    const wrongs = WRONG_CHOICES[correct.order - 1].filter(f => f.id !== correct.id).slice(0, 3)
    const all = [correct, ...wrongs].sort(() => Math.random() - 0.5)
    setFileChoices(all)
  }

  function startCase(c: ClinicalCase) {
    setSelectedCase(c)
    setFileIndex(0)
    setScore(0)
    setMistakes(0)
    setFileScores([])
    setCanalProgress(0)
    setApexReached(false)
    setBroken(false)
    brokenRef.current = false
    progressRef.current = 0
    setPhase("brief")
  }

  function goFilePick() {
    makeChoices(FILES[fileIndex])
    setChosenFile(null)
    setDeviceOk(false)
    setPhase("file_pick")
  }

  function pickFile(f: NiTiFile) {
    setChosenFile(f)
    if (f.id === FILES[fileIndex].id) {
      beep(880, 0.15)
    } else {
      beep(200, 0.3, "square")
      setMistakes(m => m + 1)
    }
  }

  function confirmFile() {
    if (!chosenFile) return
    if (chosenFile.id !== FILES[fileIndex].id) {
      setShake(true); setTimeout(() => setShake(false), 500)
      return
    }
    setTorque(currentFile.maxTorque)
    setRpm(currentFile.rpm)
    setPhase("device")
  }

  function checkDevice() {
    const correct = FILES[fileIndex]
    const torqueOk = Math.abs(torque - correct.maxTorque) <= 0.3
    const rpmOk = Math.abs(rpm - correct.rpm) <= 50
    if (torqueOk && rpmOk) {
      setDeviceOk(true)
      beep(660, 0.2)
    } else {
      beep(220, 0.4, "sawtooth")
      setMistakes(m => m + 1)
    }
    return torqueOk && rpmOk
  }

  function startCanal() {
    if (!deviceOk) { checkDevice(); return }
    progressRef.current = 0
    brokenRef.current = false
    setCanalProgress(0)
    setApexReached(false)
    setBroken(false)
    setPhase("canal")
  }

  const drawCanal = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctxRaw = cv.getContext("2d")
    if (!ctxRaw) return
    const ctx = ctxRaw
    const W = cv.width, H = cv.height
    const prog = progressRef.current
    const file = FILES[fileIndex]
    const cas = selectedCase

    ctx.fillStyle = "#0a0e1a"
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = "rgba(0,255,150,0.04)"
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    if (!cas) return

    const cx = W / 2, rootTop = 60, rootBot = H - 80
    const rootH = rootBot - rootTop

    const pts: [number, number][] = []
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      let x = cx
      if (cas.curvature === "moderate") x += Math.sin(t * Math.PI) * 18
      if (cas.curvature === "severe")   x += Math.sin(t * Math.PI * 1.5) * 28
      const y = rootTop + t * rootH
      pts.push([x, y])
    }

    ctx.save()
    ctx.shadowColor = "rgba(0,255,150,0.3)"
    ctx.shadowBlur = 12
    ctx.strokeStyle = "rgba(150,220,180,0.6)"
    ctx.lineWidth = 28
    ctx.beginPath()
    pts.forEach(([px, py], idx) => idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.stroke()
    ctx.restore()

    ctx.strokeStyle = "rgba(200,240,220,0.25)"
    ctx.lineWidth = 8
    ctx.beginPath()
    pts.forEach(([px, py], idx) => idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.stroke()

    ctx.strokeStyle = "#0a0e1a"
    ctx.lineWidth = 6
    ctx.beginPath()
    pts.forEach(([px, py], idx) => idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.stroke()

    const progSteps = Math.floor(prog * steps)
    if (progSteps > 0) {
      const grad = ctx.createLinearGradient(cx, rootTop, cx, rootTop + prog * rootH)
      grad.addColorStop(0, "rgba(255,200,0,0.8)")
      grad.addColorStop(1, "rgba(255,100,0,0.4)")
      ctx.strokeStyle = grad
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i <= progSteps && i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i][0], pts[i][1])
        else ctx.lineTo(pts[i][0], pts[i][1])
      }
      ctx.stroke()
    }

    if (!brokenRef.current && progSteps < pts.length) {
      const tip = pts[Math.min(progSteps, pts.length - 1)]
      const angle = Date.now() / 50
      ctx.save()
      ctx.translate(tip[0], tip[1])
      ctx.rotate(angle)
      ctx.strokeStyle = file.color
      ctx.lineWidth = 2
      ctx.shadowColor = file.color
      ctx.shadowBlur = 8
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI * 2 / 3)
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.stroke()
      }
      ctx.restore()
    }

    if (brokenRef.current) {
      ctx.fillStyle = "#ff0000"
      ctx.font = "bold 16px monospace"
      ctx.fillText("FILE SEPARATED!", W / 2 - 70, H / 2)
    }

    ctx.fillStyle = "rgba(0,0,0,0.5)"
    ctx.fillRect(W - 30, rootTop, 16, rootH)
    const depthH = prog * rootH
    const depthGrad = ctx.createLinearGradient(0, rootTop, 0, rootTop + rootH)
    depthGrad.addColorStop(0, "#00ff88")
    depthGrad.addColorStop(0.8, "#ffcc00")
    depthGrad.addColorStop(1, "#ff4400")
    ctx.fillStyle = depthGrad
    ctx.fillRect(W - 30, rootTop + rootH - depthH, 16, depthH)
    ctx.strokeStyle = "rgba(0,255,150,0.4)"
    ctx.lineWidth = 1
    ctx.strokeRect(W - 30, rootTop, 16, rootH)

    ctx.fillStyle = "rgba(0,20,10,0.85)"
    ctx.strokeStyle = "rgba(0,255,100,0.4)"
    ctx.lineWidth = 1
    ctx.fillRect(8, 8, 140, 50)
    ctx.strokeRect(8, 8, 140, 50)
    ctx.fillStyle = "rgba(0,255,100,0.6)"
    ctx.font = "10px monospace"
    ctx.fillText("APEX LOCATOR", 16, 22)
    ctx.font = "bold 18px monospace"
    ctx.fillStyle = prog > 0.92 ? "#00ff44" : prog > 0.75 ? "#ffee00" : "#ff6600"
    ctx.fillText((prog * cas.wl).toFixed(1) + " / " + cas.wl + "mm", 16, 46)
  }, [fileIndex, selectedCase])

  useEffect(() => {
    if (phase !== "canal") { cancelAnimationFrame(animRef.current); return }

    let lastTime = 0
    function loop(ts: number) {
      const dt = ts - lastTime; lastTime = ts
      if (dt < 500 && !brokenRef.current) {
        const riskFactor = torque > currentFile.maxTorque * 1.2 || rpm > currentFile.rpm * 1.3 ? 0.003 : 0
        if (Math.random() < riskFactor) {
          brokenRef.current = true
          setBroken(true)
          beep(100, 1, "sawtooth", 0.5)
        }
        progressRef.current = Math.min(progressRef.current + 0.0004 * dt, 1)
        setCanalProgress(progressRef.current)
        if (progressRef.current >= 1 && !apexReached) {
          setApexReached(true)
          beep(880, 0.1)
          setTimeout(() => beep(1100, 0.15), 120)
          setTimeout(() => beep(1320, 0.2), 260)
        }
      }
      drawCanal()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, drawCanal, torque, rpm, currentFile, apexReached])

  function finishCanal() {
    cancelAnimationFrame(animRef.current)
    if (broken) {
      setMistakes(m => m + 2)
      setFileScores(fs => [...fs, 0])
    } else if (apexReached) {
      const s = Math.max(10, 30 - mistakes * 5)
      setScore(sc => sc + s)
      setFileScores(fs => [...fs, s])
    }
    setPhase("rinse")
  }

  function nextFile() {
    if (fileIndex + 1 >= FILES.length) {
      setPhase("result")
    } else {
      setFileIndex(i => i + 1)
      progressRef.current = 0
      brokenRef.current = false
      setCanalProgress(0)
      setApexReached(false)
      setBroken(false)
      goFilePick()
    }
  }

  const st: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#060a14", color: "#e0ffe0", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" },
    card: { background: "rgba(0,20,10,0.9)", border: "1px solid rgba(0,255,100,0.3)", borderRadius: "12px", padding: "32px", maxWidth: "680px", width: "100%", boxShadow: "0 0 40px rgba(0,255,100,0.08)" },
    title: { fontSize: "26px", fontWeight: "bold", color: "#00ff88", marginBottom: "8px", textShadow: "0 0 20px rgba(0,255,136,0.5)" },
    sub: { fontSize: "13px", color: "rgba(0,255,100,0.6)", marginBottom: "24px" },
    btn: { background: "linear-gradient(135deg,#00cc66,#008844)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace" },
    btnGray: { background: "rgba(50,80,60,0.6)", color: "#aaffcc", border: "1px solid rgba(0,255,100,0.2)", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", cursor: "pointer", fontFamily: "monospace" },
    row: { display: "flex", gap: "12px", flexWrap: "wrap" },
    label: { fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "4px" },
    val: { fontSize: "22px", fontWeight: "bold", color: "#00ff88" },
    sep: { height: "1px", background: "rgba(0,255,100,0.15)", margin: "20px 0" },
  }

  if (phase === "start") return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "13px", color: "rgba(0,255,100,0.5)", marginBottom: "8px", letterSpacing: "3px" }}>EIGHTEETH</div>
          <div style={{ ...st.title, fontSize: "32px" }}>E-Connect Pro</div>
          <div style={{ fontSize: "14px", color: "rgba(0,255,100,0.6)", marginTop: "4px" }}>ენდოდონტიური სიმულატორი</div>
          <div style={st.sep} />
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "24px" }}>
            {["RODIN NiTi", "Apex Locator", "Auto Torque"].map(f => (
              <div key={f} style={{ textAlign: "center" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,255,100,0.1)", border: "1px solid rgba(0,255,100,0.3)", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>+</div>
                <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.6)" }}>{f}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "rgba(0,255,100,0.6)", marginBottom: "24px", lineHeight: "1.8" }}>
          სკოლა, პრაქტიკა, RODIN NiTi სისტემა. 5 კლინიკური ქეისი. სწორი ფაილი, სწორი პარამეტრი, სწორი ტექნიკა.
        </div>
        <div style={{ textAlign: "center" }}>
          <button style={st.btn} onClick={() => setPhase("cases")}>დაწყება</button>
        </div>
      </div>
    </div>
  )

  if (phase === "cases") return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.title}>ქეისის არჩევა</div>
        <div style={st.sub}>აირჩიეთ კლინიკური სიტუაცია</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {CASES.map(c => (
            <button key={c.id} onClick={() => startCase(c)} style={{ background: "rgba(0,30,15,0.8)", border: "1px solid rgba(0,255,100,0.2)", borderRadius: "10px", padding: "16px", cursor: "pointer", textAlign: "left", fontFamily: "monospace" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#00ff88", fontWeight: "bold", fontSize: "16px" }}>{c.tooth} - {c.diagnosis}</span>
                <span style={{ color: "rgba(0,255,100,0.5)", fontSize: "12px" }}>{"*".repeat(c.difficulty)}{".".repeat(5 - c.difficulty)}</span>
              </div>
              <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.6)", lineHeight: "1.6" }}>{c.desc}</div>
              <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.4)", marginTop: "6px" }}>WL: {c.wl}mm | {c.canals} arxi | {c.curvature === "straight" ? "pirdapiri" : c.curvature === "moderate" ? "zomieri" : "mdzime"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (phase === "brief" && selectedCase) return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "4px" }}>კლინიკური ბრიფინგი</div>
        <div style={st.title}>{selectedCase.tooth} - {selectedCase.diagnosis}</div>
        <div style={st.sep} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[
            ["კბილი", selectedCase.tooth],
            ["სამუშაო სიგრძე", selectedCase.wl + "mm"],
            ["არხების რაოდენობა", selectedCase.canals.toString()],
            ["მოხრილობა", selectedCase.curvature === "straight" ? "პირდაპირი" : selectedCase.curvature === "moderate" ? "ზომიერი" : "მძიმე"],
            ["სირთულე", "*".repeat(selectedCase.difficulty)],
            ["ფაილ სისტემა", "RODIN NiTi"],
          ].map(([l, v]) => (
            <div key={l} style={{ background: "rgba(0,20,10,0.6)", border: "1px solid rgba(0,255,100,0.15)", borderRadius: "8px", padding: "12px" }}>
              <div style={st.label}>{l}</div>
              <div style={{ ...st.val, fontSize: "16px" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "13px", color: "rgba(0,255,100,0.7)", lineHeight: "1.8", marginBottom: "24px" }}>{selectedCase.desc}</div>
        <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "20px" }}>
          გამოიყენეთ RODIN NiTi სრული სეკვენცია: GP - S1 - S2 - F1 - F2 - F3
        </div>
        <div style={st.row}>
          <button style={st.btn} onClick={goFilePick}>ოპერაციის დაწყება</button>
          <button style={st.btnGray} onClick={() => setPhase("cases")}>უკან</button>
        </div>
      </div>
    </div>
  )

  if (phase === "file_pick") return (
    <div style={{ ...st.page, ...(shake ? { animation: "shake 0.4s" } : {}) }}>
      <style>{"@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}"}</style>
      <div style={st.card}>
        <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "4px" }}>ნაბიჯი {fileIndex + 1} / {FILES.length} - ფაილის არჩევა</div>
        <div style={st.title}>რომელი ფაილია შემდეგი?</div>
        <div style={st.sub}>RODIN NiTi - {currentFile.name} ({currentFile.size}/{currentFile.taper})</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {fileChoices.map(f => (
            <button key={f.id} onClick={() => pickFile(f)} style={{
              background: chosenFile?.id === f.id ? (f.id === FILES[fileIndex].id ? "rgba(0,80,40,0.9)" : "rgba(80,0,0,0.9)") : "rgba(0,20,10,0.8)",
              border: `2px solid ${chosenFile?.id === f.id ? (f.id === FILES[fileIndex].id ? "#00ff88" : "#ff4444") : "rgba(0,255,100,0.2)"}`,
              borderRadius: "10px", padding: "16px", cursor: "pointer", fontFamily: "monospace", textAlign: "left"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                <span style={{ color: "#00ff88", fontWeight: "bold", fontSize: "18px" }}>{f.name}</span>
              </div>
              <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.6)" }}>#{f.size} / {f.taper}</div>
              <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.5)" }}>{f.maxTorque}Ncm | {f.rpm}RPM</div>
            </button>
          ))}
        </div>
        <div style={st.row}>
          <button style={st.btn} onClick={confirmFile}>დადასტურება</button>
          {mistakes > 0 && <span style={{ color: "#ff6666", fontSize: "13px", alignSelf: "center" }}>შეცდომები: {mistakes}</span>}
        </div>
      </div>
    </div>
  )

  if (phase === "device" && chosenFile) return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "4px" }}>E-Connect Pro - პარამეტრების დაყენება</div>
        <div style={st.title}>{currentFile.name} - {currentFile.size}/{currentFile.taper}</div>
        <div style={st.sep} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
          <div>
            <div style={st.label}>TORQUE (Ncm)</div>
            <div style={{ ...st.val, color: Math.abs(torque - currentFile.maxTorque) <= 0.3 ? "#00ff88" : "#ff6666" }}>{torque.toFixed(1)}</div>
            <input type="range" min="0.5" max="4.0" step="0.1" value={torque} onChange={e => setTorque(Number(e.target.value))} style={{ width: "100%", marginTop: "8px", accentColor: "#00ff88" }} />
            <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.4)", marginTop: "4px" }}>სწორი: {currentFile.maxTorque.toFixed(1)} Ncm</div>
          </div>
          <div>
            <div style={st.label}>SPEED (RPM)</div>
            <div style={{ ...st.val, color: Math.abs(rpm - currentFile.rpm) <= 50 ? "#00ff88" : "#ff6666" }}>{rpm}</div>
            <input type="range" min="100" max="600" step="10" value={rpm} onChange={e => setRpm(Number(e.target.value))} style={{ width: "100%", marginTop: "8px", accentColor: "#00ff88" }} />
            <div style={{ fontSize: "11px", color: "rgba(0,255,100,0.4)", marginTop: "4px" }}>სწორი: {currentFile.rpm} RPM</div>
          </div>
        </div>
        <div style={{ background: "rgba(0,20,10,0.6)", border: "1px solid rgba(0,255,100,0.15)", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "12px", color: "rgba(0,255,100,0.6)" }}>
          {deviceOk ? "პარამეტრები სწორია - მზადაა!" : "პარამეტრები დააყენეთ ფაილის სპეციფიკაციის მიხედვით"}
        </div>
        <div style={st.row}>
          <button style={st.btn} onClick={deviceOk ? startCanal : checkDevice}>{deviceOk ? "არხის დამუშავება" : "შემოწმება"}</button>
        </div>
      </div>
    </div>
  )

  if (phase === "canal") return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ fontSize: "12px", color: "rgba(0,255,100,0.5)", marginBottom: "8px" }}>
          {currentFile.name} - კანალის ინსტრუმენტირება
        </div>
        <canvas ref={canvasRef} width={560} height={400} style={{ width: "100%", borderRadius: "8px", border: "1px solid rgba(0,255,100,0.2)", display: "block" }} />
        <div style={{ display: "flex", gap: "16px", marginTop: "16px", fontSize: "13px" }}>
          <span style={{ color: apexReached ? "#00ff88" : "rgba(0,255,100,0.5)" }}>
            {apexReached ? "Apex მიღწეული!" : broken ? "ფაილი მოტყდა!" : `${(canalProgress * (selectedCase?.wl || 20)).toFixed(1)}mm / ${selectedCase?.wl}mm`}
          </span>
          <span style={{ marginLeft: "auto", color: broken ? "#ff4444" : "rgba(0,255,100,0.5)" }}>
            {broken ? "FILE SEPARATED" : `${Math.round(canalProgress * 100)}%`}
          </span>
        </div>
        {(apexReached || broken) && (
          <div style={{ marginTop: "16px" }}>
            <button style={st.btn} onClick={finishCanal}>
              {broken ? "შემდეგი (ფაილი მოტყდა)" : "ზემრეცხვა"}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (phase === "rinse") return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.title}>ირიგაცია</div>
        <div style={st.sep} />
        <div style={{ fontSize: "13px", color: "rgba(0,255,100,0.7)", lineHeight: "2", marginBottom: "20px" }}>
          <div>5.25% NaOCl - 2ml</div>
          <div>17% EDTA - 1ml</div>
          <div>გამოვლება - 2ml</div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "rgba(0,255,100,0.4)" }}>
            ფაილი: {currentFile.name} | {broken ? "მოტყდა" : apexReached ? "WL მიღწეული" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {fileScores.map((s, i) => (
            <div key={i} style={{ background: s > 0 ? "rgba(0,60,30,0.8)" : "rgba(60,0,0,0.8)", border: `1px solid ${s > 0 ? "rgba(0,255,100,0.3)" : "rgba(255,0,0,0.3)"}`, borderRadius: "6px", padding: "6px 12px", fontSize: "12px", color: s > 0 ? "#00ff88" : "#ff4444" }}>
              {FILES[i].name}: {s > 0 ? "+" + s : "0"}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "24px" }}>
          <button style={st.btn} onClick={nextFile}>
            {fileIndex + 1 >= FILES.length ? "შედეგები" : `${FILES[fileIndex + 1].name} ფაილი`}
          </button>
        </div>
      </div>
    </div>
  )

  if (phase === "result") return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "rgba(0,255,100,0.5)", marginBottom: "8px", letterSpacing: "2px" }}>EIGHTEETH E-CONNECT PRO</div>
          <div style={st.title}>ოპერაცია დასრულდა</div>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: score >= 120 ? "#00ff88" : score >= 80 ? "#ffee00" : "#ff6666", margin: "20px 0" }}>
            {score}
          </div>
          <div style={{ fontSize: "14px", color: score >= 120 ? "#00ff88" : score >= 80 ? "#ffee00" : "#ff6666", marginBottom: "24px" }}>
            {score >= 120 ? "ენდოდონტისტი" : score >= 80 ? "კარგი პრაქტიკა" : "მეტი ვარჯიში საჭიროა"}
          </div>
        </div>
        <div style={st.sep} />
        <div style={{ marginBottom: "20px" }}>
          {fileScores.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,255,100,0.1)", fontSize: "13px" }}>
              <span style={{ color: "rgba(0,255,100,0.7)" }}>{FILES[i].name} ({FILES[i].size}/{FILES[i].taper})</span>
              <span style={{ color: s > 0 ? "#00ff88" : "#ff4444", fontWeight: "bold" }}>{s > 0 ? "+" + s : "0 (broken)"}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "14px", fontWeight: "bold" }}>
            <span style={{ color: "rgba(0,255,100,0.7)" }}>შეცდომები</span>
            <span style={{ color: mistakes > 3 ? "#ff4444" : "#ffee00" }}>-{mistakes * 3}</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <button style={st.btn} onClick={() => { setPhase("cases"); setScore(0); setMistakes(0); setFileScores([]); setFileIndex(0) }}>ახალი ქეისი</button>
        </div>
      </div>
    </div>
  )

  return null
}

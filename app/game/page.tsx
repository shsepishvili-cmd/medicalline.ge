"use client"
import { useState, useRef, useEffect, useCallback } from "react"

type Phase = "intro"|"cases"|"xray"|"plan"|"ultrax"|"retrieve"|"result"

interface ClinicalCase {
  id:string; tooth:string; wl:number; fragDepth:number; fragLen:number
  curvature:number; difficulty:number; desc:string; canal:string; prognosis:string
}

const CASES:ClinicalCase[] = [
  {id:"c1",tooth:"#21",wl:23,fragDepth:0.55,fragLen:0.13,curvature:0,difficulty:1,canal:"Single",
   desc:"კბილი #21 — Pulpitis irreversibilis. ჩატეხილი ფაილი კორონარულ მესამედში. სწორი არხი.",prognosis:"კარგი"},
  {id:"c2",tooth:"#35",wl:20,fragDepth:0.70,fragLen:0.10,curvature:18,difficulty:2,canal:"Mesial",
   desc:"კბილი #35 — Necrosis pulpae. ჩატეხილი ფაილი შუა მესამედში. 18° მოხრილობა.",prognosis:"ზომიერი"},
  {id:"c3",tooth:"#36",wl:18,fragDepth:0.80,fragLen:0.08,curvature:32,difficulty:3,canal:"MB1",
   desc:"კბილი #36 — Periodontitis apicalis. MB1 არხი. 32° მოხრილობა. ღრმა ფრაგმენტი.",prognosis:"ფრთხილად"},
  {id:"c4",tooth:"#16",wl:19,fragDepth:0.88,fragLen:0.07,curvature:28,difficulty:4,canal:"MB2",
   desc:"კბილი #16 — MB2 არხი. ძნელი წვდომა. ფრაგმენტი აპიკალური მესამედის ზღვარზე.",prognosis:"სერიოზული"},
]

function mlLogo(ctx:CanvasRenderingContext2D,x:number,y:number,s:number){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s)
  ctx.beginPath()
  ctx.moveTo(0,-20); ctx.bezierCurveTo(24,-20,30,0,26,14)
  ctx.bezierCurveTo(22,24,10,30,0,28)
  ctx.bezierCurveTo(-10,30,-22,24,-26,14)
  ctx.bezierCurveTo(-30,0,-24,-20,0,-20); ctx.closePath()
  ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.fill()
  ctx.strokeStyle="#1D3C8F"; ctx.lineWidth=4; ctx.lineCap="round"
  ctx.beginPath(); ctx.moveTo(-20,-15); ctx.bezierCurveTo(-30,-8,-32,6,-28,16)
  ctx.bezierCurveTo(-22,24,-10,30,0,28); ctx.stroke()
  ctx.strokeStyle="#CC2229"; ctx.lineWidth=4
  ctx.beginPath(); ctx.moveTo(0,28); ctx.bezierCurveTo(12,30,24,20,26,8)
  ctx.bezierCurveTo(29,-4,22,-18,8,-20); ctx.stroke()
  ctx.strokeStyle="#9E9E9E"; ctx.lineWidth=2.5; ctx.lineJoin="round"
  ctx.beginPath()
  ctx.moveTo(-15,3); ctx.lineTo(-8,3); ctx.lineTo(-5,-9)
  ctx.lineTo(-1,15); ctx.lineTo(3,-5); ctx.lineTo(6,3); ctx.lineTo(15,3)
  ctx.stroke()
  ctx.restore()
}

export default function GamePage(){
  const [phase,setPhase]=useState<Phase>("intro")
  const [cas,setCas]=useState<ClinicalCase|null>(null)
  const [ultraxPct,setUltraxPct]=useState(0)
  const [ultraxClicks,setUltraxClicks]=useState(0)
  const [retrievePct,setRetrievePct]=useState(0)
  const [toolY,setToolY]=useState(0)
  const [score,setScore]=useState(0)
  const [mistakes,setMistakes]=useState(0)
  const [success,setSuccess]=useState(false)
  const [plan,setPlan]=useState<"bypass"|"retrieve"|null>(null)
  const [shake,setShake]=useState(false)
  const [pulse,setPulse]=useState(false)

  const xrayRef=useRef<HTMLCanvasElement>(null)
  const ultraxRef=useRef<HTMLCanvasElement>(null)
  const retrieveRef=useRef<HTMLCanvasElement>(null)
  const animRef=useRef(0)
  const tRef=useRef(0)
  const audioRef=useRef<AudioContext|null>(null)

  function beep(f:number,d:number,type:OscillatorType="sine",v=0.2){
    try{
      if(!audioRef.current) audioRef.current=new AudioContext()
      const a=audioRef.current
      const o=a.createOscillator(),g=a.createGain()
      o.connect(g);g.connect(a.destination)
      o.type=type;o.frequency.value=f
      g.gain.setValueAtTime(v,a.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+d)
      o.start();o.stop(a.currentTime+d)
    }catch{}
  }

  function startCase(c:ClinicalCase){
    setCas(c);setUltraxPct(0);setUltraxClicks(0)
    setRetrievePct(0);setToolY(0);setScore(0);setMistakes(0)
    setSuccess(false);setPlan(null)
    setPhase("xray")
  }

  // ── XRAY CANVAS ──
  const drawXray=useCallback(()=>{
    const cv=xrayRef.current; if(!cv||!cas) return
    const ctx=cv.getContext("2d")!
    const W=cv.width,H=cv.height
    const t=tRef.current

    // X-ray background
    ctx.fillStyle="#0d0d0d"; ctx.fillRect(0,0,W,H)
    // Vignette
    const vig=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75)
    vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,0.8)")
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H)

    // Tooth position
    const tx=W/2,ty=60,tw=90,rootH=H-120
    const curve=cas.curvature*(Math.PI/180)

    // Canal path
    function canalPts(){
      const pts:[number,number][]=[]
      for(let i=0;i<=50;i++){
        const t2=i/50
        let cx=tx
        if(cas.curvature>0) cx+=Math.sin(t2*Math.PI)*cas.curvature*0.9
        pts.push([cx,ty+t2*rootH])
      }
      return pts
    }
    const pts=canalPts()

    // Tooth outline (X-ray white)
    ctx.save()
    ctx.shadowColor="rgba(200,200,200,0.3)"; ctx.shadowBlur=12
    ctx.strokeStyle="rgba(180,180,170,0.75)"; ctx.lineWidth=tw
    ctx.lineCap="round"
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py))
    ctx.stroke()
    ctx.restore()

    // Bone/PDL darker surroundings
    ctx.strokeStyle="rgba(60,55,50,0.9)"; ctx.lineWidth=tw+32
    ctx.globalCompositeOperation="destination-over"
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py))
    ctx.stroke()
    ctx.globalCompositeOperation="source-over"

    // Pulp chamber (dark canal)
    ctx.strokeStyle="rgba(20,20,18,0.95)"; ctx.lineWidth=14
    ctx.lineCap="round"; ctx.lineJoin="round"
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py))
    ctx.stroke()

    // Trabecular bone texture
    ctx.strokeStyle="rgba(100,95,85,0.18)"; ctx.lineWidth=1
    for(let i=0;i<40;i++){
      const bx=tx-tw*0.7+Math.random()*tw*1.4
      const by=ty+Math.random()*rootH
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+8-Math.random()*16,by+6-Math.random()*12); ctx.stroke()
    }

    // Fragment position
    const fragStart=Math.floor(cas.fragDepth*50)
    const fragEnd=Math.floor((cas.fragDepth+cas.fragLen)*50)
    const fp0=pts[Math.min(fragStart,49)]
    const fp1=pts[Math.min(fragEnd,49)]

    // Fragment — bright metallic piece
    const fragGlow=Math.sin(t*0.08)*0.3+0.7
    ctx.save()
    ctx.shadowColor=`rgba(220,220,180,${fragGlow})`
    ctx.shadowBlur=8
    ctx.strokeStyle=`rgba(230,225,200,${0.85+fragGlow*0.15})`
    ctx.lineWidth=5
    ctx.lineCap="round"
    ctx.beginPath(); ctx.moveTo(fp0[0],fp0[1]); ctx.lineTo(fp1[0],fp1[1]); ctx.stroke()
    // Fragment cross-hatching (NiTi spiral visible)
    ctx.strokeStyle=`rgba(160,155,130,${0.6})`; ctx.lineWidth=1.5
    const flen=Math.sqrt((fp1[0]-fp0[0])**2+(fp1[1]-fp0[1])**2)
    const fa=Math.atan2(fp1[1]-fp0[1],fp1[0]-fp0[0])
    for(let i=0;i<flen;i+=3){
      const px2=fp0[0]+Math.cos(fa)*i
      const py2=fp0[1]+Math.sin(fa)*i
      ctx.beginPath()
      ctx.moveTo(px2+Math.cos(fa+Math.PI/2)*3,py2+Math.sin(fa+Math.PI/2)*3)
      ctx.lineTo(px2-Math.cos(fa+Math.PI/2)*3,py2-Math.sin(fa+Math.PI/2)*3)
      ctx.stroke()
    }
    ctx.restore()

    // Measurement arrows (WL indicator)
    ctx.strokeStyle="rgba(100,200,100,0.5)"; ctx.lineWidth=1
    ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.moveTo(tx+tw*0.6,pts[0][1]); ctx.lineTo(tx+tw*0.6,pts[49][1]); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle="rgba(100,200,100,0.8)"; ctx.font="10px monospace"
    ctx.fillText(cas.wl+"mm",tx+tw*0.6+4,pts[49][1]-4)

    // Fragment depth marker
    ctx.strokeStyle="rgba(255,100,80,0.6)"; ctx.lineWidth=1
    ctx.setLineDash([2,3])
    ctx.beginPath(); ctx.moveTo(tx-tw*0.6,fp0[1]); ctx.lineTo(tx+tw*0.6+35,fp0[1]); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(tx-tw*0.6,fp1[1]); ctx.lineTo(tx+tw*0.6+35,fp1[1]); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle="rgba(255,120,80,0.85)"; ctx.font="9px monospace"
    ctx.fillText("FRAG",(tx+tw*0.6+8),(fp0[1]+fp1[1])/2+3)

    // Apex marker
    const apex=pts[49]
    ctx.strokeStyle="rgba(255,200,0,0.6)"; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.moveTo(apex[0]-8,apex[1]+5); ctx.lineTo(apex[0]+8,apex[1]+5); ctx.stroke()
    ctx.fillStyle="rgba(255,200,0,0.8)"; ctx.font="9px monospace"
    ctx.fillText("APEX",apex[0]+10,apex[1]+8)

    // Corner info
    mlLogo(ctx,36,36,0.55)
    ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font="bold 11px monospace"
    ctx.fillText("Medical Line Georgia",64,28)
    ctx.fillStyle="rgba(180,180,160,0.7)"; ctx.font="10px monospace"
    ctx.fillText(cas.tooth+" | WL:"+cas.wl+"mm | "+cas.canal,64,42)

    // Diagnosis box
    ctx.fillStyle="rgba(0,0,0,0.6)"
    ctx.fillRect(8,H-52,W-16,44)
    ctx.fillStyle="rgba(255,80,80,0.85)"; ctx.font="bold 10px monospace"
    ctx.fillText("BROKEN INSTRUMENT DETECTED",16,H-36)
    ctx.fillStyle="rgba(200,200,180,0.8)"; ctx.font="9px monospace"
    ctx.fillText(cas.desc,16,H-22)
    ctx.fillStyle="rgba(100,200,100,0.8)"
    ctx.fillText("Prognosis: "+cas.prognosis,16,H-9)
  },[cas])

  // ── ULTRAX CANVAS ──
  const drawUltrax=useCallback(()=>{
    const cv=ultraxRef.current; if(!cv||!cas) return
    const ctx=cv.getContext("2d")!
    const W=cv.width,H=cv.height
    const t=tRef.current
    const pct=ultraxPct/100

    ctx.fillStyle="#0d0d0d"; ctx.fillRect(0,0,W,H)

    // Left panel: X-ray view with UltraX tip
    const lw=W*0.45
    const tx=lw/2,ty=40,rootH=H-90
    const pts:[number,number][]=[]
    for(let i=0;i<=50;i++){
      const t2=i/50
      let cx=tx
      if(cas.curvature>0) cx+=Math.sin(t2*Math.PI)*cas.curvature*0.6
      pts.push([cx,ty+t2*rootH])
    }

    // Tooth
    ctx.shadowColor="rgba(180,180,160,0.2)"; ctx.shadowBlur=8
    ctx.strokeStyle="rgba(160,155,140,0.65)"; ctx.lineWidth=60; ctx.lineCap="round"
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py)); ctx.stroke()
    ctx.shadowBlur=0

    // Canal
    ctx.strokeStyle="rgba(18,18,16,0.98)"; ctx.lineWidth=10
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py)); ctx.stroke()

    // Fragment
    const fs=Math.floor(cas.fragDepth*50), fe=Math.floor((cas.fragDepth+cas.fragLen)*50)
    const fp0=pts[Math.min(fs,49)], fp1=pts[Math.min(fe,49)]
    const fragAlpha=1-pct*0.6
    ctx.strokeStyle=`rgba(230,220,190,${fragAlpha})`; ctx.lineWidth=5; ctx.lineCap="round"
    ctx.beginPath(); ctx.moveTo(fp0[0],fp0[1]); ctx.lineTo(fp1[0],fp1[1]); ctx.stroke()

    // Vibration effect on fragment
    if(pct>0){
      const vib=Math.sin(t*0.5)*pct*3
      ctx.strokeStyle=`rgba(100,180,255,${pct*0.4})`; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(fp0[0]+vib,fp0[1]-vib); ctx.lineTo(fp1[0]-vib,fp1[1]+vib); ctx.stroke()
    }

    // UltraX tip descending
    const tipProgress=Math.min(cas.fragDepth-0.05,0.95)
    const tipIdx=Math.floor(tipProgress*50)
    const tip=pts[Math.min(tipIdx,49)]

    // UltraX body (white/gray pen style)
    ctx.save(); ctx.translate(tip[0],tip[1])
    const tipAngle=pts.length>2?Math.atan2(pts[tipIdx][1]-pts[Math.max(0,tipIdx-1)][1],
      pts[tipIdx][0]-pts[Math.max(0,tipIdx-1)][0]):Math.PI/2
    ctx.rotate(tipAngle-Math.PI/2)
    // Shaft
    ctx.fillStyle="#e0e0e0"; ctx.strokeStyle="#999"; ctx.lineWidth=1
    ctx.beginPath(); ctx.roundRect(-4,-50,8,50,2); ctx.fill(); ctx.stroke()
    // Tip needle
    ctx.fillStyle="#aaa"
    ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(2,0); ctx.lineTo(0,12); ctx.closePath(); ctx.fill()
    // Ultrasonic waves
    if(pct>0){
      for(let w=1;w<=3;w++){
        const wa=(t*0.15+w*0.4)%(Math.PI*2)
        ctx.strokeStyle=`rgba(100,160,255,${Math.max(0,0.5-w*0.12)*Math.sin(wa)})`
        ctx.lineWidth=1
        ctx.beginPath(); ctx.arc(0,6,w*5,0,Math.PI*2); ctx.stroke()
      }
    }
    // Eighteeth logo on body
    ctx.fillStyle="#1E88E5"; ctx.font="bold 5px Arial"
    ctx.save(); ctx.rotate(0); ctx.fillText("18",-3,-25); ctx.restore()
    ctx.restore()

    // Right panel: device + progress
    const rx=lw+20
    ctx.fillStyle="rgba(255,255,255,0.05)"
    ctx.fillRect(rx,0,W-rx,H)

    // E-Xtreme / UltraX device illustration
    const dx=rx+60,dy=H/2-40
    // Handle body
    const hgrad=ctx.createLinearGradient(dx-18,0,dx+18,0)
    hgrad.addColorStop(0,"#d0d0d0"); hgrad.addColorStop(0.4,"#f5f5f5")
    hgrad.addColorStop(0.7,"#e0e0e0"); hgrad.addColorStop(1,"#b0b0b0")
    ctx.fillStyle=hgrad; ctx.strokeStyle="#999"; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.roundRect(dx-18,dy-70,36,100,16); ctx.fill(); ctx.stroke()
    // Black screen section
    ctx.fillStyle="#111"
    ctx.beginPath(); ctx.roundRect(dx-14,dy-20,28,40,4); ctx.fill()
    ctx.fillStyle="#00ff88"; ctx.font="7px monospace"
    ctx.fillText("ULTRA",dx-11,dy-8)
    ctx.fillStyle="#90CAF9"
    ctx.fillText("X "+Math.round(pct*100)+"%",dx-10,dy+4)
    // Vibration freq display
    ctx.fillStyle="#666"; ctx.font="6px monospace"
    ctx.fillText("32kHz",dx-9,dy+16)
    // Tip attachment
    ctx.fillStyle="#888"; ctx.strokeStyle="#666"; ctx.lineWidth=1
    ctx.beginPath(); ctx.roundRect(dx-5,dy-90,10,22,3); ctx.fill(); ctx.stroke()
    ctx.fillStyle="#bbb"
    ctx.beginPath(); ctx.moveTo(dx-3,dy-90); ctx.lineTo(dx+3,dy-90)
    ctx.lineTo(dx+1,dy-110); ctx.lineTo(dx-1,dy-110); ctx.closePath(); ctx.fill()
    // Ultrasonic rings around tip
    for(let w=0;w<4;w++){
      const wa=(t*0.12+w*0.7)%(Math.PI*2)
      const alpha=Math.max(0,Math.sin(wa))*0.5*pct
      ctx.strokeStyle=`rgba(100,160,255,${alpha})`; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.arc(dx,dy-110,w*8+4,0,Math.PI*2); ctx.stroke()
    }
    // Brand
    mlLogo(ctx,dx+5,dy+38,0.45)
    ctx.fillStyle="#aaa"; ctx.font="bold 8px Arial"
    ctx.fillText("UltraX",dx-14,dy+60)
    ctx.fillStyle="#666"; ctx.font="6px Arial"
    ctx.fillText("Endoactivator",dx-18,dy+70)

    // Progress bar
    const pbx=rx+10,pby=H-55,pbw=W-rx-20
    ctx.fillStyle="rgba(0,0,0,0.5)"
    ctx.beginPath(); ctx.roundRect(pbx,pby,pbw,18,9); ctx.fill()
    const pbFill=ctx.createLinearGradient(pbx,0,pbx+pbw,0)
    pbFill.addColorStop(0,"#1E88E5"); pbFill.addColorStop(1,"#00E5FF")
    ctx.fillStyle=pbFill
    ctx.beginPath(); ctx.roundRect(pbx,pby,pbw*pct,18,9); ctx.fill()
    ctx.fillStyle="#fff"; ctx.font="bold 10px monospace"; ctx.textAlign="center"
    ctx.fillText("ვიბრაცია: "+Math.round(pct*100)+"%",pbx+pbw/2,pby+13)
    ctx.textAlign="left"

    // Instructions
    ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="11px Arial"; ctx.textAlign="center"
    ctx.fillText("ფრაგმენტზე დააჭირეთ — UltraX-ი ფხვიერებს",W/2,H-28)
    ctx.fillText("მიზანი: 85%+ ვიბრაცია",W/2,H-13)
    ctx.textAlign="left"
  },[cas,ultraxPct])

  // ── RETRIEVE CANVAS ──
  const drawRetrieve=useCallback(()=>{
    const cv=retrieveRef.current; if(!cv||!cas) return
    const ctx=cv.getContext("2d")!
    const W=cv.width,H=cv.height
    const t=tRef.current

    ctx.fillStyle="#0d0d0d"; ctx.fillRect(0,0,W,H)

    // Vignette
    const vig=ctx.createRadialGradient(W*0.35,H/2,50,W*0.35,H/2,H*0.7)
    vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,0.7)")
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H)

    const tx=W*0.35,ty=40,rootH=H-90
    const pts:[number,number][]=[]
    for(let i=0;i<=50;i++){
      const t2=i/50
      let cx=tx
      if(cas.curvature>0) cx+=Math.sin(t2*Math.PI)*cas.curvature*0.8
      pts.push([cx,ty+t2*rootH])
    }

    // Tooth
    ctx.shadowColor="rgba(180,175,155,0.25)"; ctx.shadowBlur=10
    ctx.strokeStyle="rgba(155,150,135,0.65)"; ctx.lineWidth=65; ctx.lineCap="round"
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py)); ctx.stroke()
    ctx.shadowBlur=0

    ctx.strokeStyle="rgba(18,18,16,0.98)"; ctx.lineWidth=12
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1])
    pts.forEach(([px,py])=>ctx.lineTo(px,py)); ctx.stroke()

    // Fragment (fades as retrieved)
    const pct=retrievePct/100
    const fs=Math.floor(cas.fragDepth*50), fe=Math.floor((cas.fragDepth+cas.fragLen)*50)
    const fp0=pts[Math.min(fs,49)], fp1=pts[Math.min(fe,49)]
    const fragAlpha=Math.max(0,1-pct*1.2)
    if(fragAlpha>0){
      ctx.strokeStyle=`rgba(225,215,185,${fragAlpha})`; ctx.lineWidth=5; ctx.lineCap="round"
      ctx.beginPath(); ctx.moveTo(fp0[0],fp0[1]); ctx.lineTo(fp1[0],fp1[1]); ctx.stroke()
    }

    // Eflex Blue file — descends then retrieves
    const fileDepth=pct<0.5?pct*2:2-pct*2
    const fileIdx=Math.floor(Math.min(fileDepth,0.99)*cas.fragDepth*50)
    const fileTip=pts[Math.min(fileIdx,49)]

    // Eflex Blue file draw
    ctx.save(); ctx.translate(fileTip[0],fileTip[1])
    const ang=fileIdx>0?Math.atan2(pts[fileIdx][1]-pts[Math.max(0,fileIdx-1)][1],
      pts[fileIdx][0]-pts[Math.max(0,fileIdx-1)][0]):Math.PI/2
    ctx.rotate(ang-Math.PI/2)

    const fh=cas.fragDepth*rootH+30
    // Gold handle
    const gG=ctx.createLinearGradient(-8,-fh-20,8,-fh-20)
    gG.addColorStop(0,"#B8860B"); gG.addColorStop(0.5,"#FFD700"); gG.addColorStop(1,"#B8860B")
    ctx.fillStyle=gG; ctx.strokeStyle="#8B6914"; ctx.lineWidth=1
    ctx.beginPath(); ctx.roundRect(-7,-fh-18,14,16,3); ctx.fill(); ctx.stroke()
    // Red stopper ring
    ctx.fillStyle="#CC1111"
    ctx.beginPath(); ctx.roundRect(-8,-fh-4,16,6,2); ctx.fill()
    // Blue shaft
    const bG=ctx.createLinearGradient(-3,0,3,0)
    bG.addColorStop(0,"#1565C0"); bG.addColorStop(0.3,"#90CAF9"); bG.addColorStop(0.7,"#42A5F5"); bG.addColorStop(1,"#1565C0")
    ctx.fillStyle=bG; ctx.strokeStyle="#0D47A1"; ctx.lineWidth=0.8
    ctx.beginPath(); ctx.moveTo(-3,-fh+2); ctx.lineTo(3,-fh+2); ctx.lineTo(1,0); ctx.lineTo(-1,0); ctx.closePath()
    ctx.fill(); ctx.stroke()
    // NiTi spiral
    ctx.strokeStyle="rgba(200,230,255,0.55)"; ctx.lineWidth=0.8
    for(let i=0;i<fh;i+=4){
      const s2=Math.sin((i/fh)*Math.PI*8+t*0.3)*2.5
      ctx.beginPath(); ctx.moveTo(s2,-fh+i+2); ctx.lineTo(-s2,-fh+i+5); ctx.stroke()
    }
    // Calibration rings
    ctx.strokeStyle="rgba(0,0,0,0.7)"; ctx.lineWidth=1.5
    for(let r=1;r<=5;r++){
      ctx.beginPath(); ctx.moveTo(-3,-fh*0.25*r+2); ctx.lineTo(3,-fh*0.25*r+2); ctx.stroke()
    }
    // Rotating tip animation
    ctx.save(); ctx.rotate(t*0.2)
    ctx.strokeStyle="#1E88E5"; ctx.lineWidth=1.2
    for(let i=0;i<3;i++){
      ctx.rotate(Math.PI*2/3)
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-4); ctx.stroke()
    }
    ctx.restore()
    ctx.restore()

    // Right info panel
    const rx=W*0.62
    ctx.fillStyle="rgba(0,0,0,0.5)"
    ctx.fillRect(rx,0,W-rx,H)

    // E-Xtreme handpiece illustration
    const ex=rx+55,ey=H/2-20
    // Main body gradient
    const hG=ctx.createLinearGradient(ex-20,0,ex+20,0)
    hG.addColorStop(0,"#b8b8b8"); hG.addColorStop(0.35,"#f0f0f0")
    hG.addColorStop(0.65,"#e0e0e0"); hG.addColorStop(1,"#a0a0a0")
    ctx.fillStyle=hG; ctx.strokeStyle="#888"; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.roundRect(ex-22,ey-90,44,130,20); ctx.fill(); ctx.stroke()
    // Black control area
    ctx.fillStyle="#0a0a0a"
    ctx.beginPath(); ctx.roundRect(ex-18,ey-10,36,60,4); ctx.fill()
    ctx.fillStyle="#00ff88"; ctx.font="7px monospace"
    ctx.fillText("400 RPM",ex-14,ey+5)
    ctx.fillStyle="#fff"; ctx.font="6px monospace"
    ctx.fillText("M1 3.0 Ncm",ex-14,ey+16)
    // S button
    ctx.fillStyle="#333"
    ctx.beginPath(); ctx.roundRect(ex-10,ey+24,20,10,3); ctx.fill()
    ctx.fillStyle="#aaa"; ctx.font="bold 8px Arial"; ctx.textAlign="center"
    ctx.fillText("S",ex,ey+33); ctx.textAlign="left"
    // Eighteeth logo on white body
    mlLogo(ctx,ex,ey-50,0.38)
    ctx.fillStyle="#555"; ctx.font="7px Arial"
    ctx.fillText("Eighteeth",ex-14,ey-62)
    ctx.fillStyle="#333"; ctx.font="6px Arial"
    ctx.fillText("E-xtreme",ex-12,ey-72)
    // Neck/head
    ctx.fillStyle="#c0c0c0"; ctx.strokeStyle="#888"; ctx.lineWidth=1
    ctx.beginPath(); ctx.roundRect(ex-10,ey-110,20,22,4); ctx.fill(); ctx.stroke()
    // Head
    const hGrad=ctx.createLinearGradient(ex-14,0,ex+14,0)
    hGrad.addColorStop(0,"#a0a0a0"); hGrad.addColorStop(0.5,"#d8d8d8"); hGrad.addColorStop(1,"#a0a0a0")
    ctx.fillStyle=hGrad; ctx.strokeStyle="#777"; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.ellipse(ex-2,ey-118,18,12,-0.3,0,Math.PI*2); ctx.fill(); ctx.stroke()
    // Blue file in head
    ctx.fillStyle="#1E88E5"
    ctx.beginPath(); ctx.arc(ex-10,ey-122,3,0,Math.PI*2); ctx.fill()
    ctx.fillStyle="rgba(30,136,229,0.3)"
    ctx.beginPath(); ctx.arc(ex-10,ey-122,7,0,Math.PI*2); ctx.fill()
    // Rotating animation
    ctx.save(); ctx.translate(ex-10,ey-122); ctx.rotate(t*0.3)
    ctx.strokeStyle="#90CAF9"; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(5,0); ctx.stroke()
    ctx.restore()

    // Progress bar
    const pbx=rx+8,pby=H-55,pbw=W-rx-16
    ctx.fillStyle="rgba(0,0,0,0.5)"
    ctx.beginPath(); ctx.roundRect(pbx,pby,pbw,18,9); ctx.fill()
    const colR=pct<0.5?"#1E88E5":"#00E676"
    const pbG=ctx.createLinearGradient(pbx,0,pbx+pbw,0)
    pbG.addColorStop(0,colR); pbG.addColorStop(1,"#00BCD4")
    ctx.fillStyle=pbG
    ctx.beginPath(); ctx.roundRect(pbx,pby,pbw*Math.min(pct,1),18,9); ctx.fill()
    ctx.fillStyle="#fff"; ctx.font="bold 9px monospace"; ctx.textAlign="center"
    const label=pct<0.5?"↓ ჩაღრმავება "+(Math.round(pct*2*cas.fragDepth*cas.wl*10)/10)+"mm":"↑ ამოღება "+(Math.round((2-pct*2)*cas.fragDepth*cas.wl*10)/10)+"mm"
    ctx.fillText(label,pbx+pbw/2,pby+13)
    ctx.textAlign="left"

    // Inst
    ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="10px Arial"; ctx.textAlign="center"
    ctx.fillText(pct<0.45?"→ გადადით ფრაგმენტამდე":"← ნელ-ნელა ამოიღეთ",W-rx/2,H-28)
    ctx.textAlign="left"
  },[cas,retrievePct])

  // Animation loop
  useEffect(()=>{
    if(phase!=="xray"&&phase!=="ultrax"&&phase!=="retrieve") return
    let last=0
    function loop(ts:number){
      const dt=ts-last; last=ts
      tRef.current+=dt/16
      if(phase==="xray") drawXray()
      else if(phase==="ultrax") drawUltrax()
      else if(phase==="retrieve") drawRetrieve()
      animRef.current=requestAnimationFrame(loop)
    }
    animRef.current=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animRef.current)
  },[phase,drawXray,drawUltrax,drawRetrieve])

  function handleUltraxClick(e:React.MouseEvent<HTMLCanvasElement>){
    if(ultraxPct>=100) return
    const rect=e.currentTarget.getBoundingClientRect()
    const cx=(e.clientX-rect.left)*(e.currentTarget.width/rect.width)
    const cy=(e.clientY-rect.top)*(e.currentTarget.height/rect.height)
    // Check if clicking near fragment area (left half canvas)
    const lw=e.currentTarget.width*0.45
    const fragY=40+(cas?.fragDepth||0.7)*(e.currentTarget.height-90)
    const dist=Math.sqrt((cx-lw/2)**2+(cy-fragY)**2)
    if(dist<60){
      const gain=12-Math.min(ultraxClicks*0.5,8)
      setUltraxPct(p=>Math.min(p+gain,100))
      setUltraxClicks(c=>c+1)
      beep(32000,0.05,"sawtooth",0.1)
      setTimeout(()=>beep(18000,0.03,"square",0.05),30)
      setPulse(true); setTimeout(()=>setPulse(false),120)
    } else {
      setMistakes(m=>m+1)
      beep(200,0.1,"square",0.15)
      setShake(true); setTimeout(()=>setShake(false),300)
    }
  }

  function handleRetrieveClick(){
    if(ultraxPct<70){
      beep(220,0.3,"square"); return
    }
    if(retrievePct>=100){
      const sc=Math.max(20,100-mistakes*8-(100-ultraxPct)*0.3)
      setScore(Math.round(sc))
      setSuccess(true)
      beep(880,0.15); setTimeout(()=>beep(1100,0.2),180); setTimeout(()=>beep(1320,0.25),380)
      setPhase("result")
      return
    }
    setRetrievePct(p=>{
      const next=p+8
      beep(440+next*3,0.04,"sine",0.15)
      if(next>=50&&p<50) setPulse(true)
      return Math.min(next,100)
    })
  }

  const st={
    page:{minHeight:"100vh",background:"#080a0f",color:"#e0e8e0",fontFamily:"monospace",
      display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:"16px"},
    card:{background:"rgba(0,10,5,0.95)",border:"1px solid rgba(0,200,100,0.2)",borderRadius:"12px",
      padding:"28px",maxWidth:"700px",width:"100%"},
    title:{fontSize:"22px",fontWeight:"bold",color:"#00cc88",marginBottom:"6px"},
    btn:{background:"linear-gradient(135deg,#00994d,#006633)",color:"#fff",border:"none",borderRadius:"8px",
      padding:"12px 24px",fontSize:"14px",fontWeight:"bold",cursor:"pointer",fontFamily:"monospace"},
    btnBlue:{background:"linear-gradient(135deg,#1565C0,#0D47A1)",color:"#fff",border:"none",borderRadius:"8px",
      padding:"12px 24px",fontSize:"14px",fontWeight:"bold",cursor:"pointer",fontFamily:"monospace"},
    sep:{height:"1px",background:"rgba(0,200,100,0.15)",margin:"18px 0"},
  }

  if(phase==="intro") return(
    <div style={st.page}>
      <div style={st.card}>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"11px",color:"rgba(0,200,100,0.5)",letterSpacing:"3px",marginBottom:"8px"}}>MEDICAL LINE GEORGIA × EIGHTEETH</div>
          <div style={{...st.title,fontSize:"28px"}}>Broken File Retrieval</div>
          <div style={{fontSize:"13px",color:"rgba(0,200,100,0.6)",marginTop:"4px"}}>კლინიკური სიმულაციური ტრენინგი</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"24px"}}>
          {[["E-Xtreme","ენდომოტორი","#42A5F5"],["UltraX","ენდოაქტივატორი","#90CAF9"],["Eflex Blue","NiTi ფაილი","#FFD700"]].map(([n,d,c])=>(
            <div key={n} style={{background:"rgba(0,20,10,0.7)",border:`1px solid ${c}33`,borderRadius:"8px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"13px",fontWeight:"bold",color:c,marginBottom:"4px"}}>{n}</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)"}}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:"12px",color:"rgba(0,200,100,0.6)",lineHeight:"2",marginBottom:"20px"}}>
          <div>① X-Ray — ჩატეხილი ფრაგმენტის შეფასება</div>
          <div>② UltraX — ულტრაბგერითი ვიბრაცია (ფხვიერება)</div>
          <div>③ Eflex Blue — ფრაგმენტის ამოღება</div>
        </div>
        <div style={{textAlign:"center"}}>
          <button style={st.btn} onClick={()=>setPhase("cases")}>► ტრენინგის დაწყება</button>
        </div>
      </div>
    </div>
  )

  if(phase==="cases") return(
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.title}>ქეისის შერჩევა</div>
        <div style={{fontSize:"11px",color:"rgba(0,200,100,0.4)",marginBottom:"18px"}}>აირჩიეთ კლინიკური შემთხვევა</div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {CASES.map(c=>(
            <button key={c.id} onClick={()=>startCase(c)} style={{
              background:"rgba(0,20,10,0.8)",border:"1px solid rgba(0,200,100,0.2)",
              borderRadius:"10px",padding:"14px",cursor:"pointer",textAlign:"left",fontFamily:"monospace",
              transition:"border-color 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <span style={{color:"#00cc88",fontWeight:"bold",fontSize:"15px"}}>{c.tooth} — {c.canal} canal</span>
                <span style={{color:"rgba(255,200,100,0.7)",fontSize:"11px"}}>{"★".repeat(c.difficulty)}{"☆".repeat(4-c.difficulty)}</span>
              </div>
              <div style={{fontSize:"11px",color:"rgba(0,200,100,0.6)",lineHeight:"1.6"}}>{c.desc}</div>
              <div style={{fontSize:"10px",color:"rgba(0,200,100,0.4)",marginTop:"4px"}}>
                WL: {c.wl}mm | Curvature: {c.curvature}° | Prognosis: {c.prognosis}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if(phase==="xray"&&cas) return(
    <div style={st.page}>
      <div style={{...st.card,maxWidth:"760px"}}>
        <div style={{fontSize:"11px",color:"rgba(255,80,80,0.7)",marginBottom:"4px"}}>⚠ BROKEN INSTRUMENT DETECTED</div>
        <div style={st.title}>{cas.tooth} — {cas.canal} Canal</div>
        <canvas ref={xrayRef} width={680} height={360}
          style={{width:"100%",borderRadius:"8px",border:"1px solid rgba(0,200,100,0.15)",display:"block",marginBottom:"16px"}} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"18px",fontSize:"11px"}}>
          {[["სამუშაო სიგრძე",cas.wl+"mm"],["მოხრილობა",cas.curvature+"°"],["სირთულე","★".repeat(cas.difficulty)],["პროგნოზი",cas.prognosis]].map(([l,v])=>(
            <div key={l} style={{background:"rgba(0,20,10,0.6)",border:"1px solid rgba(0,200,100,0.1)",borderRadius:"6px",padding:"8px"}}>
              <div style={{color:"rgba(0,200,100,0.5)",marginBottom:"2px"}}>{l}</div>
              <div style={{color:"#00cc88",fontWeight:"bold"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:"12px"}}>
          <button style={st.btn} onClick={()=>setPhase("ultrax")}>► UltraX ვიბრაცია</button>
          <button style={{...st.card,padding:"10px 20px",cursor:"pointer",fontSize:"12px",color:"rgba(0,200,100,0.6)"}}
            onClick={()=>setPhase("cases")}>← უკან</button>
        </div>
      </div>
    </div>
  )

  if(phase==="ultrax"&&cas) return(
    <div style={{...st.page,...(shake?{animation:"shake 0.3s"}:{})}}>
      <style>{"@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}"}</style>
      <div style={{...st.card,maxWidth:"760px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
          <div>
            <div style={{fontSize:"11px",color:"rgba(0,150,255,0.7)",marginBottom:"2px"}}>UltraX ენდოაქტივატორი</div>
            <div style={st.title}>{cas.tooth} — ფრაგმენტის ფხვიერება</div>
          </div>
          <div style={{textAlign:"right",fontSize:"11px",color:"rgba(0,200,100,0.5)"}}>
            <div>შეცდომები: {mistakes}</div>
            <div>დაჭერები: {ultraxClicks}</div>
          </div>
        </div>
        <canvas ref={ultraxRef} width={680} height={340}
          onClick={handleUltraxClick}
          style={{width:"100%",borderRadius:"8px",border:`1px solid rgba(0,150,255,${pulse?0.8:0.2})`,
            display:"block",marginBottom:"16px",cursor:"crosshair",
            boxShadow:pulse?"0 0 20px rgba(0,150,255,0.4)":"none"}} />
        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button style={ultraxPct>=70?st.btn:{...st.btn,opacity:0.5}}
            onClick={()=>{if(ultraxPct>=70){beep(660,0.15);setPhase("retrieve")}}}>
            {ultraxPct>=70?"► ფაილით ამოღება":"⟳ გააგრძელეთ ვიბრაცია ("+Math.round(ultraxPct)+"%)"}
          </button>
          {ultraxPct>=70&&<span style={{color:"#00cc88",fontSize:"11px"}}>✓ მზადაა ამოღებისთვის</span>}
        </div>
      </div>
    </div>
  )

  if(phase==="retrieve"&&cas) return(
    <div style={st.page}>
      <div style={{...st.card,maxWidth:"760px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
          <div>
            <div style={{fontSize:"11px",color:"rgba(100,180,255,0.7)",marginBottom:"2px"}}>Eflex Blue + E-Xtreme</div>
            <div style={st.title}>{cas.tooth} — ფრაგმენტის ამოღება</div>
          </div>
          <div style={{textAlign:"right",fontSize:"11px"}}>
            <div style={{color:"rgba(0,200,100,0.6)"}}>UltraX: {Math.round(ultraxPct)}%</div>
            <div style={{color:"rgba(255,200,100,0.6)"}}>შეცდ: {mistakes}</div>
          </div>
        </div>
        <canvas ref={retrieveRef} width={680} height={340}
          style={{width:"100%",borderRadius:"8px",border:"1px solid rgba(100,180,255,0.2)",
            display:"block",marginBottom:"16px"}} />
        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button style={retrievePct>=100?{...st.btn,background:"linear-gradient(135deg,#00c853,#00695c)"}:st.btnBlue}
            onClick={handleRetrieveClick}>
            {retrievePct>=100?"✓ ფრაგმენტი ამოღებულია!":
             retrievePct>=50?"↑ ამოაღეთ ("+Math.round(retrievePct)+"%)":
             "↓ ჩაღრმავება ("+Math.round(retrievePct*2)+"%)"}
          </button>
          <span style={{fontSize:"11px",color:"rgba(0,200,100,0.5)"}}>
            {retrievePct<45?"ფრთხილად — მიხვდით ფრაგმენტს":
             retrievePct<55?"✓ ფრაგმენტს ეხება":
             "ნელა ამოიღეთ"}
          </span>
        </div>
      </div>
    </div>
  )

  if(phase==="result") return(
    <div style={st.page}>
      <div style={{...st.card,textAlign:"center"}}>
        <div style={{fontSize:"11px",color:"rgba(0,200,100,0.5)",letterSpacing:"2px",marginBottom:"8px"}}>MEDICAL LINE GEORGIA</div>
        <div style={{...st.title,fontSize:"26px"}}>
          {success?"✓ ფრაგმენტი წარმატებით ამოიღეს!":"✗ პროცედურა ვერ დასრულდა"}
        </div>
        <div style={{fontSize:"52px",fontWeight:"bold",margin:"20px 0",
          color:score>=80?"#00cc88":score>=60?"#FFD700":"#ff5555"}}>
          {score}
        </div>
        <div style={{fontSize:"13px",color:"rgba(0,200,100,0.6)",marginBottom:"20px"}}>
          {score>=80?"კვალიფიციური ენდოდონტისტი — ბრძანეთ, Medical Line-ში!":
           score>=60?"კარგი — კიდევ ვარჯიში სჭირდება":
           "E-Xtreme-ის კურსი გირჩევნიათ :)"}
        </div>
        <div style={{background:"rgba(0,200,100,0.15)",height:"1px",margin:"16px 0"}} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"20px"}}>
          {[["UltraX ვიბრაცია",ultraxPct+"%"],["შეცდომები",mistakes+""],["ქეისი",cas?.tooth||""]].map(([l,v])=>(
            <div key={l} style={{background:"rgba(0,20,10,0.6)",borderRadius:"8px",padding:"10px",border:"1px solid rgba(0,200,100,0.1)"}}>
              <div style={{fontSize:"10px",color:"rgba(0,200,100,0.5)",marginBottom:"3px"}}>{l}</div>
              <div style={{fontSize:"18px",fontWeight:"bold",color:"#00cc88"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
          <button style={st.btn} onClick={()=>setPhase("cases")}>↺ სხვა ქეისი</button>
          <button style={st.btnBlue} onClick={()=>startCase(cas!)}>↺ იგივე ქეისი</button>
        </div>
      </div>
    </div>
  )

  return null
}

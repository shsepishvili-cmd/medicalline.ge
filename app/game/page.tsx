"use client"
import { useEffect, useRef, useState } from "react"

const CW = 800, CH = 500
const GRAV = 0.55
const JUMP = -13
const SPD = 5
const LW = 4200
const GY = 420

interface Plt { x:number;y:number;w:number;h:number;col:string;lbl:string }
interface Mob { x:number;y:number;w:number;h:number;vx:number;alive:boolean }
interface Gem { x:number;y:number;got:boolean }

const PLATS: Plt[] = [
  {x:0,   y:GY,  w:LW, h:80, col:"#5D4037",lbl:""},
  {x:200, y:355, w:120,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:380, y:310, w:110,h:20, col:"#6A1B9A",lbl:"RODIN NiTi"},
  {x:550, y:345, w:100,h:20, col:"#2E7D32",lbl:"3D Scanner"},
  {x:710, y:295, w:130,h:20, col:"#BF360C",lbl:"X-Ray Pro"},
  {x:900, y:330, w:110,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:1070,y:280, w:120,h:20, col:"#6A1B9A",lbl:"RODIN NiTi"},
  {x:1250,y:315, w:100,h:20, col:"#2E7D32",lbl:"3D Scanner"},
  {x:1400,y:270, w:130,h:20, col:"#BF360C",lbl:"X-Ray Pro"},
  {x:1590,y:300, w:110,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:1760,y:255, w:120,h:20, col:"#6A1B9A",lbl:"RODIN NiTi"},
  {x:1940,y:295, w:100,h:20, col:"#2E7D32",lbl:"3D Scanner"},
  {x:2100,y:340, w:130,h:20, col:"#BF360C",lbl:"X-Ray Pro"},
  {x:2290,y:285, w:110,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:2460,y:325, w:120,h:20, col:"#6A1B9A",lbl:"RODIN NiTi"},
  {x:2640,y:270, w:100,h:20, col:"#2E7D32",lbl:"3D Scanner"},
  {x:2800,y:310, w:130,h:20, col:"#BF360C",lbl:"X-Ray Pro"},
  {x:2990,y:260, w:110,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:3170,y:300, w:120,h:20, col:"#6A1B9A",lbl:"RODIN NiTi"},
  {x:3350,y:345, w:100,h:20, col:"#2E7D32",lbl:"3D Scanner"},
  {x:3510,y:290, w:130,h:20, col:"#BF360C",lbl:"X-Ray Pro"},
  {x:3700,y:330, w:110,h:20, col:"#1565C0",lbl:"E-Connect Pro"},
  {x:3870,y:370, w:220,h:20, col:"#F9A825",lbl:"FINISH"},
]

const INIT_MOBS: Mob[] = [
  {x:350, y:GY-32,w:32,h:32,vx:-1.2,alive:true},
  {x:620, y:GY-32,w:32,h:32,vx:1.2, alive:true},
  {x:950, y:GY-32,w:32,h:32,vx:-1.5,alive:true},
  {x:1300,y:GY-32,w:32,h:32,vx:1.2, alive:true},
  {x:1650,y:GY-32,w:32,h:32,vx:-1.3,alive:true},
  {x:2000,y:GY-32,w:32,h:32,vx:1.5, alive:true},
  {x:2350,y:GY-32,w:32,h:32,vx:-1.2,alive:true},
  {x:2700,y:GY-32,w:32,h:32,vx:1.3, alive:true},
  {x:3050,y:GY-32,w:32,h:32,vx:-1.5,alive:true},
  {x:3400,y:GY-32,w:32,h:32,vx:1.2, alive:true},
]

function makeGems(): Gem[] {
  const arr: Gem[] = []
  const xs = [260,310,420,460,600,640,760,800,960,1010,1130,1180,1310,1360,1460,1510,1650,1700,1820,1870,2010,2060,2160,2200,2350,2400,2520,2560,2700,2750,2860,2900,3050,3100,3230,3280,3410,3460,3570,3620,3770,3820]
  for (const x of xs) arr.push({x, y:330, got:false})
  return arr
}

function overlap(ax:number,ay:number,aw:number,ah:number,bx:number,by:number,bw:number,bh:number){
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by
}

export default function Page() {
  const ref = useRef<HTMLCanvasElement>(null)
  const anim = useRef(0)
  const G = useRef({
    px:60,py:100,pw:30,ph:50,pvx:0,pvy:0,
    onG:false,right:true,fr:0,ft:0,
    cam:0,score:0,lives:3,
    mobs:INIT_MOBS.map(m=>({...m})),
    gems:makeGems(),
    keys:{} as Record<string,boolean>,
    status:"play" as "play"|"over"|"win",
    t:0,
    stars:Array.from({length:60},()=>({x:Math.random()*CW,y:Math.random()*200,s:Math.random()*2+1})),
  })
  const [ui, setUi] = useState({score:0,lives:3,status:"play"})

  function sky(ctx:CanvasRenderingContext2D){
    const g = ctx.createLinearGradient(0,0,0,CH)
    g.addColorStop(0,"#87CEEB"); g.addColorStop(0.6,"#C8E6FF"); g.addColorStop(1,"#E8F5E9")
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH)
  }

  function sun(ctx:CanvasRenderingContext2D){
    ctx.save()
    ctx.shadowColor="#FFD700"; ctx.shadowBlur=30
    ctx.fillStyle="#FFE082"
    ctx.beginPath(); ctx.arc(700,65,38,0,Math.PI*2); ctx.fill()
    ctx.restore()
    ctx.fillStyle="rgba(255,220,80,0.18)"
    ctx.beginPath(); ctx.arc(700,65,60,0,Math.PI*2); ctx.fill()
  }

  function clouds(ctx:CanvasRenderingContext2D, cam:number){
    ctx.fillStyle="rgba(255,255,255,0.88)"
    const offs=[0,280,550,800]
    for(const o of offs){
      const cx=((o-cam*0.08)%CW+CW)%CW
      ctx.beginPath()
      ctx.arc(cx,80,34,0,Math.PI*2)
      ctx.arc(cx+30,70,26,0,Math.PI*2)
      ctx.arc(cx-25,75,22,0,Math.PI*2)
      ctx.fill()
    }
  }

  function mountains(ctx:CanvasRenderingContext2D, cam:number){
    const pks=[220,160,280,130,240,180,200,150,260,120,200,170]
    ctx.fillStyle="#A5D6A7"
    ctx.beginPath()
    const off=((cam*0.18)%240)
    ctx.moveTo(0,380)
    for(let i=0;i<20;i++){
      const bx=i*240-off
      const h=pks[i%pks.length]
      ctx.lineTo(bx,380-h)
      ctx.lineTo(bx+120,380)
    }
    ctx.lineTo(CW,CH); ctx.lineTo(0,CH); ctx.fill()

    ctx.fillStyle="#8D6E63"
    ctx.beginPath()
    const off2=((cam*0.12)%320)
    ctx.moveTo(0,395)
    const pks2=[180,120,220,100,190,140]
    for(let i=0;i<16;i++){
      const bx=i*320-off2
      const h=pks2[i%pks2.length]
      ctx.lineTo(bx,395-h)
      ctx.lineTo(bx+160,395)
    }
    ctx.lineTo(CW,CH); ctx.lineTo(0,CH); ctx.fill()
  }

  function church(ctx:CanvasRenderingContext2D, x:number, y:number, s:number){
    ctx.fillStyle="rgba(80,55,40,0.28)"
    ctx.fillRect(x-s*0.5,y,s,s*1.4)
    ctx.beginPath(); ctx.arc(x,y,s*0.5,Math.PI,0); ctx.fill()
    ctx.fillRect(x-s*0.06,y-s*0.7,s*0.12,s*0.6)
    ctx.fillRect(x-s*0.2,y-s*0.45,s*0.4,s*0.08)
    // Small dome on top of cross
    ctx.beginPath(); ctx.arc(x,y-s*0.65,s*0.12,Math.PI,0); ctx.fill()
  }

  function churches(ctx:CanvasRenderingContext2D, cam:number){
    const cxs=[200,560,870]
    for(const b of cxs){
      const x=((b-cam*0.25)%CW+CW)%CW
      church(ctx,x,300,40)
    }
    church(ctx,((400-cam*0.25)%CW+CW)%CW,320,28)
  }

  function drawPlat(ctx:CanvasRenderingContext2D, p:Plt, cam:number){
    const sx=p.x-cam
    if(sx>CW+200||sx+p.w<-200) return
    if(!p.lbl){
      // Ground
      const g=ctx.createLinearGradient(0,p.y,0,p.y+p.h)
      g.addColorStop(0,"#6D4C41"); g.addColorStop(1,"#3E2723")
      ctx.fillStyle=g; ctx.fillRect(sx,p.y,p.w,p.h)
      ctx.fillStyle="#8D6E63"
      for(let i=0;i<p.w;i+=50){ctx.fillRect(sx+i,p.y,1.5,p.h)}
      ctx.fillStyle="#A1887F"; ctx.fillRect(sx,p.y,p.w,4)
      return
    }
    if(p.lbl==="FINISH"){
      const g=ctx.createLinearGradient(sx,p.y,sx,p.y+p.h)
      g.addColorStop(0,"#FFD600"); g.addColorStop(1,"#F57F17")
      ctx.fillStyle=g; ctx.fillRect(sx,p.y,p.w,p.h)
      ctx.fillStyle="#FFF"; ctx.font="bold 13px Arial"
      ctx.fillText("FINISH!",sx+50,p.y+14)
      // Flag pole
      ctx.fillStyle="#555"; ctx.fillRect(sx+p.w-30,p.y-55,3,55)
      ctx.fillStyle="#E53935"
      ctx.beginPath(); ctx.moveTo(sx+p.w-27,p.y-55); ctx.lineTo(sx+p.w-5,p.y-43); ctx.lineTo(sx+p.w-27,p.y-31); ctx.fill()
      return
    }
    // Equipment platform
    const g=ctx.createLinearGradient(sx,p.y,sx,p.y+p.h)
    g.addColorStop(0,p.col); g.addColorStop(1,"#111")
    ctx.fillStyle=g; ctx.fillRect(sx,p.y,p.w,p.h)
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1
    ctx.strokeRect(sx+0.5,p.y+0.5,p.w-1,p.h-1)
    // Screen glow
    ctx.fillStyle="rgba(255,255,255,0.08)"
    ctx.fillRect(sx+4,p.y+3,p.w-8,10)
    ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="bold 8px Arial"
    ctx.fillText(p.lbl,sx+5,p.y+13)
    // 18teeth logo dot
    ctx.fillStyle="#fff"
    ctx.beginPath(); ctx.arc(sx+p.w-8,p.y+11,4,0,Math.PI*2); ctx.fill()
  }

  function drawChar(ctx:CanvasRenderingContext2D, px:number, py:number, pw:number, ph:number, onG:boolean, right:boolean, fr:number){
    const leg=onG?Math.sin(fr*0.35)*7:0
    ctx.save()
    if(!right){ ctx.translate(px*2+pw,0); ctx.scale(-1,1) }
    // Chokha body (dark red Georgian coat)
    ctx.fillStyle="#8B0000"
    ctx.beginPath()
    ctx.moveTo(px+pw*0.5,py+18)
    ctx.lineTo(px+pw-2,py+22)
    ctx.lineTo(px+pw,py+ph-14)
    ctx.lineTo(px,py+ph-14)
    ctx.lineTo(px+2,py+22)
    ctx.closePath()
    ctx.fill()
    // Chokha chest cartridges (gaziri)
    ctx.fillStyle="#FFD700"
    for(let i=0;i<5;i++){
      ctx.fillRect(px+5+i*4.5,py+24,3,10)
    }
    for(let i=0;i<5;i++){
      ctx.fillRect(px+pw-8-i*4.5,py+24,3,10)
    }
    // Sash/belt
    ctx.fillStyle="#1A237E"
    ctx.fillRect(px+3,py+ph-18,pw-6,5)
    // Collar
    ctx.fillStyle="#B71C1C"
    ctx.fillRect(px+pw*0.5-5,py+18,10,6)
    // Head
    ctx.fillStyle="#FFCC80"
    ctx.beginPath(); ctx.arc(px+pw*0.5,py+12,11,0,Math.PI*2); ctx.fill()
    // Papakhi (Georgian fur hat)
    ctx.fillStyle="#333"
    ctx.fillRect(px+pw*0.5-11,py+3,22,10)
    ctx.fillStyle="#555"
    ctx.beginPath(); ctx.arc(px+pw*0.5,py+3,11,Math.PI,0); ctx.fill()
    // Hat trim
    ctx.fillStyle="#888"
    ctx.fillRect(px+pw*0.5-12,py+5,24,4)
    // Eyes
    ctx.fillStyle="#333"
    ctx.fillRect(px+pw*0.5-4,py+11,3,3)
    ctx.fillRect(px+pw*0.5+1,py+11,3,3)
    // Mustache
    ctx.fillStyle="#5D4037"
    ctx.fillRect(px+pw*0.5-4,py+16,3,2)
    ctx.fillRect(px+pw*0.5+1,py+16,3,2)
    // Legs
    ctx.fillStyle="#1A237E"
    ctx.fillRect(px+4,py+ph-14,10,14+(onG?leg:0))
    ctx.fillRect(px+pw-14,py+ph-14,10,14-(onG?leg:0))
    // Shoes
    ctx.fillStyle="#212121"
    ctx.fillRect(px+2,py+ph-3,13,5)
    ctx.fillRect(px+pw-15,py+ph-3,13,5)
    ctx.restore()
  }

  function drawMob(ctx:CanvasRenderingContext2D, m:Mob, cam:number, t:number){
    if(!m.alive) return
    const sx=m.x-cam
    if(sx<-60||sx>CW+60) return
    const bob=Math.sin(t*0.06)*2
    // Caries bacteria body
    ctx.fillStyle="#C62828"
    ctx.beginPath(); ctx.arc(sx+16,m.y+16+bob,16,0,Math.PI*2); ctx.fill()
    // Rotating spikes
    ctx.fillStyle="#B71C1C"
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2+t*0.04
      ctx.beginPath()
      ctx.moveTo(sx+16+Math.cos(a)*13,m.y+16+bob+Math.sin(a)*13)
      ctx.lineTo(sx+16+Math.cos(a+0.2)*20,m.y+16+bob+Math.sin(a+0.2)*20)
      ctx.lineTo(sx+16+Math.cos(a-0.2)*20,m.y+16+bob+Math.sin(a-0.2)*20)
      ctx.fill()
    }
    // Angry eyes
    ctx.fillStyle="#FF5252"
    ctx.beginPath(); ctx.arc(sx+10,m.y+13+bob,4,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(sx+22,m.y+13+bob,4,0,Math.PI*2); ctx.fill()
    ctx.fillStyle="#000"
    ctx.beginPath(); ctx.arc(sx+11,m.y+14+bob,2,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(sx+23,m.y+14+bob,2,0,Math.PI*2); ctx.fill()
    // Angry brows
    ctx.strokeStyle="#000"; ctx.lineWidth=2
    ctx.beginPath(); ctx.moveTo(sx+7,m.y+9+bob); ctx.lineTo(sx+13,m.y+11+bob); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(sx+25,m.y+9+bob); ctx.lineTo(sx+19,m.y+11+bob); ctx.stroke()
    // Mouth
    ctx.beginPath(); ctx.arc(sx+16,m.y+20+bob,5,0.2,Math.PI-0.2); ctx.stroke()
  }

  function drawGem(ctx:CanvasRenderingContext2D, g:Gem, cam:number, t:number){
    if(g.got) return
    const sx=g.x-cam
    if(sx<-20||sx>CW+20) return
    const bob=Math.sin(t*0.06+g.x*0.01)*4
    const y=g.y+bob
    // Tooth shape
    ctx.fillStyle="#FFFDE7"
    ctx.strokeStyle="#F9A825"; ctx.lineWidth=1.5
    ctx.beginPath()
    ctx.arc(sx,y,9,Math.PI,0)
    ctx.lineTo(sx+9,y+6)
    ctx.lineTo(sx+5,y+14)
    ctx.lineTo(sx-5,y+14)
    ctx.lineTo(sx-9,y+6)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    ctx.fillStyle="rgba(255,255,255,0.7)"
    ctx.beginPath(); ctx.arc(sx-3,y-3,3,0,Math.PI*2); ctx.fill()
  }

  function drawHUD(ctx:CanvasRenderingContext2D, score:number, lives:number){
    ctx.fillStyle="rgba(0,0,0,0.45)"
    ctx.fillRect(8,8,180,36)
    ctx.fillStyle="#FFD700"; ctx.font="bold 15px Arial"
    ctx.fillText("კბილი x"+score,18,28)
    ctx.fillStyle="#FF5252"; ctx.font="bold 15px Arial"
    ctx.fillText("H:"+lives,150,28)
  }

  function drawOverlay(ctx:CanvasRenderingContext2D, status:string, score:number){
    ctx.fillStyle="rgba(0,0,0,0.65)"
    ctx.fillRect(0,0,CW,CH)
    if(status==="win"){
      ctx.fillStyle="#FFD700"; ctx.font="bold 46px Arial"; ctx.textAlign="center"
      ctx.fillText("გამარჯვება!",CW/2,CH/2-40)
      ctx.fillStyle="#fff"; ctx.font="bold 24px Arial"
      ctx.fillText("ქულა: "+score+" კბილი",CW/2,CH/2+10)
      ctx.fillStyle="#A5D6A7"; ctx.font="18px Arial"
      ctx.fillText("სტომატოლოგი გმირია!",CW/2,CH/2+50)
    } else {
      ctx.fillStyle="#EF5350"; ctx.font="bold 46px Arial"; ctx.textAlign="center"
      ctx.fillText("თავიდან!",CW/2,CH/2-40)
      ctx.fillStyle="#fff"; ctx.font="bold 24px Arial"
      ctx.fillText("ქულა: "+score,CW/2,CH/2+10)
    }
    ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font="18px Arial"
    ctx.fillText("R — რესტარტი",CW/2,CH/2+85)
    ctx.textAlign="left"
  }

  useEffect(()=>{
    const canvas=ref.current; if(!canvas) return
    const ctx=canvas.getContext("2d")!

    function onKey(e:KeyboardEvent,down:boolean){
      G.current.keys[e.key]=down
      if(down&&(e.key==="r"||e.key==="R")&&G.current.status!=="play") restart()
      if([" ","ArrowUp","ArrowLeft","ArrowRight","ArrowDown"].includes(e.key)) e.preventDefault()
    }

    function restart(){
      G.current.px=60; G.current.py=100; G.current.pvx=0; G.current.pvy=0
      G.current.cam=0; G.current.score=0; G.current.lives=3; G.current.fr=0; G.current.ft=0
      G.current.mobs=INIT_MOBS.map(m=>({...m}))
      G.current.gems=makeGems()
      G.current.status="play"
      setUi({score:0,lives:3,status:"play"})
      cancelAnimationFrame(anim.current)
      anim.current=requestAnimationFrame(loop)
    }

    let lastT=0
    function loop(ts:number){
      const dt=Math.min(ts-lastT,33); lastT=ts
      const s=G.current
      if(s.status!=="play"){
        const ctx2=canvas.getContext("2d")!
        sky(ctx2); mountains(ctx2,s.cam); churches(ctx2,s.cam); clouds(ctx2,s.cam); sun(ctx2)
        for(const p of PLATS) drawPlat(ctx2,p,s.cam)
        for(const g of s.gems) drawGem(ctx2,g,s.cam,s.t)
        for(const m of s.mobs) drawMob(ctx2,m,s.cam,s.t)
        drawChar(ctx2,s.px-s.cam,s.py,s.pw,s.ph,s.onG,s.right,s.fr)
        drawHUD(ctx2,s.score,s.lives)
        drawOverlay(ctx2,s.status,s.score)
        return
      }

      s.t++

      // Input
      const L=s.keys["ArrowLeft"]||s.keys["a"]||s.keys["A"]
      const R=s.keys["ArrowRight"]||s.keys["d"]||s.keys["D"]
      const J=s.keys["ArrowUp"]||s.keys[" "]||s.keys["w"]||s.keys["W"]

      if(L){s.pvx=-SPD; s.right=false}
      else if(R){s.pvx=SPD; s.right=true}
      else s.pvx*=0.65

      if(J&&s.onG){s.pvy=JUMP; s.onG=false}

      s.pvy+=GRAV
      s.px+=s.pvx
      s.py+=s.pvy

      if(s.px<0){s.px=0; s.pvx=0}
      if(s.px>LW-s.pw){s.px=LW-s.pw}

      // Platform collision
      s.onG=false
      for(const p of PLATS){
        if(!overlap(s.px,s.py,s.pw,s.ph,p.x,p.y,p.w,p.h)) continue
        const wasAbove=s.pvy>0&&s.py+s.ph-s.pvy<=p.y+8
        if(wasAbove){
          s.py=p.y-s.ph; s.pvy=0; s.onG=true
          if(p.lbl==="FINISH"){s.status="win"; setUi(u=>({...u,status:"win"}))}
        } else if(s.pvx>0&&s.px+s.pw-s.pvx<=p.x+6){s.px=p.x-s.pw; s.pvx=0}
        else if(s.pvx<0&&s.px-s.pvx>=p.x+p.w-6){s.px=p.x+p.w; s.pvx=0}
        else{s.py=p.y+p.h; s.pvy=0}
      }

      // Fall death
      if(s.py>CH+120){
        s.lives--; setUi(u=>({...u,lives:s.lives}))
        if(s.lives<=0){s.status="over"; setUi(u=>({...u,status:"over"})); return}
        s.px=Math.max(60,s.cam); s.py=100; s.pvx=0; s.pvy=0
      }

      // Mob update
      for(const m of s.mobs){
        if(!m.alive) continue
        m.x+=m.vx
        if(m.x<10||m.x>LW-50) m.vx*=-1
        for(const p of PLATS){
          if(!p.lbl) continue
          if(overlap(m.x,m.y,m.w,m.h,p.x,p.y,p.w,p.h)) m.vx*=-1
        }
        // Stomp
        const stomp=s.pvy>0&&overlap(s.px+2,s.py+s.ph-8,s.pw-4,12,m.x+4,m.y,m.w-8,8)
        if(stomp){
          m.alive=false; s.pvy=JUMP*0.55; s.score+=100
          setUi(u=>({...u,score:s.score}))
        } else if(overlap(s.px,s.py,s.pw,s.ph,m.x,m.y,m.w,m.h)){
          s.lives--; setUi(u=>({...u,lives:s.lives}))
          if(s.lives<=0){s.status="over"; setUi(u=>({...u,status:"over"})); return}
          s.px=Math.max(60,s.cam); s.py=100; s.pvx=0; s.pvy=JUMP*0.4
        }
      }

      // Gems
      for(const g of s.gems){
        if(!g.got&&overlap(s.px,s.py,s.pw,s.ph,g.x-10,g.y-2,20,18)){
          g.got=true; s.score+=10; setUi(u=>({...u,score:s.score}))
        }
      }

      // Camera
      const tgt=s.px-CW/3
      s.cam=Math.max(0,Math.min(tgt,LW-CW))

      // Anim frame
      s.ft++; if(s.ft>5){s.fr++; s.ft=0}

      // Draw
      sky(ctx); sun(ctx); clouds(ctx,s.cam); mountains(ctx,s.cam); churches(ctx,s.cam)
      for(const p of PLATS) drawPlat(ctx,p,s.cam)
      for(const g of s.gems) drawGem(ctx,g,s.cam,s.t)
      for(const m of s.mobs) drawMob(ctx,m,s.cam,s.t)
      drawChar(ctx,s.px-s.cam,s.py,s.pw,s.ph,s.onG,s.right,s.fr)
      drawHUD(ctx,s.score,s.lives)

      anim.current=requestAnimationFrame(loop)
    }

    window.addEventListener("keydown",e=>onKey(e,true))
    window.addEventListener("keyup",e=>onKey(e,false))
    anim.current=requestAnimationFrame(loop)
    return()=>{
      cancelAnimationFrame(anim.current)
      window.removeEventListener("keydown",e=>onKey(e,true))
      window.removeEventListener("keyup",e=>onKey(e,false))
    }
  },[])

  return (
    <div style={{minHeight:"100vh",background:"#1a1a2e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{marginBottom:"10px",color:"#FFD700",fontSize:"18px",fontWeight:"bold",letterSpacing:"2px"}}>
        EIGHTEETH GEORGIA — Medical Line
      </div>
      <div style={{position:"relative"}}>
        <canvas ref={ref} width={CW} height={CH} style={{display:"block",borderRadius:"10px",border:"3px solid #333",boxShadow:"0 0 40px rgba(0,0,0,0.8)"}} />
      </div>
      <div style={{marginTop:"12px",color:"rgba(255,255,255,0.5)",fontSize:"12px",display:"flex",gap:"24px"}}>
        <span>← → გადაადგილება</span>
        <span>↑ / Space — ხტუნვა</span>
        <span>ბაქტერიებზე დახტი!</span>
        <span>კბილები — ქულები</span>
      </div>
    </div>
  )
}

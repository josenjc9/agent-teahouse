import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { Layout, V3 } from './layout'
import { asset } from './data'
import type { Atlas, CharCfg, CharState } from './types'

const FIG_RATIO = 0.81        // 圖框裡角色約佔 81%
const FOOT_DROP = 0.038       // 圖框底到腳底的留白比例
const SPEED = 1.5
const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a }

const loader = new THREE.TextureLoader()
const texCache = new Map<string, THREE.Texture>()
function texture(id: string, seq: string) {
  const k = id + '/' + seq
  let t = texCache.get(k)
  if (!t) { t = loader.load(asset(`characters/${id}/${seq}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache.set(k, t) }
  return t
}

type Lines = Record<string, string[]>
/** 角色對白：working 上工、done 做完、stuck 卡住、idle 閒聊、click 被點到、greet 剛出現。沒有 dialogue.json 就不顯示氣泡。
 *  agent 用 set_state.py <角色> say "…" 指定的話（state.say）優先，顯示期間不會被自動對白蓋掉 */
function useDialogue(id: string, status: string, selected: boolean, said?: string, saidAt?: number) {
  const [lines, setLines] = useState<Lines | null>(null)
  const [say, setSay] = useState<string | null>(null)
  useEffect(() => { fetch(asset(`characters/${id}/dialogue.json`)).then((r) => (r.ok ? r.json() : null)).then(setLines).catch(() => setLines(null)) }, [id])
  const pick = (k: string) => { const a = lines?.[k]; return a?.length ? a[Math.floor(Math.random() * a.length)] : null }
  const timer = useRef(0)
  const hold = useRef(0)
  const show = (t: string | null, ms = 4200, force = false) => {
    if (!t || (!force && Date.now() < hold.current)) return
    if (force) hold.current = Date.now() + ms
    setSay(t); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setSay(null), ms)
  }
  useEffect(() => { if (said && saidAt && Date.now() - saidAt < 15000) show(said, 6000, true) }, [said, saidAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useRef('')
  useEffect(() => { if (!lines) return; if (prev.current === '') show(pick('greet')); else if (status === 'working') show(pick('working')); prev.current = status || 'x' }, [status, lines]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected) show(pick('click')) }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lines || status === 'working') return
    const id2 = window.setInterval(() => { if (Math.random() < 0.7) show(pick('idle')) }, 16000 + Math.random() * 8000)
    return () => window.clearInterval(id2)
  }, [lines, status]) // eslint-disable-line react-hooks/exhaustive-deps
  return say
}

type Props = {
  cfg: CharCfg; layout: Layout; state: CharState; selected: boolean; onSelect: () => void
  /** 每幀回報世界座標（屋頂淡出、鏡頭用） */
  report?: (id: string, p: V3, yaw: number) => void
}

export function Character({ cfg, layout, state, selected, onSelect, report }: Props) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const group = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const seat = useMemo(() => layout.seatOf(cfg.seat), [layout, cfg.seat])
  const say = useDialogue(cfg.id, state.status, selected, state.say, state.sayAt)
  const figH = layout.figureH * cfg.scale
  const planeH = figH / FIG_RATIO
  const planeW = planeH * (280 / 260)
  const geom = useMemo(() => new THREE.PlaneGeometry(planeW, planeH), [planeW, planeH])

  const start = useMemo<V3>(() => {
    if (state.status === 'working') return seat.pos
    return layout.restSpots[Math.floor(Math.random() * layout.restSpots.length)]
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const S = useRef({
    pos: [...start] as V3, yaw: state.status === 'working' ? seat.facing : 0, path: [] as V3[], goal: state.status === 'working' ? 'seat' : 'spot',
    dwellUntil: 0, t: Math.random() * 5, dist: 0, spot: -1, restAct: '', actAt: 0,
    segLen: 0, segY0: start[1], lastSeq: '', lastFrame: -1, lastMirror: false,
  })
  const live = useRef(state); live.current = state

  useEffect(() => { fetch(asset(`characters/${cfg.id}/atlas.json`)).then((r) => r.json()).then((m: Atlas) => { setAtlas(m); Object.keys(m.seq).forEach((k) => texture(cfg.id, k)) }) }, [cfg.id])

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), s = S.current, now = (s.t += dt)
    const g = group.current, me = mesh.current, ma = mat.current
    if (!g || !me || !ma || !atlas) return
    const wantWork = live.current.status === 'working'
    const goTo = (to: V3) => { s.path = layout.route(s.pos, to); s.segLen = 0 }

    if (wantWork && s.goal !== 'seat') { s.goal = 'seat'; goTo(seat.pos) }
    if (!wantWork) {
      const needSpot = s.goal === 'seat' || (s.path.length === 0 && now > s.dwellUntil)
      if (needSpot) {
        let i = Math.floor(Math.random() * layout.restSpots.length)
        if (i === s.spot) i = (i + 1) % layout.restSpots.length
        s.goal = 'spot'; s.spot = i; goTo(layout.restSpots[i]); s.dwellUntil = Infinity
      }
    }

    let moving = false
    if (s.path.length) {
      const [tx, ty, tz] = s.path[0]
      if (!s.segLen) { s.segLen = Math.max(0.001, Math.hypot(tx - s.pos[0], tz - s.pos[2])); s.segY0 = s.pos[1] }
      const dx = tx - s.pos[0], dz = tz - s.pos[2], len = Math.hypot(dx, dz), step = SPEED * dt
      if (len <= step) {
        s.pos = [tx, ty, tz]; s.path.shift(); s.segLen = 0
        if (!s.path.length) { s.dwellUntil = now + 9 + Math.random() * 9; s.restAct = ''; s.actAt = now; if (s.goal === 'seat') s.yaw = seat.facing }
      } else {
        const nx = s.pos[0] + (dx / len) * step, nz = s.pos[2] + (dz / len) * step
        const f = 1 - Math.hypot(tx - nx, tz - nz) / s.segLen
        s.pos = [nx, s.segY0 + (ty - s.segY0) * Math.min(1, Math.max(0, f)), nz]
        s.yaw = Math.atan2(dx, dz); s.dist += step; moving = true
      }
    }
    const atSeat = !moving && s.goal === 'seat' && !s.path.length

    g.position.set(s.pos[0], s.pos[1], s.pos[2])
    report?.(cfg.id, s.pos, s.yaw)
    const camAng = Math.atan2(camera.position.x - s.pos[0], camera.position.z - s.pos[2])
    me.rotation.y = camAng
    const rel = wrap(s.yaw - camAng)
    const front = Math.abs(rel) < Math.PI / 4, back = Math.abs(rel) > (3 * Math.PI) / 4
    const mirror = !front && !back && rel > 0

    let seq: string, idx: number
    const n = (k: string) => atlas.seq[k]?.count ?? 1
    if (moving) {
      seq = front ? 'walk_front' : back ? 'walk_back' : 'walk_left'
      idx = Math.floor(s.dist * 3.0) % n(seq)
    } else if (atSeat && atlas.work && atlas.seq[atlas.work] && !back) {
      seq = atlas.work; idx = Math.floor(now * 5) % n(seq)
    } else if (atSeat) {
      seq = 'idle_back'; idx = Math.floor(now * 2) % n(seq)   // 背對鏡頭坐著工作：看背影呼吸
    } else {
      const acts = atlas.rest ?? []
      if (!s.restAct && acts.length && now - s.actAt > 2 && Math.random() < 0.02) { s.restAct = acts[Math.floor(Math.random() * acts.length)]; s.actAt = now }
      if (s.restAct && now - s.actAt < 4.5 && atlas.seq[s.restAct]) { seq = s.restAct; idx = Math.floor((now - s.actAt) * 4) % n(seq) }
      else { if (s.restAct && now - s.actAt >= 4.5) { s.restAct = ''; s.actAt = now + 3 } seq = front ? 'idle_front' : back ? 'idle_back' : 'still_left'; idx = Math.floor(now * 2) % n(seq) }
    }
    const useMirror = (atlas.side?.includes(seq) ?? false) ? mirror : false
    const lift = atSeat ? layout.sitLift : 0
    me.position.y = planeH / 2 - FOOT_DROP * planeH + lift

    if (seq !== s.lastSeq || idx !== s.lastFrame || useMirror !== s.lastMirror) {
      const info = atlas.seq[seq], t = texture(cfg.id, seq)
      t.repeat.set(1 / info.cols, 1 / info.rows)
      t.offset.set((idx % info.cols) / info.cols, 1 - (Math.floor(idx / info.cols) + 1) / info.rows)
      if (ma.map !== t) { ma.map = t; ma.needsUpdate = true }
      me.scale.x = useMirror ? -1 : 1
      s.lastSeq = seq; s.lastFrame = idx; s.lastMirror = useMirror
    }
  })

  return (
    <group ref={group} position={start}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[0.9 * cfg.scale, 0.9 * cfg.scale, 1]} renderOrder={1}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={mesh} geometry={geom} renderOrder={2} onClick={(e) => { e.stopPropagation(); onSelect() }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <meshBasicMaterial ref={mat} transparent alphaTest={0.04} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <TagHtml cfg={cfg} task={state.task} selected={selected} h={figH + 0.35} say={say} />
    </group>
  )
}

import { Html } from '@react-three/drei'
function TagHtml({ cfg, task, selected, h, say }: { cfg: CharCfg; task: string; selected: boolean; h: number; say: string | null }) {
  const t = task?.trim()
  return (
    <Html position={[0, h, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={'tag' + (selected ? ' sel' : '')} style={{ ['--c' as string]: cfg.color }}>
        {say ? <em className="say">{say}</em> : null}
        <b>{cfg.name}</b>
        {t ? <span>{t}</span> : null}
      </div>
    </Html>
  )
}

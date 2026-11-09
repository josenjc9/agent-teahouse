import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mats } from './materials'
import { hipRoof, rng } from './geometry'
import { FLOOR_Y, interiorOf, roomById, rooms, type RoomId } from './world'
import { useOffice } from '../../core/store'

type MatKey = keyof ReturnType<typeof mats>

/** 把幾何依材質分組合併，減少繪製次數 */
class Builder {
  parts = new Map<MatKey, THREE.BufferGeometry[]>()
  add(key: MatKey, g: THREE.BufferGeometry) {
    const ng = g.index ? g.toNonIndexed() : g
    if (!ng.getAttribute('uv')) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.getAttribute('position').count * 2), 2))
    if (ng.getAttribute('color')) ng.deleteAttribute('color')
    const list = this.parts.get(key) ?? []
    list.push(ng)
    this.parts.set(key, list)
  }
  box(key: MatKey, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0))
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    this.add(key, g)
  }
  build() {
    const out: { key: MatKey; geo: THREE.BufferGeometry }[] = []
    for (const [key, list] of this.parts) out.push({ key, geo: mergeGeometries(list)! })
    return out
  }
}

const TOP = 2.95 // 樑的高度（屋簷底）
const PANEL_TOP = 2.4

type Wall = { a: [number, number]; b: [number, number]; kind: 'shoji' | 'plaster' | 'fusuma'; open?: [number, number][] }

/** 沿著一條牆線放面板：紙門／灰泥牆；open 為留空的區段（沿牆的 0..1 比例） */
function addWall(B: Builder, w: Wall) {
  const [x0, z0] = w.a
  const [x1, z1] = w.b
  const len = Math.hypot(x1 - x0, z1 - z0)
  const dx = (x1 - x0) / len
  const dz = (z1 - z0) / len
  const n = Math.max(1, Math.round(len / 0.95))
  const pw = len / n
  const along = (t: number): [number, number] => [x0 + dx * t, z0 + dz * t]
  for (let i = 0; i < n; i++) {
    const tMid = (i + 0.5) / n
    const isOpen = w.open?.some(([s, e]) => tMid >= s && tMid <= e)
    const [cx, cz] = along((i + 0.5) * pw)
    const horizontal = Math.abs(dx) > Math.abs(dz)
    if (!isOpen) {
      const thick = 0.05
      const g = new THREE.BoxGeometry(horizontal ? pw - 0.02 : thick, PANEL_TOP - FLOOR_Y, horizontal ? thick : pw - 0.02)
      g.translate(cx, (FLOOR_Y + PANEL_TOP) / 2, cz)
      B.add(w.kind === 'shoji' ? (i % 3 === 1 ? 'shojiDim' : 'shoji') : w.kind === 'fusuma' ? 'paper' : 'plaster', g)
    }
    // 門框的直條
    const [px, pz] = along(i * pw)
    B.box('darkWood', px - 0.04, px + 0.04, FLOOR_Y, PANEL_TOP, pz - 0.04, pz + 0.04)
  }
  // 上方的欄間（橫樑與灰泥）
  const g = new THREE.BoxGeometry(Math.abs(dx) > 0.5 ? len : 0.08, TOP - PANEL_TOP, Math.abs(dx) > 0.5 ? 0.08 : len)
  g.translate((x0 + x1) / 2, (PANEL_TOP + TOP) / 2, (z0 + z1) / 2)
  B.add(w.kind === 'shoji' ? 'darkWood' : 'plaster', g)
  const lintel = new THREE.BoxGeometry(Math.abs(dx) > 0.5 ? len : 0.12, 0.1, Math.abs(dx) > 0.5 ? 0.12 : len)
  lintel.translate((x0 + x1) / 2, PANEL_TOP, (z0 + z1) / 2)
  B.add('darkWood', lintel)
}

function post(B: Builder, x: number, z: number, h0 = 0, h1 = TOP) {
  B.box('darkWood', x - 0.09, x + 0.09, h0, h1, z - 0.09, z + 0.09)
  // 礎石
  const s = new THREE.CylinderGeometry(0.16, 0.2, 0.18, 8)
  s.translate(x, 0.09, z)
  B.add('stoneDark', s)
}

/** 高架地板：深色地基＋木板面，緣側邊緣露出 */
function platform(B: Builder, x0: number, x1: number, z0: number, z1: number) {
  B.box('darkWood', x0 + 0.25, x1 - 0.25, 0, FLOOR_Y - 0.1, z0 + 0.25, z1 - 0.25)
  B.box('engawa', x0, x1, FLOOR_Y - 0.1, FLOOR_Y, z0, z1)
}

/** 榻榻米鋪滿一塊區域 */
function tatami(B: Builder, x0: number, x1: number, z0: number, z1: number) {
  const r = rng(Math.round(x0 * 13 + z0 * 7))
  const cols = Math.max(1, Math.round((x1 - x0) / 0.9))
  const rowsN = Math.max(1, Math.round((z1 - z0) / 1.8))
  const cw = (x1 - x0) / cols
  const rh = (z1 - z0) / rowsN
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rowsN; j++) {
      const g = new THREE.BoxGeometry(cw - 0.02, 0.04, rh - 0.02)
      if (r() > 0.5) {
        // 交錯擺放的方向：只轉 UV
        const uv = g.attributes.uv as THREE.BufferAttribute
        for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getY(k), uv.getX(k))
      }
      g.translate(x0 + cw * (i + 0.5), FLOOR_Y + 0.02, z0 + rh * (j + 0.5))
      B.add('tatami', g)
    }
}

function bookshelf(B: Builder, x: number, z: number, w: number, h: number, facing: 'south' | 'east' | 'west', seed: number) {
  const r = rng(seed)
  const depth = 0.4
  const horizontal = facing === 'south'
  const W = horizontal ? w : depth
  const D = horizontal ? depth : w
  B.box('wallWood', x - W / 2, x + W / 2, FLOOR_Y, FLOOR_Y + h, z - D / 2, z + D / 2)
  const shelves = Math.round(h / 0.42)
  const spines: MatKey[] = ['cushion', 'cushionBlue', 'paper', 'felt', 'gold', 'bamboo']
  for (let s = 0; s < shelves; s++) {
    const y = FLOOR_Y + 0.08 + s * (h / shelves)
    let t = -w / 2 + 0.06
    while (t < w / 2 - 0.1) {
      const bw = 0.05 + r() * 0.07
      const bh = 0.2 + r() * 0.14
      const key = spines[Math.floor(r() * spines.length)]
      const off = facing === 'south' ? 0.12 : facing === 'east' ? 0.12 : -0.12
      if (horizontal) B.box(key, x + t, x + t + bw, y, y + bh, z + off - 0.12, z + off + 0.12)
      else B.box(key, x + off - 0.12, x + off + 0.12, y, y + bh, z + t, z + t + bw)
      t += bw + 0.01
    }
  }
}

function lowTable(B: Builder, x: number, z: number, w: number, d: number) {
  B.box('wallWood', x - w / 2, x + w / 2, FLOOR_Y + 0.3, FLOOR_Y + 0.36, z - d / 2, z + d / 2)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('darkWood', x + sx * (w / 2 - 0.08) - 0.04, x + sx * (w / 2 - 0.08) + 0.04, FLOOR_Y, FLOOR_Y + 0.3, z + sz * (d / 2 - 0.08) - 0.04, z + sz * (d / 2 - 0.08) + 0.04)
}

function cushion(B: Builder, x: number, z: number, blue = false) {
  const g = new THREE.BoxGeometry(0.5, 0.08, 0.55)
  g.translate(x, FLOOR_Y + 0.06, z)
  B.add(blue ? 'cushionBlue' : 'cushion', g)
}

function andon(B: Builder, x: number, z: number) {
  B.box('darkWood', x - 0.14, x + 0.14, FLOOR_Y, FLOOR_Y + 0.05, z - 0.14, z + 0.14)
  B.box('lanternGlow', x - 0.12, x + 0.12, FLOOR_Y + 0.05, FLOOR_Y + 0.55, z - 0.12, z + 0.12)
  B.box('darkWood', x - 0.14, x + 0.14, FLOOR_Y + 0.55, FLOOR_Y + 0.6, z - 0.14, z + 0.14)
}

function furnish(B: Builder) {
  // 書齋
  bookshelf(B, -8.6, -9.6, 2.4, 1.7, 'south', 1)
  bookshelf(B, -5.6, -9.6, 2.0, 1.7, 'south', 2)
  lowTable(B, -6.8, -7.4, 1.4, 0.8)
  cushion(B, -6.8, -6.6)
  andon(B, -5.4, -7.0)
  B.box('paper', -7.2, -6.8, FLOOR_Y + 0.36, FLOOR_Y + 0.4, -7.6, -7.3)
  B.box('paper', -6.6, -6.2, FLOOR_Y + 0.36, FLOOR_Y + 0.42, -7.5, -7.2)
  // 會議和室：長桌＋坐墊＋床之間
  lowTable(B, 0, -7.6, 3.0, 1.1)
  for (const x of [-1.0, 0, 1.0]) { cushion(B, x, -8.55); cushion(B, x, -6.65) }
  B.box('wallWood', -1.2, 1.2, FLOOR_Y, FLOOR_Y + 0.12, -9.95, -9.35)
  B.box('paper', -0.35, 0.35, FLOOR_Y + 0.6, FLOOR_Y + 1.9, -9.94, -9.9)
  B.box('felt', -0.3, 0.3, FLOOR_Y + 0.75, FLOOR_Y + 0.8, -9.92, -9.88)
  const vase = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 12)
  vase.translate(0.8, FLOOR_Y + 0.27, -9.65)
  B.add('stoneDark', vase)
  andon(B, -2.8, -9.3)
  andon(B, 2.8, -9.3)
  // 工房：工作檯＋發光螢幕＋工具牆
  B.box('wallWood', 4.4, 9.4, FLOOR_Y + 0.8, FLOOR_Y + 0.88, -9.8, -9.0)
  for (const x of [4.5, 6.9, 9.3]) B.box('darkWood', x - 0.05, x + 0.05, FLOOR_Y, FLOOR_Y + 0.8, -9.7, -9.1)
  for (const x of [5.4, 7.6]) {
    B.box('darkWood', x - 0.42, x + 0.42, FLOOR_Y + 0.92, FLOOR_Y + 1.46, -9.6, -9.54)
    B.box('screenGlow', x - 0.38, x + 0.38, FLOOR_Y + 0.96, FLOOR_Y + 1.42, -9.54, -9.52)
    B.box('darkWood', x - 0.04, x + 0.04, FLOOR_Y + 0.88, FLOOR_Y + 0.94, -9.6, -9.5)
  }
  B.box('wallWood', 4.6, 9.2, FLOOR_Y + 1.7, FLOOR_Y + 2.3, -9.95, -9.88)
  const r = rng(5)
  for (let i = 0; i < 9; i++) {
    const x = 4.9 + i * 0.5
    B.box(r() > 0.5 ? 'gold' : 'darkWood', x - 0.03, x + 0.03, FLOOR_Y + 1.78, FLOOR_Y + 2.2, -9.88, -9.84)
  }
  B.box('wallWood', 8.2, 9.4, FLOOR_Y, FLOOR_Y + 0.5, -6.6, -5.9)
  B.box('wallWood', 8.4, 9.2, FLOOR_Y + 0.5, FLOOR_Y + 0.85, -6.5, -6.0)
  cushion(B, 5.4, -8.4, true)
  cushion(B, 7.6, -8.4, true)
  // 藏書室：高書架與衣櫃
  bookshelf(B, -9.6, -2.2, 2.6, 2.1, 'east', 3)
  bookshelf(B, -9.6, 0.9, 2.6, 2.1, 'east', 4)
  B.box('wallWood', -8.0, -6.8, FLOOR_Y, FLOOR_Y + 0.9, -4.2, -3.6)
  for (let i = 0; i < 3; i++) B.box('gold', -7.5, -7.3, FLOOR_Y + 0.2 + i * 0.28, FLOOR_Y + 0.24 + i * 0.28, -3.59, -3.57)
  andon(B, -7.0, 2.0)
  // 展示和室：金屏風＋展示板
  for (let i = 0; i < 6; i++) {
    const z = -3.4 + i * 0.75
    const g = new THREE.BoxGeometry(0.04, 1.5, 0.74)
    g.rotateY(i % 2 ? 0.25 : -0.25)
    g.translate(9.55, FLOOR_Y + 0.75, z)
    B.add('gold', g)
  }
  B.box('darkWood', 7.4, 7.5, FLOOR_Y, FLOOR_Y + 1.6, -0.2, -0.1)
  B.box('darkWood', 7.4, 7.5, FLOOR_Y, FLOOR_Y + 1.6, 1.1, 1.2)
  B.box('screenGlow', 7.42, 7.48, FLOOR_Y + 0.7, FLOOR_Y + 1.5, -0.1, 1.1)
  cushion(B, 6.4, 0.5, true)
  cushion(B, 6.4, -0.6, true)
  andon(B, 9.3, 2.1)
}

/**
 * 剖面牆：鏡頭幾乎從正南方看，北棟房間被前排紙門擋住、東西棟房間被南端山牆擋住。
 * 這幾面牆各自成一組，房裡有人時淡出（像娃娃屋拿掉一面牆），沒人時恢復。
 */
type CutId = 'front-study' | 'front-meeting' | 'front-workshop' | 'gable-west' | 'gable-east'
const CUT_FOR_ROOM: Record<RoomId, CutId | null> = {
  study: 'front-study', meeting: 'front-meeting', workshop: 'front-workshop',
  archive: 'gable-west', preview: 'gable-east', garden: null,
}
const CUT_IDS: CutId[] = ['front-study', 'front-meeting', 'front-workshop', 'gable-west', 'gable-east']

function buildCuts() {
  const cuts = Object.fromEntries(CUT_IDS.map((id) => [id, new Builder()])) as Record<CutId, Builder>
  addWall(cuts['gable-west'], { a: [-10, 2.6], b: [-5.6, 2.6], kind: 'shoji' })
  addWall(cuts['gable-east'], { a: [5.6, 2.6], b: [10, 2.6], kind: 'shoji' })
  addWall(cuts['front-study'], { a: [-10, -5.6], b: [-3.4, -5.6], kind: 'shoji', open: [[0.42, 0.72]] })
  addWall(cuts['front-meeting'], { a: [-3.4, -5.6], b: [3.4, -5.6], kind: 'shoji', open: [[0.3, 0.7]] })
  addWall(cuts['front-workshop'], { a: [3.4, -5.6], b: [10, -5.6], kind: 'shoji', open: [[0.28, 0.58]] })
  return CUT_IDS.map((id) => ({ id, parts: cuts[id].build() }))
}

function buildHouse() {
  const B = new Builder()
  // 北棟、西棟、東棟的地板
  platform(B, -10, 10, -10, -4.4)
  platform(B, -10, -4.4, -4.4, 2.6)
  platform(B, 4.4, 10, -4.4, 2.6)
  // 室內榻榻米
  tatami(B, -9.9, -3.45, -9.9, -5.7)
  tatami(B, -3.35, 3.35, -9.9, -5.7)
  tatami(B, 3.45, 9.9, -9.9, -5.7)
  tatami(B, -9.9, -5.7, -4.3, 2.5)
  tatami(B, 5.7, 9.9, -4.3, 2.5)
  // 外牆（灰泥）
  addWall(B, { a: [-10, -10], b: [10, -10], kind: 'plaster' })
  addWall(B, { a: [-10, -10], b: [-10, 2.6], kind: 'plaster' })
  addWall(B, { a: [10, -10], b: [10, 2.6], kind: 'plaster' })
  // 南端山牆與北棟前排紙門在 buildCuts()（有人時淡出）
  // 東西棟面向庭院的紙門線：中段拉開，就是門
  addWall(B, { a: [-5.6, -4.4], b: [-5.6, 2.6], kind: 'shoji', open: [[0.3, 0.6]] })
  addWall(B, { a: [5.6, -4.4], b: [5.6, 2.6], kind: 'shoji', open: [[0.35, 0.65]] })
  // 房間之間的襖
  addWall(B, { a: [-3.4, -10], b: [-3.4, -5.6], kind: 'fusuma' })
  addWall(B, { a: [3.4, -10], b: [3.4, -5.6], kind: 'fusuma' })
  addWall(B, { a: [-10, -4.4], b: [-5.6, -4.4], kind: 'fusuma' })
  addWall(B, { a: [5.6, -4.4], b: [10, -4.4], kind: 'fusuma' })
  // 緣側外緣的簷柱與樑
  for (const x of [-10, -7, -3.4, 0, 3.4, 7, 10]) post(B, x, -4.45)
  for (const z of [-1.6, 2.55]) { post(B, -4.45, z); post(B, 4.45, z) }
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 2.6], [10, 2.6], [-5.6, 2.6], [5.6, 2.6], [-3.4, -10], [3.4, -10], [-10, -4.4], [10, -4.4]] as const) post(B, x, z)
  B.box('darkWood', -10.1, 10.1, TOP - 0.16, TOP, -4.55, -4.35)
  B.box('darkWood', -4.55, -4.35, TOP - 0.16, TOP, -4.4, 2.7)
  B.box('darkWood', 4.35, 4.55, TOP - 0.16, TOP, -4.4, 2.7)
  B.box('darkWood', -10.1, 10.1, TOP - 0.16, TOP, -10.1, -9.9)
  B.box('darkWood', -10.1, -9.9, TOP - 0.16, TOP, -10, 2.7)
  B.box('darkWood', 9.9, 10.1, TOP - 0.16, TOP, -10, 2.7)
  // 上緣側的踏石
  for (const [x, z] of [[-0.9, -4.05], [6.2, -4.05], [-6.4, -4.05], [-4.1, -0.6], [4.1, -0.2]] as const) {
    const g = new THREE.CylinderGeometry(0.34, 0.4, 0.3, 8)
    g.scale(1.3, 1, 0.8)
    if (Math.abs(x) > 4 && Math.abs(x) < 4.3) g.rotateY(Math.PI / 2)
    g.translate(x, 0.15, z)
    B.add('stone', g)
  }
  furnish(B)
  return B.build()
}

type WingRoof = { id: 'north' | 'west' | 'east'; w: number; d: number; cx: number; cz: number }
const WINGS: WingRoof[] = [
  { id: 'north', w: 20, d: 5.6, cx: 0, cz: -7.2 },
  { id: 'west', w: 5.6, d: 12.6, cx: -7.2, cz: -3.7 },
  { id: 'east', w: 5.6, d: 12.6, cx: 7.2, cz: -3.7 },
]
/** 選取某房間時要掀開哪幾片屋頂 */
const LIFT: Record<RoomId, ('north' | 'west' | 'east')[]> = {
  study: ['north', 'west'], meeting: ['north'], workshop: ['north', 'east'],
  archive: ['west'], preview: ['east'], garden: [],
}

/** 這個位置被哪幾片屋頂蓋住（看不到）：室內＝所屬那棟；東西緣側與北緣側兩端的走廊＝側棟 */
function wingsCovering(p: [number, number, number]): WingRoof['id'][] {
  const [x, y, z] = p
  if (y < 0.3) return []
  const out: WingRoof['id'][] = []
  const room = interiorOf(p)
  if (room) out.push(roomById(room).wing as WingRoof['id'])
  // 東西棟屋頂一路蓋到北棟兩端（x 超過 ±4.4 的地方都在側屋頂底下）
  if (Math.abs(x) > 4.3 && z < 2.7) {
    const side = x < 0 ? 'west' : 'east'
    if (!out.includes(side)) out.push(side)
  }
  void z
  return out
}

function Roof({ wing }: { wing: WingRoof }) {
  const m = mats()
  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null)
  const lift = useRef(0)
  const { geo, materials } = useMemo(() => {
    const geo = hipRoof(wing.w, wing.d, 2.25, 0.9, 0.3)
    return { geo, materials: { roof: m.roof(), ridge: m.ridge.clone(), fascia: m.fascia.clone() } }
  }, [wing, m])
  const ghost = useRef(0)
  useFrame((_, dt) => {
    const { selection, reducedMotion, catPositions } = useOffice.getState()
    let target = selection?.kind === 'room' && LIFT[selection.id as RoomId]?.includes(wing.id) ? 1 : 0
    // 選到在室內的角色：掀開蓋住他的那片屋頂，鏡頭才不會被擋
    if (selection?.kind === 'character') {
      const sp = catPositions[selection.id]
      const inRoom = sp ? interiorOf(sp) : null
      if (sp && (wingsCovering(sp).includes(wing.id) || (inRoom && LIFT[inRoom].includes(wing.id)))) target = 1
    }
    // 有貓在這棟屋頂下面（室內、或被側棟屋簷蓋住的緣側）→ 屋頂淡成半透明，貓才看得到
    const occupied = Object.values(catPositions).some((p) => wingsCovering(p).includes(wing.id))
    const gTarget = occupied && target === 0 ? 1 : 0
    const prev = lift.current
    const prevG = ghost.current
    const ease = reducedMotion ? 1 : Math.min(1, dt * 4.5)
    lift.current += (target - lift.current) * ease
    ghost.current += (gTarget - ghost.current) * ease
    if (Math.abs(lift.current - target) < 0.002) lift.current = target
    if (Math.abs(ghost.current - gTarget) < 0.002) ghost.current = gTarget
    if ((prev === lift.current && prevG === ghost.current) || !group.current) return
    const k = lift.current
    group.current.position.y = TOP + 0.02 + k * 3.2
    const op = (1 - THREE.MathUtils.smoothstep(k, 0.05, 0.75)) * (1 - ghost.current * 0.72)
    for (const mat of Object.values(materials)) {
      mat.opacity = op
      mat.depthWrite = op > 0.98
    }
    group.current.visible = op > 0.01
    // 屋頂動了，影子要重算
    gl.shadowMap.needsUpdate = true
  })
  return (
    <group ref={group} position={[wing.cx, TOP + 0.02, wing.cz]} userData={{ roof: true }}>
      <mesh geometry={geo.roof} material={materials.roof} castShadow receiveShadow />
      <mesh geometry={geo.fascia} material={materials.fascia} castShadow />
      <mesh geometry={geo.ridges} material={materials.ridge} castShadow />
    </group>
  )
}

/* 房間感應區已移除（房間只從底部選單切換，畫面上點到不要跳房間） */

/** 選中的房間裡亮一盞暖燈 */
function RoomLamp() {
  const light = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    const { selection } = useOffice.getState()
    const l = light.current
    if (!l) return
    const room = selection?.kind === 'room' && selection.id !== 'garden' ? rooms.find((r) => r.id === selection.id) : null
    const target = room ? 9 : 0
    l.intensity += (target - l.intensity) * Math.min(1, dt * 3)
    if (room) l.position.set(room.center[0], 2.5, room.center[2])
  })
  return <pointLight ref={light} color="#ffc887" intensity={0} distance={9} decay={1.6} />
}

/** 一面剖面牆：對應的房間裡有貓就淡到幾乎透明 */
function CutWall({ id, parts }: { id: CutId; parts: { key: MatKey; geo: THREE.BufferGeometry }[] }) {
  const m = mats()
  const gl = useThree((s) => s.gl)
  const fade = useRef(0)
  const group = useRef<THREE.Group>(null)
  const materials = useMemo(
    () => parts.map(({ key }) => {
      const mat = (m[key] as THREE.Material).clone()
      mat.transparent = true
      return mat
    }),
    [parts, m],
  )
  useFrame((_, dt) => {
    const { catPositions, reducedMotion } = useOffice.getState()
    const target = Object.values(catPositions).some((p) => {
      const r = interiorOf(p)
      return r !== null && CUT_FOR_ROOM[r] === id
    }) ? 1 : 0
    const prev = fade.current
    fade.current += (target - fade.current) * (reducedMotion ? 1 : Math.min(1, dt * 4))
    if (Math.abs(fade.current - target) < 0.002) fade.current = target
    if (prev === fade.current) return
    const op = 1 - fade.current * 0.88
    for (const mat of materials) {
      mat.opacity = op
      mat.depthWrite = op > 0.98
    }
    if (group.current) group.current.visible = op > 0.02
    gl.shadowMap.needsUpdate = true
  })
  return (
    <group ref={group} userData={{ cut: true }}>
      {parts.map(({ key, geo }, i) => (
        <mesh key={key} geometry={geo} material={materials[i]} castShadow={key !== 'shoji' && key !== 'shojiDim'} receiveShadow />
      ))}
    </group>
  )
}

export function House() {
  const m = mats()
  const parts = useMemo(buildHouse, [])
  const cuts = useMemo(buildCuts, [])
  return (
    <group>
      {parts.map(({ key, geo }) => {
        const mat = m[key] as THREE.Material
        const glow = key === 'shoji' || key === 'shojiDim' || key === 'lanternGlow' || key === 'screenGlow'
        return <mesh key={key} geometry={geo} material={mat} castShadow={!glow && key !== 'tatami'} receiveShadow />
      })}
      {cuts.map((c) => <CutWall key={c.id} id={c.id} parts={c.parts} />)}
      {WINGS.map((w) => <Roof key={w.id} wing={w} />)}
      
      <RoomLamp />
    </group>
  )
}

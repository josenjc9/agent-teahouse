// 和風庭院預設場景的空間定義：房間、座位與走動路線。
// 座標：x 向東、z 向南（朝鏡頭）、y 向上；單位約等於公尺。

export type RoomId = 'meeting' | 'study' | 'workshop' | 'archive' | 'preview' | 'garden'
export type CharacterId = string
export type WingId = 'north' | 'west' | 'east' | null
export type V3 = [number, number, number]

export const FLOOR_Y = 0.55

export type Room = {
  id: RoomId
  label: string
  short: string
  role: string
  purpose: string
  wing: WingId
  /** 房間中心（看的位置） */
  center: V3
  /** 房間範圍 [minX, minZ, maxX, maxZ]，用於點選 */
  bounds: [number, number, number, number]
  /** 室內範圍 [minX, minZ, maxX, maxZ]（紙門線以內）；中庭沒有 */
  interior: [number, number, number, number] | null
  /** 門：門外（緣側上）與門內各一點，就是牆上拉開的那段紙門（House.tsx 的 open 區段） */
  doorOut: V3 | null
  doorIn: V3 | null
  /** 門內到座位之間要經過的點（繞過桌子）；出房時倒著走 */
  aisle: V3[]
  /** 房內座位 [x, z, 面向]；同房多隻依序坐，面向是 yaw（0＝朝南、π＝朝北） */
  seats: [number, number, number][]
  /** 選取時鏡頭位置 */
  view: V3
}

const N = Math.PI       // 面向北
const W = -Math.PI / 2  // 面向西
const E = Math.PI / 2   // 面向東

export const rooms: Room[] = [
  {
    // 紙門 z=-5.6，拉開段 x -7.2～-5.3
    id: 'study', label: '書齋', short: '書齋', role: '研究', purpose: '研究、查證與原始資料',
    wing: 'north', center: [-6.6, 1.2, -7.6], bounds: [-10, -10, -3.4, -4.4],
    interior: [-9.9, -9.9, -3.45, -5.65],
    doorOut: [-6.2, FLOOR_Y, -4.95], doorIn: [-6.2, FLOOR_Y, -6.2],
    // 坐在書架前（夠深才看得到，前面紙門約 1.9 公尺高）；沿東側牆邊繞過桌子和燈
    aisle: [[-4.5, FLOOR_Y, -6.4], [-4.5, FLOOR_Y, -8.2]],
    // 座位限定在鏡頭看得到的格子內（再往西會被西棟擋住，x≈-5.1 有一根柱子）
    seats: [[-4.4, -8.7, N], [-3.8, -8.1, N], [-4.7, -7.6, W], [-3.9, -7.1, W]],
    view: [-4.2, 7.2, 3.2],
  },
  {
    // 拉開段 x -1.5～1.5
    id: 'meeting', label: '會議和室', short: '會議', role: '決策', purpose: '目標、阻塞與待確認項目',
    wing: 'north', center: [0, 1.2, -7.6], bounds: [-3.4, -10, 3.4, -4.4],
    interior: [-3.35, -9.9, 3.35, -5.65],
    doorOut: [0, FLOOR_Y, -4.95], doorIn: [0, FLOOR_Y, -6.1],
    // 坐在長桌後側、面向庭院；從桌子東端繞過去
    aisle: [[2.0, FLOOR_Y, -6.4], [2.0, FLOOR_Y, -8.6]],
    // 正中 x=0 被簷柱擋住，座位錯開
    seats: [[-0.55, -8.55, 0], [0.65, -8.55, 0], [-1.4, -8.55, 0], [1.45, -8.55, 0]],
    view: [1.6, 7.4, 3.6],
  },
  {
    // 拉開段 x 5.3～7.2（門外那段緣側在東棟後方，靠屋頂淡出看得到）
    id: 'workshop', label: '工房', short: '工房', role: '製作', purpose: '介面、工程與素材製作',
    wing: 'north', center: [6.6, 1.2, -7.6], bounds: [3.4, -10, 10, -4.4],
    interior: [3.45, -9.9, 9.9, -5.65],
    doorOut: [6.2, FLOOR_Y, -4.95], doorIn: [6.2, FLOOR_Y, -6.2],
    // 坐在螢幕前；x 要小於 5.5，再往東鏡頭的視線會穿過東棟
    aisle: [[5.2, FLOOR_Y, -6.6]],
    // 工作檯在北牆 x 4.4～9.4，螢幕在 x 5.4／7.6；座位沿工作檯拉開（相鄰至少 1.4 公尺），先坐的兩位分坐兩個螢幕前
    seats: [[5.4, -8.5, N], [7.6, -8.5, N], [9.0, -8.5, N], [4.4, -8.5, N]],
    view: [5.0, 7.2, 3.2],
  },
  {
    // 紙門 x=-5.6，拉開段 z -2.4～-0.4；坐在書架前
    id: 'archive', label: '藏書室', short: '藏書', role: '成果', purpose: '已確認成果與原始文件',
    wing: 'west', center: [-7.9, 1.2, -1.2], bounds: [-10, -4.4, -4.6, 2.6],
    interior: [-9.9, -4.3, -5.65, 2.5],
    doorOut: [-5.0, FLOOR_Y, -1.4], doorIn: [-6.2, FLOOR_Y, -1.4], aisle: [],
    seats: [[-8.7, -2.2, W], [-8.7, 0.9, W], [-8.0, -0.6, W], [-7.2, 0.4, W]],
    view: [2.4, 7.0, 2.6],
  },
  {
    // 紙門 x=5.6，拉開段 z -2.4～-0.4；從鏡頭看只有門後那一帶看得到，座位放那裡、面向金屏風
    id: 'preview', label: '展示和室', short: '展示', role: '驗收', purpose: '代表場景與待驗收成果',
    wing: 'east', center: [7.9, 1.2, -1.2], bounds: [4.6, -4.4, 10, 2.6],
    interior: [5.65, -4.3, 9.9, 2.5],
    doorOut: [5.0, FLOOR_Y, -1.4], doorIn: [6.2, FLOOR_Y, -1.4], aisle: [],
    seats: [[6.45, -2.0, E], [6.85, -1.1, E], [7.25, -2.9, E], [6.45, -0.3, E]],
    view: [-2.4, 7.0, 3.0],
  },
  {
    id: 'garden', label: '中庭', short: '中庭', role: '休息', purpose: '池畔、小橋與休息長椅',
    wing: null, center: [0.4, 0, 2.6], bounds: [-4.4, -3.6, 4.4, 9.5],
    interior: null, doorOut: null, doorIn: null, aisle: [], seats: [],
    view: [0.4, 9.5, 14.5],
  },
]

/** 座標在哪間房的室內（紙門線以內）；不在任何室內回 null */
export function interiorOf(p: V3): RoomId | null {
  if (p[1] < 0.3) return null
  for (const r of rooms) {
    if (!r.interior) continue
    const [x0, z0, x1, z1] = r.interior
    if (p[0] >= x0 && p[0] <= x1 && p[2] >= z0 && p[2] <= z1) return r.id
  }
  return null
}

export function roomById(id: RoomId): Room {
  return rooms.find((r) => r.id === id)!
}

/** 某個座標落在哪個空間（先比室內＋緣側，最後才算中庭）；走在路上時可能回 null */
export function roomAt(x: number, z: number): RoomId | null {
  for (const r of rooms) {
    if (r.id === 'garden') continue
    const [x0, z0, x1, z1] = r.bounds
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r.id
  }
  const g = roomById('garden').bounds
  return x >= g[0] && x <= g[2] && z >= g[1] && z <= g[3] ? 'garden' : null
}

// ── 走動路線 ──────────────────────────────────────────────
// 緣側是一條 ㄇ 字形走道：北側 z=-4.95，西側 x=-5，東側 x=5。
// 庭院地面以水池為界分南北，跨越時走小橋。

const ENGAWA_N = -4.95
const ENGAWA_W = -5.0
const ENGAWA_E = 5.0
const CORNER_NW: V3 = [ENGAWA_W, FLOOR_Y, ENGAWA_N]
const CORNER_NE: V3 = [ENGAWA_E, FLOOR_Y, ENGAWA_N]
/** 小橋（由北往南），y 跟著拱起 */
export const BRIDGE: V3[] = [
  [0.3, 0, 0.3], [0.3, 0.3, 1.3], [0.3, 0.45, 2.5], [0.3, 0.3, 3.7], [0.3, 0, 4.9],
]
const POND_SOUTH_Z = 4.8

type Side = 'north' | 'west' | 'east'

function sideOf(p: V3): Side | null {
  if (p[1] < 0.1) return null
  if (Math.abs(p[2] - ENGAWA_N) < 0.3) return 'north'
  return p[0] < 0 ? 'west' : 'east'
}

/**
 * 從緣側下到庭院（先沿緣側走到下面是庭院的那一段，再到外緣跳下）。最後一點落在庭院地面。
 * 北緣側在 |x|>4.2 的那段下面是東西棟，不能從那裡下去；東西緣側同理只在 z -3.9～2.2 下。
 */
function stepDown(p: V3, side: Side): V3[] {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const out: V3[] = []
  if (side === 'north') {
    const x = clamp(p[0], -4.2, 4.2)
    if (x !== p[0]) out.push([x, FLOOR_Y, ENGAWA_N])
    out.push([x, FLOOR_Y, -4.55], [x, 0, -3.8])
    return out
  }
  const z = clamp(p[2], -3.9, 2.2)
  const ex = side === 'west' ? ENGAWA_W : ENGAWA_E
  if (z !== p[2]) out.push([ex, FLOOR_Y, z])
  const s = side === 'west' ? -1 : 1
  out.push([s * 4.6, FLOOR_Y, z], [s * 3.8, 0, z])
  return out
}

function floorRoute(a: V3, sa: Side, b: V3, sb: Side): V3[] {
  if (sa === sb) return [b]
  const corner = (s: Side) => (s === 'west' ? CORNER_NW : CORNER_NE)
  if (sa === 'north') return [corner(sb), b]
  if (sb === 'north') return [corner(sa), b]
  return [corner(sa), corner(sb), b]
}

function groundRoute(a: V3, b: V3): V3[] {
  const aSouth = a[2] > POND_SOUTH_Z
  const bSouth = b[2] > POND_SOUTH_Z
  if (aSouth === bSouth) return [b]
  const bridge = aSouth ? [...BRIDGE].reverse() : BRIDGE
  return [...bridge, b]
}

/** 緣側與庭院之間的路線（不含室內）；不含起點 */
function outdoorRoute(a: V3, b: V3): V3[] {
  const sa = sideOf(a)
  const sb = sideOf(b)
  if (sa && sb) return floorRoute(a, sa, b, sb)
  const path: V3[] = []
  let cur = a
  if (sa) {
    const down = stepDown(a, sa)
    path.push(...down)
    cur = down[down.length - 1]
  }
  let target = b
  let up: V3[] = []
  if (sb) {
    up = stepDown(b, sb).reverse()
    target = up[0]
  }
  path.push(...groundRoute(cur, target))
  if (sb) path.push(...up.slice(1), b)
  return path
}

/** 從 a 走到 b 的路線：房裡的先走門內→門外出來，要進房的走門外→門內進去；不含起點 */
export function routeBetween(a: V3, b: V3): V3[] {
  const ra = interiorOf(a)
  const rb = interiorOf(b)
  if (ra && ra === rb) return [b]
  const path: V3[] = []
  let start = a
  if (ra) {
    const r = roomById(ra)
    path.push(...[...r.aisle].reverse(), r.doorIn!, r.doorOut!)
    start = r.doorOut!
  }
  let end = b
  let tail: V3[] = []
  if (rb) {
    const r = roomById(rb)
    end = r.doorOut!
    tail = [r.doorIn!, ...r.aisle, b]
  }
  path.push(...outdoorRoute(start, end), ...tail)
  return path
}

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// 簡單 3D 值雜訊（給位移用）
function hash(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}
function smooth(t: number) {
  return t * t * (3 - 2 * t)
}
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
  let v = 0
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++) {
        const w = (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf)
        v += w * hash(xi + dx, yi + dy, zi + dz)
      }
  return v
}

/**
 * 和風寄棟屋頂：屋面微微下凹、四個屋角上翹。
 * w, d 為房體尺寸；回傳 { roof, fascia, ridges }。
 */
export function hipRoof(w: number, d: number, h: number, overhang = 0.9, upturn = 0.28) {
  const W = w + overhang * 2
  const D = d + overhang * 2
  const alongX = W >= D
  const L = alongX ? W : D
  const S = alongX ? D : W
  const r = (L - S) / 2
  // 在「長軸為 x」的座標下建，最後必要時旋轉
  const P = (u: number, v: number, face: number): THREE.Vector3 => {
    // face 0: 南（+z）長邊；1: 北；2: 東三角；3: 西三角
    let ex: number, ez: number, rx: number, rz: number
    if (face === 0) { ex = -L / 2 + u * L; ez = S / 2; rx = -r + u * 2 * r; rz = 0 }
    else if (face === 1) { ex = L / 2 - u * L; ez = -S / 2; rx = r - u * 2 * r; rz = 0 }
    else if (face === 2) { ex = L / 2; ez = S / 2 - u * S; rx = r; rz = 0 }
    else { ex = -L / 2; ez = -S / 2 + u * S; rx = -r; rz = 0 }
    const x = ex + (rx - ex) * v
    const z = ez + (rz - ez) * v
    const corner = Math.pow(Math.abs(u - 0.5) * 2, 5)
    const y = h * Math.pow(v, 1.45) + upturn * corner * Math.pow(1 - v, 2.2)
    return new THREE.Vector3(x, y, z)
  }
  const nu = 28
  const nv = 10
  const faces: THREE.BufferGeometry[] = []
  for (let f = 0; f < 4; f++) {
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const eaveLen = f < 2 ? L : S
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const p = P(i / nu, j / nv, f)
        pos.push(p.x, p.y, p.z)
        uv.push((i / nu) * eaveLen * 0.55, (j / nv) * S * 0.45)
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i
        const b = a + 1
        const c = a + nu + 1
        const e = c + 1
        idx.push(a, b, c, b, e, c)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    faces.push(g)
  }
  // 簷口的厚度板
  const fasciaParts: THREE.BufferGeometry[] = []
  for (let f = 0; f < 4; f++) {
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= nu; i++) {
      const p = P(i / nu, 0, f)
      pos.push(p.x, p.y + 0.02, p.z, p.x, p.y - 0.2, p.z)
    }
    for (let i = 0; i < nu; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((nu + 1) * 4).fill(0), 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    fasciaParts.push(g)
  }
  // 屋脊與四條隅棟
  const ridgeParts: THREE.BufferGeometry[] = []
  const ridge = new THREE.CylinderGeometry(0.14, 0.14, 2 * r + 0.3, 10, 1)
  ridge.rotateZ(Math.PI / 2)
  ridge.translate(0, h + 0.08, 0)
  ridgeParts.push(ridge)
  for (const end of [-1, 1]) {
    const oni = new THREE.BoxGeometry(0.22, 0.42, 0.42)
    oni.translate(end * (r + 0.15), h + 0.22, 0)
    ridgeParts.push(oni)
  }
  for (const [f, u] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) {
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 10; j++) pts.push(P(u, j / 10, f).add(new THREE.Vector3(0, 0.07, 0)))
    ridgeParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.075, 6))
  }
  const roof = mergeGeometries(faces)!
  const fascia = mergeGeometries(fasciaParts)!
  const ridges = mergeGeometries(ridgeParts.map((g) => g.toNonIndexed()).map((g) => { g.deleteAttribute('uv'); return g }))!
  if (!alongX) for (const g of [roof, fascia, ridges]) g.rotateY(Math.PI / 2)
  return { roof, fascia, ridges }
}

/** 一團柔軟的葉叢：多顆變形球合併，帶頂亮底暗的頂點色 */
export function foliageCluster(opts: {
  seed: number
  blobs: number
  radius: number
  spread: [number, number, number]
  colors: string[]
  detail?: number
  flatten?: number
}) {
  const r = rng(opts.seed)
  const parts: THREE.BufferGeometry[] = []
  const cols = opts.colors.map((c) => new THREE.Color(c))
  for (let i = 0; i < opts.blobs; i++) {
    const rad = opts.radius * (0.65 + r() * 0.5)
    const g = new THREE.IcosahedronGeometry(rad, opts.detail ?? 3)
    const cx = (r() - 0.5) * 2 * opts.spread[0]
    const cy = (r() - 0.5) * 2 * opts.spread[1]
    const cz = (r() - 0.5) * 2 * opts.spread[2]
    const pos = g.attributes.position as THREE.BufferAttribute
    const color = new Float32Array(pos.count * 3)
    const base = cols[Math.floor(r() * cols.length)]
    const off = r() * 10
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k)
      const n = noise3(x * 2.2 + off, y * 2.2, z * 2.2)
      const s = 0.82 + n * 0.36
      pos.setXYZ(k, x * s, y * s * (opts.flatten ?? 1), z * s)
      const t = THREE.MathUtils.clamp((y / rad + 1) / 2, 0, 1)
      const shade = 0.55 + t * 0.6 + (n - 0.5) * 0.15
      color[k * 3] = base.r * shade
      color[k * 3 + 1] = base.g * shade
      color[k * 3 + 2] = base.b * shade
    }
    g.setAttribute('color', new THREE.BufferAttribute(color, 3))
    g.translate(cx, cy, cz)
    g.deleteAttribute('uv')
    parts.push(g)
  }
  const merged = mergeGeometries(parts)!
  merged.computeVertexNormals()
  return merged
}

/** 自然石：變形的二十面體 */
export function rockGeometry(seed: number, size: number, flatten = 0.6, detail = 2) {
  const g = new THREE.IcosahedronGeometry(size, detail)
  const pos = g.attributes.position as THREE.BufferAttribute
  const r = rng(seed)
  const off = r() * 20
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k)
    const n = noise3(x * 1.8 + off, y * 1.8, z * 1.8)
    const s = 0.75 + n * 0.5
    pos.setXYZ(k, x * s, Math.max(y * s * flatten, -size * 0.15), z * s)
  }
  g.computeVertexNormals()
  return g
}

/** 漸細的樹幹：沿曲線的管子，越往上越細 */
export function taperedTrunk(points: THREE.Vector3[], r0: number, r1: number, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(points)
  const g = new THREE.TubeGeometry(curve, seg, 1, 8, false)
  const pos = g.attributes.position as THREE.BufferAttribute
  // TubeGeometry 頂點排列：每段 (radial+1) 個
  const ring = 9
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const c = curve.getPointAt(t)
    const rad = r0 + (r1 - r0) * t
    for (let k = 0; k < ring; k++) {
      const idx = i * ring + k
      const x = pos.getX(idx) - c.x, y = pos.getY(idx) - c.y, z = pos.getZ(idx) - c.z
      pos.setXYZ(idx, c.x + x * rad, c.y + y * rad, c.z + z * rad)
    }
  }
  g.computeVertexNormals()
  return g
}

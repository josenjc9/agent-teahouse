import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mats } from './materials'
import { foliageCluster, rng, taperedTrunk, rockGeometry } from './geometry'
import { useOffice } from '../../core/store'
import { BRIDGE } from './world'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function strip(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') n.deleteAttribute(k)
  if (!n.getAttribute('color')) {
    const c = new Float32Array(n.getAttribute('position').count * 3).fill(1)
    n.setAttribute('color', new THREE.BufferAttribute(c, 3))
  }
  return n
}

// ── 樹 ─────────────────────────────────────────────

/** 造型松：彎曲樹幹＋幾層扁平的雲狀葉團 */
function pine(x: number, z: number, s: number, seed: number) {
  const r = rng(seed)
  const trunk = taperedTrunk([V(0, 0, 0), V(0.25, 1.0, 0.1), V(-0.2, 2.0, -0.1), V(0.15, 2.9, 0.05)], 0.2, 0.07)
  const branches: THREE.BufferGeometry[] = [trunk]
  const pads: THREE.BufferGeometry[] = []
  const levels: [number, number, number, number][] = [
    [1.3, 0.9, 0.2, 0.75], [1.9, -0.8, -0.3, 0.65], [2.5, 0.5, -0.5, 0.55], [3.05, 0.1, 0.1, 0.6],
  ]
  levels.forEach(([y, dx, dz, rad], i) => {
    branches.push(taperedTrunk([V(0, y - 0.15, 0), V(dx * 0.6, y, dz * 0.6), V(dx, y + 0.05, dz)], 0.06, 0.03, 8))
    const pad = foliageCluster({ seed: seed * 10 + i, blobs: 5, radius: rad * 0.55, spread: [rad * 0.6, 0.05, rad * 0.5], colors: ['#2f5a37', '#3d6b3f', '#28503a'], detail: 2, flatten: 0.55 })
    pad.translate(dx, y + 0.12, dz)
    pads.push(pad)
  })
  const wood = mergeGeometries(branches.map(strip))!
  const leaves = mergeGeometries(pads)!
  for (const g of [wood, leaves]) { g.rotateY(r() * 6); g.scale(s, s, s); g.translate(x, 0, z) }
  return { wood, leaves }
}

/** 楓：分岔樹幹＋一大團紅橘樹冠 */
function maple(x: number, z: number, s: number, seed: number, palette: string[]) {
  const r = rng(seed)
  const trunk = taperedTrunk([V(0, 0, 0), V(0.1, 0.9, 0), V(-0.1, 1.6, 0.05)], 0.16, 0.08)
  const b1 = taperedTrunk([V(0, 1.2, 0), V(0.5, 1.8, 0.2), V(0.8, 2.2, 0.3)], 0.07, 0.03, 8)
  const b2 = taperedTrunk([V(0, 1.3, 0), V(-0.5, 1.9, -0.2), V(-0.7, 2.3, -0.2)], 0.07, 0.03, 8)
  const crown = foliageCluster({ seed, blobs: 9, radius: 0.62, spread: [0.85, 0.35, 0.75], colors: palette, detail: 3 })
  crown.translate(0, 2.3, 0)
  const wood = mergeGeometries([trunk, b1, b2].map(strip))!
  for (const g of [wood, crown]) { g.rotateY(r() * 6); g.scale(s, s, s); g.translate(x, 0, z) }
  return { wood, leaves: crown }
}

/** 修剪過的灌木（杜鵑球） */
function bush(x: number, z: number, s: number, seed: number, colors = ['#3f6a3a', '#4c7a42', '#365e35']) {
  const g = foliageCluster({ seed, blobs: 3, radius: 0.38, spread: [0.32, 0.06, 0.25], colors, detail: 2, flatten: 0.75 })
  g.scale(s, s, s)
  g.translate(x, 0.28 * s, z)
  return g
}

function Trees() {
  const m = mats()
  const { wood, leaves } = useMemo(() => {
    const items = [
      pine(-3.6, 4.2, 1.05, 3),
      pine(-11.4, 2.0, 0.95, 4),
      pine(11.3, -11.6, 1.1, 5),
      // 原本在 (4.9, 3.4)，剛好擋住展示和室緣側上工作的貓；移到東棟南端外側
      maple(9.4, 4.4, 1.0, 6, ['#c4472b', '#d9612f', '#e07a36', '#b13a26']),
      maple(9.6, 8.6, 0.85, 7, ['#d9862f', '#e6a03c', '#c96a2a']),
      maple(-11.0, -11.6, 0.9, 8, ['#c4472b', '#d16a2c', '#a83824']),
    ]
    const r = rng(21)
    const bushes: THREE.BufferGeometry[] = []
    const spots: [number, number, number][] = [
      [-3.0, 0.9, 0.8], [-2.4, 5.2, 0.7], [3.1, 0.7, 0.75], [2.4, 4.9, 0.6], [-4.2, -2.6, 0.7], [4.3, -2.9, 0.7],
      [-11.6, -6.0, 0.9], [-11.6, -3.0, 0.8], [11.6, -6.5, 0.9], [11.6, -2.5, 0.8], [11.7, 1.6, 0.9],
      [-4.2, 4.9, 0.6], [4.2, -3.4, 0.55], [7.0, 5.0, 0.7], [-4.6, 9.6, 0.8], [5.4, 9.8, 0.7], [-11.6, 9.4, 0.8],
    ]
    spots.forEach(([x, z, s], i) => {
      const pink = i % 5 === 2
      bushes.push(bush(x, z, s * (0.9 + r() * 0.2), 50 + i, pink ? ['#a85a6a', '#b96d79', '#8f4c5d'] : undefined))
    })
    return {
      wood: mergeGeometries(items.map((i) => i.wood))!,
      leaves: mergeGeometries([...items.map((i) => i.leaves), ...bushes])!,
    }
  }, [])
  const leafMat = useMemo(() => m.foliage, [m])
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4b3426', roughness: 0.95, vertexColors: true }), [])
  return (
    <group>
      <mesh geometry={wood} material={barkMat} castShadow receiveShadow />
      <mesh geometry={leaves} material={leafMat} castShadow receiveShadow />
    </group>
  )
}

/** 屋後的竹林：竹竿＋一片片下垂的細長竹葉（instanced） */
function Bamboo() {
  const leafRef = useRef<THREE.InstancedMesh>(null)
  const { stalks, leafGeo, leafMats } = useMemo(() => {
    const r = rng(9)
    const parts: THREE.BufferGeometry[] = []
    const leafMats: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < 52; i++) {
      const x = -12 + r() * 24
      const z = -11.2 - r() * 1.1
      const h = 5.5 + r() * 2.5
      const lean = (r() - 0.5) * 0.12
      const g = new THREE.CylinderGeometry(0.06, 0.075, h, 7, 6)
      const pos = g.attributes.position as THREE.BufferAttribute
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k) + h / 2
        // 竹節：每隔一段稍微鼓起
        const node = Math.abs(((y / 0.9) % 1) - 0.5) < 0.04 ? 1.25 : 1
        pos.setX(k, pos.getX(k) * node + lean * y)
        pos.setZ(k, pos.getZ(k) * node)
      }
      g.computeVertexNormals()
      g.translate(x, h / 2, z)
      parts.push(strip(g))
      // 竹竿上半段長出細枝，每枝一叢下垂的葉
      const sprays = 12 + Math.floor(r() * 6)
      for (let s = 0; s < sprays; s++) {
        const y = h * (0.45 + r() * 0.55)
        const ang = r() * Math.PI * 2
        const reach = 0.25 + r() * 0.45
        const bx = x + lean * y + Math.cos(ang) * reach
        const bz = z + Math.sin(ang) * reach
        const leaves = 5 + Math.floor(r() * 4)
        for (let l = 0; l < leaves; l++) {
          e.set(0.9 + r() * 0.9, ang + (r() - 0.5) * 1.6, (r() - 0.5) * 0.6, 'YXZ')
          q.setFromEuler(e)
          const sc = 0.8 + r() * 0.5
          leafMats.push(new THREE.Matrix4().compose(new THREE.Vector3(bx + (r() - 0.5) * 0.15, y + (r() - 0.5) * 0.2, bz + (r() - 0.5) * 0.15), q, new THREE.Vector3(sc, sc, sc)))
        }
      }
    }
    // 一片竹葉：細長的菱形，從根部長出去
    const leafGeo = new THREE.BufferGeometry()
    const L = 0.55, W = 0.075
    leafGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, W, 0, L * 0.35, 0, 0, L, -W, 0, L * 0.35], 3))
    leafGeo.setIndex([0, 1, 2, 0, 2, 3])
    leafGeo.computeVertexNormals()
    return { stalks: mergeGeometries(parts)!, leafGeo, leafMats }
  }, [])
  const stalkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#86a456', roughness: 0.55, vertexColors: true }), [])
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }), [])
  const onLeaves = (im: THREE.InstancedMesh | null) => {
    if (!im || im.userData.ready) return
    const r = rng(31)
    const tones = ['#5d8a3c', '#4c7a35', '#6d9845', '#3f6b30', '#7aa04c'].map((c) => new THREE.Color(c))
    leafMats.forEach((mtx, i) => {
      im.setMatrixAt(i, mtx)
      im.setColorAt(i, tones[Math.floor(r() * tones.length)])
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
    im.userData.ready = true
    leafRef.current = im
  }
  return (
    <group>
      <mesh geometry={stalks} material={stalkMat} castShadow />
      <instancedMesh ref={onLeaves} args={[leafGeo, leafMat, leafMats.length]} castShadow />
    </group>
  )
}

// ── 石燈籠 ──────────────────────────────────────────

function lanternGeometry() {
  const lathe = (pts: [number, number][], seg = 6) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
  const base = lathe([[0, 0], [0.26, 0], [0.26, 0.08], [0.18, 0.14], [0.08, 0.16], [0, 0.16]])
  const pole = new THREE.CylinderGeometry(0.075, 0.09, 0.55, 8)
  pole.translate(0, 0.43, 0)
  const tray = lathe([[0, 0.7], [0.22, 0.7], [0.25, 0.78], [0, 0.8]])
  const cap = lathe([[0, 1.12], [0.36, 1.12], [0.4, 1.17], [0.22, 1.26], [0.1, 1.34], [0, 1.36]])
  const jewel = new THREE.SphereGeometry(0.07, 8, 6)
  jewel.translate(0, 1.42, 0)
  const stone = mergeGeometries([base, pole, tray, cap, jewel].map((g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n }))!
  const light = new THREE.BoxGeometry(0.26, 0.3, 0.26)
  light.translate(0, 0.96, 0)
  const frame = new THREE.BoxGeometry(0.3, 0.32, 0.12)
  frame.translate(0, 0.96, 0)
  return { stone, light }
}

const LANTERN_SPOTS: [number, number, number][] = [[-2.5, 0.6, 1], [2.3, 5.5, 0.95], [-6.0, 9.2, 0.85], [8.2, 3.2, 0.9], [-4.1, 3.0, 0.8]]

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,190,110,0.85)')
  grad.addColorStop(0.35, 'rgba(255,160,80,0.35)')
  grad.addColorStop(1, 'rgba(255,140,60,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 燈籠與紙窗灑在地上的暖光（貼地的柔光片，不用真燈） */
function LightPools() {
  const tex = useMemo(glowTexture, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }), [tex])
  const pools: { p: [number, number, number]; s: [number, number] }[] = [
    ...LANTERN_SPOTS.map(([x, z, k]) => ({ p: [x, 0.04, z] as [number, number, number], s: [2.6 * k, 2.6 * k] as [number, number] })),
    { p: [-6.7, 0.58, -5.0], s: [6.5, 1.6] },
    { p: [0, 0.58, -5.0], s: [6.8, 1.6] },
    { p: [6.7, 0.58, -5.0], s: [6.5, 1.6] },
    { p: [-7.8, 0.05, 3.4], s: [5, 1.8] },
    { p: [7.8, 0.05, 3.4], s: [5, 1.8] },
  ]
  return (
    <group>
      {pools.map((q, i) => (
        <mesh key={i} position={q.p} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={3}>
          <planeGeometry args={q.s} />
        </mesh>
      ))}
    </group>
  )
}

/** 黃昏庭院裡慢慢飄的螢火 */
function Fireflies() {
  const ref = useRef<THREE.Points>(null)
  const { geo, seeds } = useMemo(() => {
    const r = rng(64)
    const n = 34
    const pos = new Float32Array(n * 3)
    const seeds: number[][] = []
    for (let i = 0; i < n; i++) {
      const s = [-4 + r() * 8.5, 0.5 + r() * 1.6, -3 + r() * 11, r() * 10]
      seeds.push(s)
      pos.set([s[0], s[1], s[2]], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geo, seeds }
  }, [])
  const mat = useMemo(() => new THREE.PointsMaterial({ color: '#ffd889', size: 0.11, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [])
  useFrame((st) => {
    const { paused, reducedMotion } = useOffice.getState()
    if (!ref.current) return
    ref.current.visible = !reducedMotion
    if (paused || reducedMotion) return
    const t = st.clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute
    seeds.forEach(([x, y, z, ph], i) => {
      pos.setXYZ(i, x + Math.sin(t * 0.3 + ph) * 0.6, y + Math.sin(t * 0.7 + ph * 2) * 0.25, z + Math.cos(t * 0.25 + ph) * 0.6)
    })
    pos.needsUpdate = true
    mat.opacity = 0.65 + Math.sin(t * 1.7) * 0.25
  })
  return <points ref={ref} geometry={geo} material={mat} />
}

function Lanterns() {
  const m = mats()
  const { stone, light } = useMemo(() => {
    const { stone, light } = lanternGeometry()
    const spots = LANTERN_SPOTS
    const s: THREE.BufferGeometry[] = []
    const l: THREE.BufferGeometry[] = []
    for (const [x, z, k] of spots) {
      const a = stone.clone(); a.scale(k, k, k); a.translate(x, 0, z); s.push(a)
      const b = light.clone(); b.scale(k, k, k); b.translate(x, 0, z); l.push(b)
    }
    return { stone: mergeGeometries(s)!, light: mergeGeometries(l)! }
  }, [])
  return (
    <group>
      <mesh geometry={stone} material={m.stone} castShadow receiveShadow />
      <mesh geometry={light} material={m.lanternGlow} />
    </group>
  )
}

// ── 太鼓橋 ──────────────────────────────────────────

function Bridge() {
  const m = mats()
  const { deck, rails } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(BRIDGE.map(([x, y, z]) => V(x, y + 0.02, z)))
    const deckParts: THREE.BufferGeometry[] = []
    const n = 22
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const p = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      const g = new THREE.BoxGeometry(1.05, 0.07, 0.19)
      g.rotateX(-Math.atan2(tan.y, tan.z))
      g.translate(p.x, p.y, p.z)
      deckParts.push(g.toNonIndexed())
    }
    const railParts: THREE.BufferGeometry[] = []
    for (const side of [-0.52, 0.52]) {
      const pts = BRIDGE.map(([x, y, z]) => V(x + side, y + 0.55, z))
      railParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.045, 6).toNonIndexed())
      const mid = BRIDGE.map(([x, y, z]) => V(x + side, y + 0.3, z))
      railParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mid), 30, 0.03, 6).toNonIndexed())
      for (let i = 0; i <= 6; i++) {
        const p = curve.getPointAt(i / 6)
        const g = new THREE.BoxGeometry(0.09, 0.62, 0.09)
        g.translate(p.x + side, p.y + 0.3, p.z)
        railParts.push(g.toNonIndexed())
        if (i === 0 || i === 6) {
          const cap = new THREE.SphereGeometry(0.07, 8, 6)
          cap.scale(1, 1.4, 1)
          cap.translate(p.x + side, p.y + 0.66, p.z)
          railParts.push(cap.toNonIndexed())
        }
      }
    }
    // 橋墩
    for (const t of [0.22, 0.78]) {
      const p = curve.getPointAt(t)
      for (const side of [-0.42, 0.42]) {
        const g = new THREE.BoxGeometry(0.12, p.y + 0.6, 0.12)
        g.translate(p.x + side, (p.y - 0.6) / 2, p.z)
        railParts.push(g.toNonIndexed())
      }
    }
    const clean = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map((g) => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g }))!
    return { deck: clean(deckParts), rails: clean(railParts) }
  }, [])
  return (
    <group>
      <mesh geometry={deck} material={m.floorWood} castShadow receiveShadow />
      <mesh geometry={rails} material={m.lacquer} castShadow />
    </group>
  )
}

// ── 茶席（野點傘＋緋毛氈長椅）──────────────────────────

function TeaSeat() {
  const m = mats()
  const { wood, felt, umbrella, pole } = useMemo(() => {
    const x = 7.6, z = 6.6
    const wood: THREE.BufferGeometry[] = []
    const box = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
      const g = new THREE.BoxGeometry(w, h, d); g.translate(px, py, pz); wood.push(g.toNonIndexed())
    }
    box(2.2, 0.08, 0.8, x, 0.42, z)
    for (const sx of [-0.95, 0.95]) for (const sz of [-0.3, 0.3]) box(0.08, 0.42, 0.08, x + sx, 0.21, z + sz)
    const feltG = new THREE.BoxGeometry(2.3, 0.03, 0.95)
    feltG.translate(x, 0.475, z)
    const umb = new THREE.ConeGeometry(1.7, 0.55, 24, 1, true)
    umb.translate(x + 0.3, 2.4, z - 0.4)
    const poleG = new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6)
    poleG.translate(x + 0.3, 1.2, z - 0.4)
    const clean = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map((g) => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g }))!
    return { wood: clean(wood), felt: feltG, umbrella: umb, pole: poleG }
  }, [])
  const umbMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8352c', roughness: 0.7, side: THREE.DoubleSide, emissive: '#5a120c', emissiveIntensity: 0.25 }), [])
  return (
    <group>
      <mesh geometry={wood} material={m.floorWood} castShadow receiveShadow />
      <mesh geometry={felt} material={m.felt} receiveShadow />
      <mesh geometry={umbrella} material={umbMat} castShadow />
      <mesh geometry={pole} material={m.darkWood} castShadow />
    </group>
  )
}

/** 台座邊緣散落的石頭 */
function EdgeRocks() {
  const m = mats()
  const geo = useMemo(() => {
    const r = rng(88)
    const parts: THREE.BufferGeometry[] = []
    const spots: [number, number][] = [[-12.0, 6.0], [12.0, 5.2], [11.6, 9.8], [-11.9, -1.0], [-4.6, 10.2], [5.0, 10.3], [12.1, -9.0]]
    spots.forEach(([x, z], i) => {
      const g = rockGeometry(500 + i, 0.35 + r() * 0.3, 0.6)
      g.translate(x, 0.05, z)
      parts.push(g)
    })
    return mergeGeometries(parts)!
  }, [])
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
}

export function Garden() {
  return (
    <group>
      <Trees />
      <Bamboo />
      <Lanterns />
      <LightPools />
      <Fireflies />
      <Bridge />
      <TeaSeat />
      <EdgeRocks />
    </group>
  )
}

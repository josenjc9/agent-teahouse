import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mats } from './materials'
import { mossTexture, earthTexture } from './textures'
import { rng, rockGeometry } from './geometry'
import { useOffice } from '../../core/store'

// 台座：一塊懸浮在黃昏天空裡的庭院地盤（含挖空的水池）

export const PLATE = { minX: -12.5, maxX: 12.5, minZ: -12.6, maxZ: 10.8, depth: 1.15 }
export const POND = { cx: 0.3, cz: 2.7, rx: 2.75, rz: 1.75 }

/** 水池輪廓（世界座標 x,z） */
export function pondOutline(n = 64): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wob = 1 + 0.09 * Math.sin(a * 3 + 0.6) + 0.06 * Math.sin(a * 5 + 1.9)
    pts.push([POND.cx + Math.cos(a) * POND.rx * wob, POND.cz + Math.sin(a) * POND.rz * wob])
  }
  return pts
}

function roundedRect(shape: THREE.Shape | THREE.Path, x0: number, y0: number, x1: number, y1: number, r: number) {
  shape.moveTo(x0 + r, y0)
  shape.lineTo(x1 - r, y0)
  shape.quadraticCurveTo(x1, y0, x1, y0 + r)
  shape.lineTo(x1, y1 - r)
  shape.quadraticCurveTo(x1, y1, x1 - r, y1)
  shape.lineTo(x0 + r, y1)
  shape.quadraticCurveTo(x0, y1, x0, y1 - r)
  shape.lineTo(x0, y0 + r)
  shape.quadraticCurveTo(x0, y0, x0 + r, y0)
}

function Plate() {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    // shape 的 y = -世界 z
    roundedRect(s, PLATE.minX, -PLATE.maxZ, PLATE.maxX, -PLATE.minZ, 1.6)
    const hole = new THREE.Path()
    const pts = pondOutline()
    hole.moveTo(pts[0][0], -pts[0][1])
    for (let i = pts.length - 1; i >= 0; i--) hole.lineTo(pts[i][0], -pts[i][1])
    s.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(s, { depth: PLATE.depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, -PLATE.depth - 0.12, 0)
    return g
  }, [])
  const materials = useMemo(() => {
    const moss = mossTexture().clone()
    moss.repeat.set(0.16, 0.16)
    moss.needsUpdate = true
    const earth = earthTexture().clone()
    earth.repeat.set(0.12, 1 / (PLATE.depth + 0.24))
    earth.offset.set(0, 0.12 / (PLATE.depth + 0.24))
    earth.needsUpdate = true
    return [
      new THREE.MeshStandardMaterial({ map: moss, color: '#c9d6a8', roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ map: earth, roughness: 1 }),
    ]
  }, [])
  return <mesh geometry={geo} material={materials} receiveShadow />
}

function Pond() {
  const m = mats()
  const { water, bottom, rim, lilies } = useMemo(() => {
    const pts = pondOutline()
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
    const water = new THREE.ShapeGeometry(shape, 24)
    water.rotateX(-Math.PI / 2)
    const bottom = water.clone()
    water.translate(0, -0.2, 0)
    bottom.translate(0, -0.75, 0)
    // 池邊的石頭
    const r = rng(42)
    const rocks: THREE.BufferGeometry[] = []
    for (let i = 0; i < pts.length; i += 2) {
      const [x, z] = pts[i]
      if (Math.abs(x - 0.3) < 0.7) continue // 橋墩位置留空
      const g = rockGeometry(100 + i, 0.2 + r() * 0.16, 0.55, 1)
      g.rotateY(r() * 6)
      const dx = x - POND.cx, dz = z - POND.cz
      const len = Math.hypot(dx, dz)
      g.translate(x + (dx / len) * 0.05, -0.04, z + (dz / len) * 0.05)
      rocks.push(g)
    }
    const rim = mergeGeometries(rocks)!
    const lilyParts: THREE.BufferGeometry[] = []
    for (const [x, z, s] of [[-1.4, 2.2, 0.26], [-1.0, 3.3, 0.2], [1.8, 3.4, 0.24], [2.2, 2.0, 0.18], [-1.8, 3.0, 0.16]] as const) {
      const g = new THREE.CircleGeometry(s, 16, 0.3, Math.PI * 2 - 0.4)
      g.rotateX(-Math.PI / 2)
      g.translate(x, -0.185, z)
      lilyParts.push(g)
    }
    return { water, bottom, rim, lilies: mergeGeometries(lilyParts)! }
  }, [])
  return (
    <group>
      <mesh geometry={bottom} material={m.basin} />
      <Koi />
      <mesh geometry={water} material={m.water} renderOrder={2} />
      <mesh geometry={lilies} material={m.lily} />
      <mesh geometry={rim} material={m.stone} castShadow receiveShadow />
    </group>
  )
}

function Koi() {
  const m = mats()
  const group = useRef<THREE.Group>(null)
  const fish = useMemo(() => {
    const body = new THREE.SphereGeometry(0.1, 12, 8)
    body.scale(0.7, 0.45, 1.6)
    const tail = new THREE.ConeGeometry(0.07, 0.14, 6)
    tail.rotateX(-Math.PI / 2)
    tail.scale(1, 0.3, 1)
    tail.translate(0, 0, -0.2)
    return mergeGeometries([body.toNonIndexed(), tail.toNonIndexed()])!
  }, [])
  const koi = [
    { r: 1.4, s: 0.22, ph: 0, mat: m.koiOrange },
    { r: 1.0, s: -0.17, ph: 2, mat: m.koiWhite },
    { r: 1.8, s: 0.14, ph: 4, mat: m.koiOrange },
  ]
  useFrame((st) => {
    const { paused, reducedMotion } = useOffice.getState()
    if (paused || reducedMotion || !group.current) return
    const t = st.clock.elapsedTime
    group.current.children.forEach((c, i) => {
      const k = koi[i]
      const a = t * k.s + k.ph
      c.position.set(POND.cx + Math.cos(a) * k.r, -0.3, POND.cz + Math.sin(a) * k.r * 0.55)
      c.rotation.y = -a + (k.s > 0 ? 0 : Math.PI)
    })
  })
  return (
    <group ref={group}>
      {koi.map((k, i) => (
        <mesh key={i} geometry={fish} material={k.mat} position={[POND.cx + k.r, -0.3, POND.cz]} />
      ))}
    </group>
  )
}

/** 踏石路徑 */
function SteppingStones() {
  const m = mats()
  const geo = useMemo(() => {
    const r = rng(77)
    const lines: [number, number][][] = [
      [[0.3, 10.2], [0.3, 5.2]],
      [[0.3, 0.0], [-0.9, -3.6]],
      [[0.3, 0.0], [3.6, -0.2]],
      [[0.3, 0.0], [-3.6, -0.6]],
      [[-0.9, -3.6], [-6.4, -3.6]],
      [[3.6, -0.2], [6.2, -3.6]],
      [[0.3, 6.2], [3.4, 6.2]],
    ]
    const parts: THREE.BufferGeometry[] = []
    for (const [[x0, z0], [x1, z1]] of lines) {
      const len = Math.hypot(x1 - x0, z1 - z0)
      const n = Math.max(2, Math.round(len / 0.72))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const g = new THREE.CylinderGeometry(0.26 + r() * 0.08, 0.3 + r() * 0.08, 0.1, 9)
        const pos = g.attributes.position as THREE.BufferAttribute
        for (let k = 0; k < pos.count; k++) {
          const ang = Math.atan2(pos.getZ(k), pos.getX(k))
          const w = 1 + 0.12 * Math.sin(ang * 3 + i)
          pos.setX(k, pos.getX(k) * w * 1.2)
          pos.setZ(k, pos.getZ(k) * w * 0.9)
        }
        g.computeVertexNormals()
        g.rotateY(r() * 3)
        g.translate(x0 + (x1 - x0) * t + (r() - 0.5) * 0.15, 0.03, z0 + (z1 - z0) * t + (r() - 0.5) * 0.15)
        parts.push(g.toNonIndexed())
      }
    }
    return mergeGeometries(parts)!
  }, [])
  return <mesh geometry={geo} material={m.stepStone} receiveShadow castShadow />
}

/** 枯山水：耙紋白砂、三塊立石與砂紋圈 */
function DryGarden() {
  const m = mats()
  const { sand, curb, rocks, rings } = useMemo(() => {
    const x0 = -11.6, x1 = -5.2, z0 = 3.8, z1 = 9.8
    const s = new THREE.Shape()
    roundedRect(s, x0, -z1, x1, -z0, 0.4)
    const sand = new THREE.ShapeGeometry(s, 6)
    sand.rotateX(-Math.PI / 2)
    sand.translate(0, 0.025, 0)
    const uv = sand.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.35, uv.getY(i) * 0.35)
    const curbParts: THREE.BufferGeometry[] = []
    const add = (cx: number, cz: number, w: number, d: number) => {
      const g = new THREE.BoxGeometry(w, 0.12, d)
      g.translate(cx, 0.06, cz)
      curbParts.push(g)
    }
    add((x0 + x1) / 2, z0 - 0.05, x1 - x0 + 0.2, 0.14)
    add((x0 + x1) / 2, z1 + 0.05, x1 - x0 + 0.2, 0.14)
    add(x0 - 0.05, (z0 + z1) / 2, 0.14, z1 - z0)
    add(x1 + 0.05, (z0 + z1) / 2, 0.14, z1 - z0)
    const rockSpots: [number, number, number, number][] = [[-9.6, 5.6, 0.62, 1.0], [-8.7, 6.1, 0.38, 0.9], [-7.0, 8.3, 0.5, 0.75]]
    const rockParts: THREE.BufferGeometry[] = []
    const ringParts: THREE.BufferGeometry[] = []
    rockSpots.forEach(([x, z, s, f], i) => {
      const g = rockGeometry(300 + i, s, f, 2)
      g.translate(x, s * 0.25, z)
      rockParts.push(g)
      for (let k = 1; k <= 3; k++) {
        const t = new THREE.TorusGeometry(s * 1.1 + k * 0.22, 0.025, 4, 40)
        t.rotateX(Math.PI / 2)
        t.translate(x, 0.035, z)
        ringParts.push(t)
      }
    })
    return { sand, curb: mergeGeometries(curbParts)!, rocks: mergeGeometries(rockParts)!, rings: mergeGeometries(ringParts)! }
  }, [])
  return (
    <group>
      <mesh geometry={sand} material={m.gravel} receiveShadow />
      <mesh geometry={curb} material={m.stoneDark} receiveShadow />
      <mesh geometry={rocks} material={m.stone} castShadow receiveShadow />
      <mesh geometry={rings} material={m.gravel} />
    </group>
  )
}

export function Ground() {
  return (
    <group>
      <Plate />
      <Pond />
      <SteppingStones />
      <DryGarden />
    </group>
  )
}

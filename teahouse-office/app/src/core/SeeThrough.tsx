import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useOffice } from './store'

/**
 * 擋到角色的東西自動半透明（使用者需求：不要擋到角色）。
 * 每秒約 8 次，從鏡頭往每個角色的身體拉射線；路上擋住的物件淡到 FADE，不擋了再慢慢恢復。
 * 屋頂有自己的掀開／淡出邏輯、角色本身與看不見的感應區不處理。
 */
const FADE = 0.22
const HEIGHTS = [0.35, 0.9]

type Faded = { orig: THREE.Material; clone: THREE.Material; base: number; seen: number }

export function SeeThrough() {
  const { camera, scene } = useThree()
  const faded = useRef(new Map<THREE.Mesh, Faded>())
  const acc = useRef(0)
  const ray = useRef(new THREE.Raycaster())

  const skip = (o: THREE.Object3D) => {
    if ((o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) return true
    let n: THREE.Object3D | null = o
    while (n) {
      if (n.userData.roof || n.userData.cat) return true
      n = n.parent
    }
    const m = (o as THREE.Mesh).material
    if (!m || Array.isArray(m)) return true
    return m.visible === false || (!faded.current.has(o as THREE.Mesh) && (m as THREE.MeshStandardMaterial).opacity < 0.5)
  }

  useFrame((_, dt) => {
    const { catPositions, reducedMotion } = useOffice.getState()
    const now = performance.now() / 1000
    acc.current += dt
    if (acc.current > 0.12) {
      acc.current = 0
      const r = ray.current
      r.camera = camera
      for (const p of Object.values(catPositions)) {
        for (const h of HEIGHTS) {
          const target = new THREE.Vector3(p[0], p[1] + h, p[2])
          const dir = target.clone().sub(camera.position)
          const dist = dir.length()
          r.set(camera.position, dir.normalize())
          r.far = dist - 0.25
          for (const hit of r.intersectObjects(scene.children, true)) {
            const mesh = hit.object as THREE.Mesh
            if (skip(mesh)) continue
            let f = faded.current.get(mesh)
            if (!f) {
              const orig = mesh.material as THREE.Material
              const clone = orig.clone()
              clone.transparent = true
              f = { orig, clone, base: (orig as THREE.MeshStandardMaterial).opacity ?? 1, seen: now }
              mesh.material = clone
              faded.current.set(mesh, f)
            }
            f.seen = now
          }
        }
      }
    }
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__seeThrough = faded.current.size
    // 淡入淡出
    const ease = reducedMotion ? 1 : Math.min(1, dt * 6)
    for (const [mesh, f] of faded.current) {
      const blocking = now - f.seen < 0.35
      const want = blocking ? FADE : f.base
      const m = f.clone as THREE.MeshStandardMaterial
      m.opacity += (want - m.opacity) * ease
      m.depthWrite = m.opacity > 0.95
      if (!blocking && Math.abs(m.opacity - f.base) < 0.01) {
        mesh.material = f.orig
        f.clone.dispose()
        faded.current.delete(mesh)
      }
    }
  })
  return null
}

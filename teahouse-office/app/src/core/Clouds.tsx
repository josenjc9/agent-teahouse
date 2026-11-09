import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useOffice } from './store'

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/** 台座下方慢慢漂的雲 */
export function Clouds({ stops }: { stops: [string, string, string] }) {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, stops[0])
    grad.addColorStop(0.45, stops[1])
    grad.addColorStop(1, stops[2])
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [stops])
  const clouds = useMemo(() => {
    const r = rng(12)
    return Array.from({ length: 14 }, () => ({
      x: (r() - 0.5) * 50, y: -4 - r() * 6, z: (r() - 0.5) * 40 - 4, s: 8 + r() * 10, v: 0.15 + r() * 0.25,
    }))
  }, [])
  useFrame((_, dt) => {
    const { paused, reducedMotion } = useOffice.getState()
    if (paused || reducedMotion || !group.current) return
    group.current.children.forEach((c, i) => {
      c.position.x += clouds[i].v * dt
      if (c.position.x > 30) c.position.x = -30
    })
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.s * 1.8, c.s * 0.7, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.75} fog={false} />
        </sprite>
      ))}
    </group>
  )
}


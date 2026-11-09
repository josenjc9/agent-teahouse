import * as THREE from 'three'

/** 用 canvas 程式畫貼圖（不依賴外部圖檔）。每個 key 只產生一次。 */
const cache = new Map<string, THREE.Texture>()

export function makeTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts?: { color?: boolean; repeat?: [number, number] }) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (opts?.repeat) t.repeat.set(...opts.repeat)
  if (opts?.color !== false) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

/** 穩定的偽亂數（同一張圖每次長一樣） */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

import * as THREE from 'three'

/** 時段設定：天空漸層、光色與強度、霧、泛光、窗燈／石燈亮度。scene.json 的 timeOfDay 選 dusk／day／night。 */
export type Tod = {
  sky: { top: number[]; mid: number[]; hor: number[]; low: number[]; deep: number[]; sunCol: number[] }
  sunDir: [number, number, number]
  sunColor: string; sunIntensity: number
  hemi: [string, string, number]
  fill: { color: string; intensity: number }
  fog: string
  bloom: { intensity: number; threshold: number }
  vignette: number
  /** 各種發光物的亮度倍率（名稱由場景預設自訂，例如和風庭院的 window／lantern） */
  glow: Record<string, number>
  /** 台座下方雲的三段漸層色 */
  cloud: [string, string, string]
}


export const vec = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2])

import * as THREE from 'three'
import * as T from './textures'

// 全場共用材質（只建一次）。顏色走黃昏暖色：木頭偏紅褐、紙窗透暖光、瓦片藍灰。

let M: ReturnType<typeof build> | null = null

function build() {
  const wood = T.woodTexture()
  const darkWood = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.75 })
  const wallWood = new THREE.MeshStandardMaterial({ color: '#6b4630', roughness: 0.7 })
  const floorWood = new THREE.MeshStandardMaterial({ color: '#c08a5c', map: wood, roughness: 0.55 })
  const engawa = new THREE.MeshStandardMaterial({ color: '#b07a4e', map: wood, roughness: 0.45, metalness: 0.0 })
  const plaster = new THREE.MeshStandardMaterial({ color: '#efe4cf', map: T.plasterTexture(), roughness: 0.95 })
  const tatami = new THREE.MeshStandardMaterial({ map: T.tatamiTexture(), roughness: 0.9 })
  const shoji = new THREE.MeshStandardMaterial({
    map: T.shojiTexture(),
    emissiveMap: T.shojiEmissive(),
    emissive: new THREE.Color('#ffb060'),
    emissiveIntensity: 1.35,
    roughness: 0.9,
  })
  const shojiDim = new THREE.MeshStandardMaterial({
    map: T.shojiTexture(),
    emissiveMap: T.shojiEmissive(),
    emissive: new THREE.Color('#ff9f4a'),
    emissiveIntensity: 0.45,
    roughness: 0.9,
  })
  const roofTex = T.roofTileTexture()
  const roof = (opacity = 1) =>
    new THREE.MeshStandardMaterial({ color: '#c4cad8', map: roofTex, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity })
  const ridge = new THREE.MeshStandardMaterial({ color: '#2a2f39', roughness: 0.5, metalness: 0.2, transparent: true })
  const fascia = new THREE.MeshStandardMaterial({ color: '#3d2a1d', roughness: 0.7, side: THREE.DoubleSide, transparent: true })
  const stone = new THREE.MeshStandardMaterial({ color: '#8d8a83', roughness: 0.92, flatShading: false })
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#6c6862', roughness: 0.95 })
  const stepStone = new THREE.MeshStandardMaterial({ color: '#a7a094', roughness: 0.9 })
  const foliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
  const bark = new THREE.MeshStandardMaterial({ color: '#4b3426', roughness: 0.95 })
  const lacquer = new THREE.MeshStandardMaterial({ color: '#b5402b', roughness: 0.35, metalness: 0.05 })
  const lanternGlow = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb052', emissiveIntensity: 3.2 })
  const screenGlow = new THREE.MeshStandardMaterial({ color: '#dfe8f0', emissive: '#bcd6f2', emissiveIntensity: 1.4 })
  const cushion = new THREE.MeshStandardMaterial({ color: '#7c3b33', roughness: 0.8 })
  const cushionBlue = new THREE.MeshStandardMaterial({ color: '#34495e', roughness: 0.8 })
  const felt = new THREE.MeshStandardMaterial({ color: '#b8352c', roughness: 0.85 })
  const paper = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9 })
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a45a', roughness: 0.35, metalness: 0.7 })
  const bamboo = new THREE.MeshStandardMaterial({ color: '#7f9a4c', roughness: 0.6 })
  const water = new THREE.MeshStandardMaterial({ color: '#1f4f5c', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78 })
  const basin = new THREE.MeshStandardMaterial({ color: '#173338', roughness: 1 })
  const gravel = new THREE.MeshStandardMaterial({ map: T.gravelTexture(), color: '#bdb3a1', roughness: 0.95 })
  const lily = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.6 })
  const koiOrange = new THREE.MeshStandardMaterial({ color: '#f07a2a', roughness: 0.4 })
  const koiWhite = new THREE.MeshStandardMaterial({ color: '#f5efe6', roughness: 0.4 })
  return {
    darkWood, wallWood, floorWood, engawa, plaster, tatami, shoji, shojiDim, roof, ridge, fascia,
    stone, stoneDark, stepStone, foliage, bark, lacquer, lanternGlow, screenGlow, cushion, cushionBlue,
    felt, paper, gold, bamboo, water, basin, gravel, lily, koiOrange, koiWhite, wood,
  }
}

export function mats() {
  if (!M) M = build()
  return M
}

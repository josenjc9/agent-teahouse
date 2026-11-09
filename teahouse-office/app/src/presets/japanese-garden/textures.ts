import * as THREE from 'three'

// 全部用 canvas 程式繪製，不依賴外部圖檔。每種只產生一次。

const cache = new Map<string, THREE.Texture>()

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts?: { repeat?: [number, number]; color?: boolean }) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (opts?.repeat) t.repeat.set(...opts.repeat)
  if (opts?.color !== false) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

// 穩定的偽亂數（同一張圖每次長一樣）
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function tatamiTexture() {
  return make('tatami', 256, 512, (g, w, h) => {
    g.fillStyle = '#c9b77e'
    g.fillRect(0, 0, w, h)
    const r = rng(7)
    // 蓆紋：細橫線
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(${90 + r() * 30},${80 + r() * 20},${40},${0.12 + r() * 0.1})`
      g.fillRect(0, y, w, 1.2)
    }
    // 疊蓆邊（深色布邊）
    g.fillStyle = '#2d2a26'
    g.fillRect(0, 0, 14, h)
    g.fillRect(w - 14, 0, 14, h)
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(4, 0, 2, h)
    g.fillRect(w - 10, 0, 2, h)
  })
}

export function shojiTexture() {
  // 白紙＋木格；紙的部分在 emissive 裡亮，格子暗
  return make('shoji', 256, 512, (g, w, h) => {
    g.fillStyle = '#fff3dc'
    g.fillRect(0, 0, w, h)
    const r = rng(3)
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(200,170,120,${r() * 0.05})`
      g.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3)
    }
    g.fillStyle = '#3b2a1e'
    const cols = 3
    const rows = 8
    for (let i = 0; i <= cols; i++) g.fillRect((i * w) / cols - (i === 0 ? 0 : i === cols ? 10 : 3), 0, i === 0 || i === cols ? 10 : 6, h)
    for (let j = 0; j <= rows; j++) g.fillRect(0, (j * h) / rows - (j === 0 ? 0 : j === rows ? 12 : 3), w, j === 0 || j === rows ? 12 : 6)
    // 腰板（下方木板）
    g.fillStyle = '#5a3f2b'
    g.fillRect(0, h * 0.86, w, h * 0.14)
  })
}

export function shojiEmissive() {
  return make('shoji-e', 256, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#ffcf8a')
    grad.addColorStop(0.7, '#ffb765')
    grad.addColorStop(1, '#a8652c')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#000'
    const cols = 3
    const rows = 8
    for (let i = 0; i <= cols; i++) g.fillRect((i * w) / cols - 5, 0, 10, h)
    for (let j = 0; j <= rows; j++) g.fillRect(0, (j * h) / rows - 5, w, 10)
    g.fillRect(0, h * 0.86, w, h * 0.14)
  })
}

export function roofTileTexture() {
  return make('roof', 512, 512, (g, w, h) => {
    g.fillStyle = '#5d6576'
    g.fillRect(0, 0, w, h)
    const cols = 16
    const cw = w / cols
    for (let i = 0; i < cols; i++) {
      const x = i * cw
      const grad = g.createLinearGradient(x, 0, x + cw, 0)
      grad.addColorStop(0, '#363c49')
      grad.addColorStop(0.25, '#6f7889')
      grad.addColorStop(0.5, '#8a93a4')
      grad.addColorStop(0.85, '#525a69')
      grad.addColorStop(1, '#2c313b')
      g.fillStyle = grad
      g.fillRect(x, 0, cw, h)
    }
    // 瓦片的橫向分段
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(0,0,0,0.28)'
      g.fillRect(0, y, w, 3)
      g.fillStyle = 'rgba(255,255,255,0.05)'
      g.fillRect(0, y + 3, w, 2)
    }
    const r = rng(11)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},255,${r() * 0.03})`
      g.fillRect(r() * w, r() * h, 3, 3)
    }
  })
}

export function mossTexture() {
  return make('moss', 512, 512, (g, w, h) => {
    g.fillStyle = '#5d7a3f'
    g.fillRect(0, 0, w, h)
    const r = rng(5)
    const tones = ['#4d6b33', '#6b8a47', '#7c9a52', '#435f2c', '#88a35a', '#58763a']
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = tones[Math.floor(r() * tones.length)]
      g.globalAlpha = 0.25 + r() * 0.4
      const s = 2 + r() * 9
      g.beginPath()
      g.arc(r() * w, r() * h, s, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }, { repeat: [5, 5] })
}

export function gravelTexture() {
  // 枯山水的耙紋
  return make('gravel', 512, 512, (g, w, h) => {
    g.fillStyle = '#d9d2c3'
    g.fillRect(0, 0, w, h)
    const r = rng(9)
    for (let i = 0; i < 9000; i++) {
      const v = 170 + r() * 70
      g.fillStyle = `rgba(${v},${v - 6},${v - 18},0.6)`
      g.fillRect(r() * w, r() * h, 1.5, 1.5)
    }
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = 'rgba(120,108,90,0.32)'
      g.fillRect(0, y, w, 3)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(0, y + 4, w, 2)
    }
  }, { repeat: [3, 3] })
}

export function woodTexture() {
  return make('wood', 256, 256, (g, w, h) => {
    g.fillStyle = '#8a5d3b'
    g.fillRect(0, 0, w, h)
    const r = rng(13)
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(${60 + r() * 40},${35 + r() * 20},${20},${0.15 + r() * 0.2})`
      g.fillRect(0, y + Math.sin(y * 0.15) * 1.5, w, 1)
    }
    // 板縫
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(30,18,10,0.55)'
      g.fillRect(0, y, w, 2)
    }
  })
}

export function earthTexture() {
  return make('earth', 512, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#5a4330')
    grad.addColorStop(0.18, '#4a3526')
    grad.addColorStop(0.55, '#3a2a1f')
    grad.addColorStop(1, '#251b15')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    const r = rng(17)
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 40},${80},${0.15 + r() * 0.2})`
      const s = 2 + r() * 6
      g.beginPath()
      g.ellipse(r() * w, h * 0.2 + r() * h * 0.8, s * 1.4, s, 0, 0, Math.PI * 2)
      g.fill()
    }
    // 頂部草皮邊
    g.fillStyle = '#4f6b35'
    g.fillRect(0, 0, w, 6)
  }, { repeat: [8, 1] })
}

export function plasterTexture() {
  return make('plaster', 256, 256, (g, w, h) => {
    g.fillStyle = '#e9dfcc'
    g.fillRect(0, 0, w, h)
    const r = rng(19)
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(150,130,100,${r() * 0.06})`
      g.fillRect(r() * w, r() * h, 3, 3)
    }
  })
}

/**
 * 貓毛的花紋。配合「兩極朝前後」的身體球：
 * u 繞身體一圈（u=0.25 是肚子、u=0.75 是背脊），v 從尾端到胸口。
 * 所以虎斑是水平條紋（繞身體一圈的環），肚子是 u=0.25 的直帶。
 */
export function furTexture(kind: 'spots' | 'solid' | 'tabby' | 'points', base: string, dark: string, light: string) {
  return make(`fur2-${kind}-${base}`, 256, 128, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const r = rng(kind.length * 31 + base.length)
    const bellyX = w * 0.25
    const spineX = w * 0.75
    // 背脊略深
    const back = g.createLinearGradient(spineX - w * 0.3, 0, spineX + w * 0.3, 0)
    back.addColorStop(0, 'rgba(0,0,0,0)')
    back.addColorStop(0.5, kind === 'solid' ? 'rgba(120,110,100,0.12)' : 'rgba(0,0,0,0.16)')
    back.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = back
    g.fillRect(0, 0, w, h)
    const nearBelly = (x: number) => Math.abs(x - bellyX) < w * 0.13
    if (kind === 'tabby') {
      g.strokeStyle = dark
      g.globalAlpha = 0.6
      for (let y = 8; y < h - 4; y += 13) {
        g.lineWidth = 4 + r() * 2
        g.beginPath()
        for (let x = 0; x <= w; x += 8) {
          const yy = y + Math.sin(x * 0.07 + y) * 3
          if (x === 0) g.moveTo(x, yy)
          else g.lineTo(x, yy)
        }
        g.stroke()
      }
      g.globalAlpha = 1
      // 背脊中線
      g.fillStyle = dark
      g.globalAlpha = 0.45
      g.fillRect(spineX - 5, 0, 10, h)
      g.globalAlpha = 1
    } else if (kind === 'spots') {
      for (let i = 0; i < 90; i++) {
        const x = r() * w
        if (nearBelly(x)) continue
        const y = r() * h
        g.fillStyle = dark
        g.globalAlpha = 0.85
        g.beginPath()
        g.ellipse(x, y, 3.5 + r() * 4, 2.5 + r() * 3, r() * 3, 0, Math.PI * 2)
        g.fill()
        g.globalAlpha = 0.55
        g.fillStyle = base
        g.beginPath()
        g.ellipse(x, y, 1.4, 1.1, 0, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
    } else if (kind === 'points') {
      // 暹羅：身體奶油色，背上淡淡的陰影
      const shade = g.createLinearGradient(spineX - w * 0.25, 0, spineX + w * 0.25, 0)
      shade.addColorStop(0, 'rgba(0,0,0,0)')
      shade.addColorStop(0.5, 'rgba(110,80,60,0.18)')
      shade.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = shade
      g.fillRect(0, 0, w, h)
    } else {
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(190,180,165,${r() * 0.1})`
        g.fillRect(r() * w, r() * h, 6, 2)
      }
    }
    // 肚子淺色直帶（邊緣柔和）
    const belly = g.createLinearGradient(bellyX - w * 0.18, 0, bellyX + w * 0.18, 0)
    belly.addColorStop(0, 'rgba(0,0,0,0)')
    belly.addColorStop(0.3, light)
    belly.addColorStop(0.7, light)
    belly.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = belly
    g.globalAlpha = kind === 'solid' ? 0.4 : 0.85
    g.fillRect(0, 0, w, h)
    g.globalAlpha = 1
  })
}

/** 貓腳下的柔和影子 */
export function blobShadowTexture() {
  return make('blob', 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    grad.addColorStop(0, 'rgba(0,0,0,0.55)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  }, { color: false })
}

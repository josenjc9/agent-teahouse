import type { Tod } from '../../core/tod'

export const TOD: Record<string, Tod> = {
  dusk: {
    sky: { top: [0.06, 0.09, 0.2], mid: [0.24, 0.21, 0.4], hor: [0.94, 0.54, 0.31], low: [0.62, 0.36, 0.45], deep: [0.11, 0.1, 0.21], sunCol: [1.0, 0.45, 0.18] },
    sunDir: [-0.78, 0.42, 0.46], sunColor: '#ff9f66', sunIntensity: 3.4,
    hemi: ['#6f7cc4', '#4a3026', 0.5], fill: { color: '#6f86e0', intensity: 0.45 },
    fog: '#4a3a5e', bloom: { intensity: 0.75, threshold: 0.92 }, vignette: 0.55, glow: { window: 1, lantern: 1 },
    cloud: ['rgba(255,214,180,0.9)', 'rgba(240,170,150,0.45)', 'rgba(200,140,160,0)'],
  },
  day: {
    sky: { top: [0.2, 0.46, 0.86], mid: [0.5, 0.72, 0.94], hor: [0.86, 0.92, 0.97], low: [0.7, 0.8, 0.88], deep: [0.35, 0.45, 0.5], sunCol: [1.0, 0.92, 0.7] },
    sunDir: [-0.45, 0.85, 0.3], sunColor: '#fff1d6', sunIntensity: 3.0,
    hemi: ['#cfe3ff', '#8a7a5a', 0.95], fill: { color: '#a9c4f0', intensity: 0.35 },
    fog: '#bcd3ea', bloom: { intensity: 0.35, threshold: 1.0 }, vignette: 0.3, glow: { window: 0.12, lantern: 0.3 },
    cloud: ['rgba(255,255,255,0.95)', 'rgba(235,242,252,0.5)', 'rgba(210,225,245,0)'],
  },
  night: {
    sky: { top: [0.015, 0.025, 0.07], mid: [0.05, 0.07, 0.16], hor: [0.14, 0.18, 0.34], low: [0.08, 0.1, 0.22], deep: [0.02, 0.025, 0.06], sunCol: [0.55, 0.65, 1.0] },
    sunDir: [0.5, 0.55, -0.4], sunColor: '#8fa8ff', sunIntensity: 0.9,
    hemi: ['#2a3a7a', '#141018', 0.45], fill: { color: '#4a5fb0', intensity: 0.3 },
    fog: '#0c1024', bloom: { intensity: 1.15, threshold: 0.8 }, vignette: 0.7, glow: { window: 1.5, lantern: 1.4 },
    cloud: ['rgba(60,70,130,0.7)', 'rgba(35,42,96,0.4)', 'rgba(20,26,70,0)'],
  },
}

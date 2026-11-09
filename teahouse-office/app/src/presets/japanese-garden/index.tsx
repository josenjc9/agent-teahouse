import { Ground } from './Ground'
import { House } from './House'
import { Garden } from './Garden'
import { mats } from './materials'
import { TOD } from './tod'
import { japaneseGarden } from './layout'
import type { Preset } from '../../core/preset'

export const gardenPreset: Preset = {
  id: 'japanese-garden',
  name: '和風庭院',
  tabLabel: '庭院',
  layout: japaneseGarden,
  tod: TOD,
  defaultTod: 'dusk',
  Scene: () => (<><Ground /><House /><Garden /></>),
  applyGlow(tod) {
    const m = mats()
    m.shoji.emissiveIntensity = 1.35 * tod.glow.window
    m.shojiDim.emissiveIntensity = 0.45 * tod.glow.window
    m.lanternGlow.emissiveIntensity = 3.2 * tod.glow.lantern
  },
  camera: { az: -0.42, polar: 0.98, desktop: [[-12.6, -1.2, -12.6], [12.6, 5.2, 10.8]], mobile: [[-5.8, -0.5, -9], [5.8, 3, 8]] },
  shadow: { target: [0, 0, -1.5], halfW: 19, halfD: 17 },
}

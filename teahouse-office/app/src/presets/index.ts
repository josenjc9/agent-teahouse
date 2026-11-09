import type { Preset } from '../core/preset'
import { gardenPreset } from './japanese-garden'

/** 場景預設登記處。scene.json 的 "preset" 填這裡的 id。 */
export const PRESETS: Record<string, Preset> = {
  [gardenPreset.id]: gardenPreset,
}

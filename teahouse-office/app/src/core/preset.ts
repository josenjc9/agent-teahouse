import type { ComponentType } from 'react'
import type { Layout, V3 } from '../layout'
import type { Tod } from './tod'

/** 場景預設要交給共用舞台（天空／光／後製／鏡頭）的東西。
 *  新增場景＝寫一個符合這個介面的資料夾，再到 presets/index.ts 登記。 */
export interface Preset {
  id: string
  name: string
  /** 上方分頁膠囊顯示的場景名稱（兩個字最好） */
  tabLabel: string
  layout: Layout
  /** 時段表：每個時段都要有完整一組值（見 references/quality-standard.md） */
  tod: Record<string, Tod>
  defaultTod: string
  /** 場景本體（地面、建築、擺設）。時段改變時會重畫 */
  Scene: ComponentType<{ tod: Tod }>
  /** 時段改變時調整發光材質亮度（窗燈、螢幕、吊燈…） */
  applyGlow?: (tod: Tod) => void
  camera: {
    az: number
    polar: number
    /** 要框進畫面的範圍 [min, max]，桌機／手機各一組 */
    desktop: [V3, V3]
    mobile: [V3, V3]
  }
  /** 主光陰影範圍：看的目標點與涵蓋的半寬／半深 */
  shadow: { target: V3; halfW: number; halfD: number }
}

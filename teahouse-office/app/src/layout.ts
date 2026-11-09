export type V3 = [number, number, number]
/** 場景預設要提供給角色的資訊：座位、休息點、怎麼走 */
export interface Layout {
  name: string
  /** 坐姿時把角色圖抬高多少（椅面或坐墊高度） */
  sitLift: number
  /** 站直的世界高度（公尺） */
  figureH: number
  restSpots: V3[]
  seatOf(seat: string): { pos: V3; facing: number }
  route(a: V3, b: V3): V3[]
}

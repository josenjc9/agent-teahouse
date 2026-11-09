import { FLOOR_Y, roomById, routeBetween, type RoomId, type V3 } from './world'
import type { Layout } from '../../layout'

/** 庭院裡沒事時輪流晃過去的點（避開水池，落在庭院範圍內） */
const REST: V3[] = [
  [2.4, 0, -2.4], [3.0, 0, 7.6], [1.2, 0, -1.2], [1.9, 0, 0.6], [-1.9, 0, 6.6], [-2.4, 0, -1.8],
  [-0.6, 0, 8.4], [-1.3, 0, 0.45], [3.4, 0, 6.2], [1.6, 0, 8.4], [-3.0, 0, 7.8], [-3.4, 0, 5.8],
]

export const japaneseGarden: Layout = {
  name: '和風庭院',
  sitLift: 0.12,
  figureH: 1.86,
  restSpots: REST,
  /** seat 寫法「房間id#第幾個座位」，例如 workshop#0；房間 id：study／meeting／workshop／archive／preview */
  seatOf(seat: string) {
    const [rid, n] = seat.split('#')
    const room = roomById(rid as RoomId)
    const [x, z, facing] = room.seats[(Number(n) || 0) % room.seats.length]
    return { pos: [x, FLOOR_Y, z], facing }
  },
  route: (a, b) => routeBetween(a, b),
}

import { create } from 'zustand'

export type Selection = { kind: 'room'; id: string } | { kind: 'character'; id: string } | null

type State = {
  selection: Selection
  hoverRoom: string | null
  paused: boolean
  reducedMotion: boolean
  /** 每個角色目前世界座標（給屋頂淡出與鏡頭用，不觸發 React 更新） */
  catPositions: Record<string, [number, number, number]>
  catYaw: Record<string, number>
  select: (s: Selection) => void
  setHoverRoom: (id: string | null) => void
}

export const useOffice = create<State>((set) => ({
  selection: null,
  hoverRoom: null,
  paused: false,
  reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  catPositions: {},
  catYaw: {},
  select: (selection) => set({ selection }),
  setHoverRoom: (hoverRoom) => set({ hoverRoom }),
}))

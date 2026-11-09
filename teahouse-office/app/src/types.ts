export type CharCfg = { id: string; name: string; title: string; bio: string; seat: string; scale: number; color: string }
/** say／sayAt：agent 讓角色說一句話（sayAt 是毫秒時間戳，頁面只顯示最近 15 秒內的） */
export type CharState = { status: 'working' | 'idle' | 'rest'; task: string; say?: string; sayAt?: number }
export type StateFile = { updatedAt?: string; characters: Record<string, CharState> }
export type Atlas = { frame: [number, number]; seq: Record<string, { cols: number; rows: number; count: number }>; work?: string; talk?: string; rest?: string[]; side?: string[] }
export type BoardCol = { title: string; items: { text: string; owner: string }[] }
export type SceneCfg = { preset: string; name?: string; timeOfDay?: 'dusk' | 'day' | 'night' }

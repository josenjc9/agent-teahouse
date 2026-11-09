export type CharCfg = { id: string; name: string; title: string; bio: string; seat: string; scale: number; color: string }
export type CharState = { status: 'working' | 'idle' | 'rest'; task: string }
export type StateFile = { updatedAt?: string; characters: Record<string, CharState> }
export type Atlas = { frame: [number, number]; seq: Record<string, { cols: number; rows: number; count: number }>; work?: string; talk?: string; rest?: string[]; side?: string[] }
export type BoardCol = { title: string; items: { text: string; owner: string }[] }
export type SceneCfg = { preset: string; name?: string; timeOfDay?: 'dusk' | 'day' | 'night' }

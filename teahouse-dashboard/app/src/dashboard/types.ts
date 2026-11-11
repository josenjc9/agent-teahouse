/** 儀表板資料契約 v1：頁面只讀這份 JSON，不管資料從哪來。完整說明見 schemas/dashboard.schema.json */
export type Tone = 'ok' | 'warn' | 'bad'
export type StatItem = { label: string; value: number; unit?: string; hint?: string; detail?: string[] }
export type Point = { x: string; y: number }
export type Series = { name: string; points: Point[] }
export type Column = { key: string; label: string; align?: 'left' | 'right' }
export type QuotaItem = { label: string; used: number; limit: number; unit?: string; resetAt?: string }
export type Cell = string | number | null

export type Block =
  | { id: string; type: 'verdict'; title: string; tone: Tone; headline: string; detail?: string }
  | { id: string; type: 'stat'; title: string; items: StatItem[] }
  | { id: string; type: 'trend'; title: string; kind: 'line' | 'bar'; unit?: string; series: Series[] }
  | { id: string; type: 'table'; title: string; columns: Column[]; rows: Record<string, Cell>[] }
  | { id: string; type: 'status'; title: string; rows: { label: string; state: Tone | 'off'; detail?: string }[] }
  | { id: string; type: 'quota'; title: string; items: QuotaItem[] }
  | { id: string; type: 'alerts'; title: string; items: { level: 'info' | 'warn' | 'bad'; text: string; action?: string }[] }

export type DashboardFile = { version: 1; title: string; updatedAt?: string; demo?: boolean; blocks: unknown[] }

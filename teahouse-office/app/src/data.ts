import { useEffect, useState } from 'react'
import type { BoardCol, CharCfg, SceneCfg, StateFile } from './types'

/** 每隔 ms 重新讀一次（加時間戳避免快取），讀失敗就保留舊資料 */
export function usePoll<T>(url: string, parse: (r: Response) => Promise<T>, ms: number, initial: T | null = null) {
  const [data, setData] = useState<T | null>(initial)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(`${url} → ${r.status}`)
        const v = await parse(r)
        if (alive) { setData(v); setError(null) }
      } catch (e) { if (alive) setError(String((e as Error).message ?? e)) }
    }
    void load()
    if (ms <= 0) return () => { alive = false }
    const id = window.setInterval(load, ms)
    return () => { alive = false; window.clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ms])
  return { data, error }
}

export const useScene = () => usePoll<SceneCfg>('/scene.json', (r) => r.json(), 0)
export const useChars = () => usePoll<CharCfg[]>('/characters/index.json', (r) => r.json(), 0)
export const useState_ = () => usePoll<StateFile>('/data/state.json', (r) => r.json(), 2000)

/** 看板 markdown：「## 欄名」底下每個「- 項目 @負責人」是一張卡 */
export function parseBoard(md: string): BoardCol[] {
  const cols: BoardCol[] = []
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim()
    const h = /^##\s+(.+)$/.exec(line)
    if (h) { cols.push({ title: h[1].trim(), items: [] }); continue }
    const li = /^[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/.exec(line)
    if (li && cols.length) {
      const m = /^(.*?)\s*@(\S+)\s*$/.exec(li[1])
      cols[cols.length - 1].items.push(m ? { text: m[1], owner: m[2] } : { text: li[1], owner: '' })
    }
  }
  return cols
}
export const useBoard = () => usePoll<BoardCol[]>('/data/board.md', async (r) => parseBoard(await r.text()), 3000)

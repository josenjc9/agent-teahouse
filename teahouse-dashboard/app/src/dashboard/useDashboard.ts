/// <reference types="vite/client" />
import { useEffect, useState } from 'react'
import { parseDashboard, type Parsed } from './validate'

export type Loaded = { state: 'loading' } | { state: 'error'; lines: string[] } | { state: 'ok'; data: Parsed }

/** 每 ms 毫秒重讀一次 dashboard.json；讀失敗或格式壞掉會明確顯示原因，不是整頁空白。 */
export function useDashboard(url = '/data/dashboard.json', ms = 5000): Loaded {
  const [s, setS] = useState<Loaded>({ state: 'loading' })
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}${url.replace(/^\//, '')}?t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(r.status === 404 ? '找不到 dashboard.json（先跑 scripts/build_dashboard.py，或把範例檔放到 app/public/data/）' : `讀取失敗（HTTP ${r.status}）`)
        let raw: unknown
        try { raw = await r.json() } catch { throw new Error('dashboard.json 不是有效的 JSON（括號、逗號、引號有誤）') }
        const p = parseDashboard(raw)
        if (alive) setS('fatal' in p ? { state: 'error', lines: p.fatal } : { state: 'ok', data: p.data })
      } catch (e) { if (alive) setS({ state: 'error', lines: [String((e as Error).message ?? e)] }) }
    }
    void load()
    const id = window.setInterval(load, ms)
    return () => { alive = false; window.clearInterval(id) }
  }, [url, ms])
  return s
}

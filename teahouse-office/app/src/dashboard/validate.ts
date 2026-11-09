import type { Block } from './types'

/** 契約檢查（頁面用）。規則與 scripts/check_dashboard.py 一致；改一邊要改另一邊（用 tests/dashboard/ 的範例檔對照）。 */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const TONES = ['ok', 'warn', 'bad']

export function checkBlock(b: unknown, at: string): string[] {
  const e: string[] = []
  if (!isObj(b)) return [`${at}：區塊必須是物件`]
  if (!isStr(b.id)) e.push(`${at}.id：必須是非空字串`)
  if (!isStr(b.title)) e.push(`${at}.title：必須是非空字串`)
  const arr = (k: string, min = 1) => { const a = b[k]; if (!Array.isArray(a) || a.length < min) { e.push(`${at}.${k}：必須是至少 ${min} 筆的陣列`); return [] as unknown[] } return a }
  switch (b.type) {
    case 'verdict':
      if (!TONES.includes(b.tone as string)) e.push(`${at}.tone：必須是 ok／warn／bad`)
      if (!isStr(b.headline)) e.push(`${at}.headline：必須是非空字串`)
      break
    case 'stat':
      arr('items').forEach((it, i) => {
        const p = `${at}.items[${i}]`
        if (!isObj(it)) return e.push(`${p}：必須是物件`)
        if (!isStr(it.label)) e.push(`${p}.label：必須是非空字串`)
        if (!isNum(it.value)) e.push(`${p}.value：必須是數字（現在是 ${JSON.stringify(it.value)}）`)
        if (it.detail !== undefined && !(Array.isArray(it.detail) && it.detail.every(isStr))) e.push(`${p}.detail：必須是字串陣列`)
      })
      break
    case 'trend': {
      if (b.kind !== 'line' && b.kind !== 'bar') e.push(`${at}.kind：必須是 line 或 bar`)
      const s = arr('series')
      if (s.length > 3) e.push(`${at}.series：最多 3 條（超過請分圖或合併成「其他」）`)
      s.forEach((se, i) => {
        const p = `${at}.series[${i}]`
        if (!isObj(se) || !isStr(se.name)) return e.push(`${p}.name：必須是非空字串`)
        const pts = se.points
        if (!Array.isArray(pts) || pts.length < (b.kind === 'line' ? 2 : 1)) return e.push(`${p}.points：${b.kind === 'line' ? '折線至少 2 點' : '至少 1 點'}`)
        pts.forEach((pt, j) => {
          if (!isObj(pt) || !isStr(pt.x)) e.push(`${p}.points[${j}].x：必須是非空字串`)
          else if (!isNum(pt.y)) e.push(`${p}.points[${j}].y：必須是數字（現在是 ${JSON.stringify(pt.y)}）`)
        })
      })
      break
    }
    case 'table': {
      const cols = arr('columns'), rows = arr('rows', 0)
      const keys = cols.map((c) => (isObj(c) ? c.key : undefined))
      cols.forEach((c, i) => { if (!isObj(c) || !isStr(c.key) || !isStr(c.label)) e.push(`${at}.columns[${i}]：需要 key 與 label`) })
      rows.forEach((r, i) => {
        if (!isObj(r)) return e.push(`${at}.rows[${i}]：必須是物件`)
        for (const k of keys) if (typeof k === 'string' && !(k in r)) e.push(`${at}.rows[${i}]：缺少欄位「${k}」`)
        for (const [k, v] of Object.entries(r)) if (!(v === null || typeof v === 'string' || isNum(v))) e.push(`${at}.rows[${i}].${k}：只能是字串、數字或 null`)
      })
      break
    }
    case 'status':
      arr('rows').forEach((r, i) => {
        if (!isObj(r) || !isStr(r.label)) return e.push(`${at}.rows[${i}].label：必須是非空字串`)
        if (![...TONES, 'off'].includes(r.state as string)) e.push(`${at}.rows[${i}].state：必須是 ok／warn／bad／off`)
      })
      break
    case 'alerts':
      arr('items', 0).forEach((r, i) => {
        if (!isObj(r) || !isStr(r.text)) return e.push(`${at}.items[${i}].text：必須是非空字串`)
        if (!['info', 'warn', 'bad'].includes(r.level as string)) e.push(`${at}.items[${i}].level：必須是 info／warn／bad`)
      })
      break
    default:
      e.push(`${at}.type：不認得「${String(b.type)}」，可用 verdict／stat／trend／table／status／alerts`)
  }
  return e
}

export type Parsed = { title: string; updatedAt?: string; demo: boolean; items: ({ ok: true; block: Block } | { ok: false; id: string; errors: string[] })[] }

export function parseDashboard(raw: unknown): { fatal: string[] } | { data: Parsed } {
  if (!isObj(raw)) return { fatal: ['整份檔案必須是 JSON 物件'] }
  const fatal: string[] = []
  if (raw.version !== 1) fatal.push(`version：必須是 1（現在是 ${JSON.stringify(raw.version)}）`)
  if (!isStr(raw.title)) fatal.push('title：必須是非空字串')
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) fatal.push('blocks：必須是至少 1 個區塊的陣列')
  if (raw.updatedAt !== undefined && Number.isNaN(Date.parse(String(raw.updatedAt)))) fatal.push('updatedAt：不是有效的日期時間（用 ISO 格式，如 2026-01-01T09:00:00+08:00）')
  if (fatal.length) return { fatal }
  const seen = new Set<string>()
  const items = (raw.blocks as unknown[]).map((b, i) => {
    const errors = checkBlock(b, `blocks[${i}]`)
    const id = isObj(b) && isStr(b.id) ? b.id : `blocks[${i}]`
    if (isObj(b) && isStr(b.id)) { if (seen.has(b.id)) errors.push(`blocks[${i}].id：「${b.id}」重複`); seen.add(b.id) }
    return errors.length ? ({ ok: false, id, errors } as const) : ({ ok: true, block: b as Block } as const)
  })
  return { data: { title: raw.title as string, updatedAt: raw.updatedAt as string | undefined, demo: raw.demo === true, items } }
}

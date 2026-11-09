import { useState } from 'react'
import type { Block, Cell } from './types'
import { Trend } from './Trend'

const TONE_ICON = { ok: '✓', warn: '!', bad: '✕', off: '–' } as const
const TONE_TEXT = { ok: '正常', warn: '注意', bad: '異常', off: '未啟用' } as const
const LEVEL_TEXT = { info: '資訊', warn: '注意', bad: '嚴重' } as const
const fmtNum = (v: number) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(v)
const cell = (v: Cell) => (v === null ? '—' : typeof v === 'number' ? fmtNum(v) : v)

function Verdict({ b }: { b: Extract<Block, { type: 'verdict' }> }) {
  return (
    <div className={`verdict tone-${b.tone}`} role="status">
      <span className="vicon" aria-hidden>{TONE_ICON[b.tone]}</span>
      <div><h2>{b.headline}</h2>{b.detail && <p>{b.detail}</p>}</div>
    </div>
  )
}

function Stat({ b }: { b: Extract<Block, { type: 'stat' }> }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="stats">
      {b.items.map((it, i) => (
        <div key={i} className="stat">
          <button className="stat-btn" disabled={!it.detail?.length} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="lab">{it.label}</span>
            <span className="big num">{fmtNum(it.value)}{it.unit && <small>{it.unit}</small>}</span>
            {it.hint && <span className="hint">{it.hint}</span>}
            {it.detail?.length ? <span className="more">{open === i ? '收起' : `看 ${it.detail.length} 項`}</span> : null}
          </button>
          {open === i && <ul className="detail">{it.detail!.map((d, k) => <li key={k}>{d}</li>)}</ul>}
        </div>
      ))}
    </div>
  )
}

function Table({ b }: { b: Extract<Block, { type: 'table' }> }) {
  if (!b.rows.length) return <p className="empty">沒有資料</p>
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr>{b.columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.label}</th>)}</tr></thead>
      <tbody>{b.rows.map((r, i) => <tr key={i}>{b.columns.map((c) => <td key={c.key} className={(c.align === 'right' || typeof r[c.key] === 'number' ? 'r num' : '')}>{cell(r[c.key])}</td>)}</tr>)}</tbody>
    </table></div>
  )
}

function Status({ b }: { b: Extract<Block, { type: 'status' }> }) {
  return (
    <ul className="rows">
      {b.rows.map((r, i) => (
        <li key={i} className={`row st-${r.state}`}>
          <span className="pip" aria-hidden>{TONE_ICON[r.state]}</span>
          <span className="rl">{r.label}</span>
          <span className="rd">{r.detail ?? TONE_TEXT[r.state]}</span>
          <span className="sr">{TONE_TEXT[r.state]}</span>
        </li>
      ))}
    </ul>
  )
}

function Alerts({ b }: { b: Extract<Block, { type: 'alerts' }> }) {
  if (!b.items.length) return <p className="empty">目前沒有提醒</p>
  return (
    <ul className="rows">
      {b.items.map((r, i) => (
        <li key={i} className={`row al-${r.level}`}>
          <span className="chip">{LEVEL_TEXT[r.level]}</span>
          <span className="rl grow">{r.text}{r.action && <em>建議：{r.action}</em>}</span>
        </li>
      ))}
    </ul>
  )
}

export function Card({ b }: { b: Block }) {
  if (b.type === 'verdict') return <section className="card span-all verdict-card"><Verdict b={b} /></section>
  const wide = b.type === 'trend' || b.type === 'table' || b.type === 'stat'
  return (
    <section className={`card ${b.type === 'stat' ? 'span-all' : wide ? 'span-2' : ''}`}>
      <h3 className="ctitle">{b.title}</h3>
      {b.type === 'stat' && <Stat b={b} />}
      {b.type === 'trend' && <Trend kind={b.kind} series={b.series} unit={b.unit} />}
      {b.type === 'table' && <Table b={b} />}
      {b.type === 'status' && <Status b={b} />}
      {b.type === 'alerts' && <Alerts b={b} />}
    </section>
  )
}

export function BadCard({ id, errors }: { id: string; errors: string[] }) {
  return (
    <section className="card bad-card">
      <h3 className="ctitle">區塊「{id}」格式有誤，已略過</h3>
      <ul className="errs">{errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}{errors.length > 6 && <li>…還有 {errors.length - 6} 項</li>}</ul>
      <p className="hint">用 <code>python3 scripts/check_dashboard.py</code> 可以列出全部問題。</p>
    </section>
  )
}

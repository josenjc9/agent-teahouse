import { useEffect, useRef, useState } from 'react'
import type { Series } from './types'

const H = 210, PAD = { l: 44, r: 16, t: 14, b: 26 }

function nice(max: number) {
  if (max <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
const fmt = (v: number) => (Math.abs(v) >= 10000 ? `${Math.round(v / 1000)}k` : Number.isInteger(v) ? String(v) : v.toFixed(1))

/** 折線／長條圖：2px 線、4px 圓角長條頂端、2px 間隙、淡格線、十字線＋提示框、圖例、可切換成表格 */
export function Trend({ kind, series, unit }: { kind: 'line' | 'bar'; series: Series[]; unit?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)))
    ro.observe(el); setW(Math.max(260, el.clientWidth))
    return () => ro.disconnect()
  }, [])

  const xs = series[0].points.map((p) => p.x)
  const n = xs.length
  const max = nice(Math.max(...series.flatMap((s) => s.points.map((p) => p.y)), 0))
  const min = Math.min(0, ...series.flatMap((s) => s.points.map((p) => p.y)))
  const iw = w - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const sx = (i: number) => PAD.l + (kind === 'line' ? (n === 1 ? iw / 2 : (i / (n - 1)) * iw) : ((i + 0.5) / n) * iw)
  const sy = (v: number) => PAD.t + ih - ((v - min) / (max - min || 1)) * ih
  const ticks = [0, 1, 2, 3].map((k) => min + ((max - min) * k) / 3)
  const labelIdx = n <= 7 ? xs.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    let best = 0, bd = 1e9
    for (let i = 0; i < n; i++) { const d = Math.abs(sx(i) - x); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }
  const bw = Math.min(26, (iw / n) * 0.7 / series.length)

  return (
    <div className="trend" ref={box}>
      <div className="trend-top">
        <div className="legend" aria-label="圖例">
          {series.map((s, i) => <span key={s.name}><i style={{ background: `var(--s${i + 1})` }} />{s.name}</span>)}
        </div>
        <button className="ghost" onClick={() => setTable(!table)}>{table ? '看圖表' : '看表格'}</button>
      </div>
      {table ? (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>項目</th>{series.map((s) => <th key={s.name} className="r">{s.name}</th>)}</tr></thead>
          <tbody>{xs.map((x, i) => <tr key={x}><td>{x}</td>{series.map((s) => <td key={s.name} className="r num">{fmt(s.points[i]?.y ?? 0)}{unit}</td>)}</tr>)}</tbody></table></div>
      ) : (
        <div className="plot">
          <svg width={w} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="趨勢圖，可切換成表格查看數值">
            {ticks.map((t, i) => (
              <g key={i}><line x1={PAD.l} x2={w - PAD.r} y1={sy(t)} y2={sy(t)} className="grid" /><text x={PAD.l - 8} y={sy(t) + 4} className="ax" textAnchor="end">{fmt(t)}</text></g>
            ))}
            {labelIdx.map((i) => <text key={i} x={sx(i)} y={H - 6} className="ax" textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}>{xs[i]}</text>)}
            {kind === 'bar' && series.map((s, si) => s.points.map((p, i) => {
              const x = sx(i) - (series.length * bw + (series.length - 1) * 2) / 2 + si * (bw + 2)
              const y = sy(Math.max(p.y, 0)), h = Math.max(0, sy(Math.min(p.y, 0)) - y)
              const r = Math.min(4, bw / 2, h)
              return <path key={`${si}-${i}`} d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + h} Z`} fill={`var(--s${si + 1})`} opacity={hover === null || hover === i ? 1 : 0.45} />
            }))}
            {kind === 'line' && series.map((s, si) => (
              <g key={si}>
                <polyline fill="none" stroke={`var(--s${si + 1})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p, i) => `${sx(i)},${sy(p.y)}`).join(' ')} />
                <circle cx={sx(n - 1)} cy={sy(s.points[n - 1].y)} r={4.5} fill={`var(--s${si + 1})`} stroke="var(--surface)" strokeWidth={2} />
              </g>
            ))}
            {hover !== null && <>
              <line x1={sx(hover)} x2={sx(hover)} y1={PAD.t} y2={PAD.t + ih} className="cross" />
              {kind === 'line' && series.map((s, si) => <circle key={si} cx={sx(hover)} cy={sy(s.points[hover]?.y ?? 0)} r={4.5} fill={`var(--s${si + 1})`} stroke="var(--surface)" strokeWidth={2} />)}
            </>}
          </svg>
          {hover !== null && (
            <div className="tip" style={{ left: Math.min(Math.max(sx(hover), 70), w - 70) }}>
              <b>{xs[hover]}</b>
              {series.map((s, si) => <div key={s.name}><i style={{ background: `var(--s${si + 1})` }} />{s.name}<span className="num">{fmt(s.points[hover]?.y ?? 0)}{unit}</span></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

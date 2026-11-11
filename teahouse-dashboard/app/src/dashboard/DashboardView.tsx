import { Card, BadCard } from './Cards'
import { useDashboard } from './useDashboard'
import './dashboard.css'

export type Theme = 'dark' | 'light'

function ago(iso?: string) {
  if (!iso) return null
  const h = (Date.now() - Date.parse(iso)) / 3600000
  if (h < 1) return { text: '剛剛更新', stale: false }
  if (h < 48) return { text: `${Math.floor(h)} 小時前更新`, stale: h > 24 }
  return { text: `${Math.floor(h / 24)} 天前更新`, stale: true }
}

export function DashboardView({ theme, onTheme, onClose, url }: { theme: Theme; onTheme?: (t: Theme) => void; onClose?: () => void; url?: string }) {
  const s = useDashboard(url)
  const when = s.state === 'ok' ? ago(s.data.updatedAt) : null
  return (
    <div className="dash" data-theme={theme}>
      <div className="blobs" aria-hidden><i /><i /><i /></div>
      <div className="noise" aria-hidden />
      <div className="dwrap">
        <header className="dhead">
          <div className="dtitle"><span className="bar" /><h1>{s.state === 'ok' ? s.data.title : '儀表板'}</h1></div>
          <div className="dmeta">
            {s.state === 'ok' && s.data.demo && <span className="pill demo">示範資料</span>}
            {when && <span className={'pill' + (when.stale ? ' stale' : '')}>{when.stale ? '資料偏舊 · ' : ''}{when.text}</span>}
            {onTheme && <button className="ghost" onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '淺色' : '深色'}</button>}
            {onClose && <button className="ghost" onClick={onClose} aria-label="關閉">✕</button>}
          </div>
        </header>
        {s.state === 'loading' && <p className="empty">載入中…</p>}
        {s.state === 'error' && (
          <section className="card bad-card">
            <h3 className="ctitle">讀不到可用的 dashboard.json</h3>
            <ul className="errs">{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </section>
        )}
        {s.state === 'ok' && (
          <main className="grid">
            {s.data.items.map((it, i) => (it.ok ? <Card key={it.block.id} b={it.block} /> : <BadCard key={i} id={it.id} errors={it.errors} />))}
          </main>
        )}
      </div>
    </div>
  )
}

import { lazy, Suspense, useEffect, useState } from 'react'
import { Stage } from './core/Stage'
import { useOffice } from './core/store'
import { PRESETS } from './presets'
import { Character } from './Character'
import { useBoard, useChars, useScene, useState_ } from './data'
import type { CharState } from './types'

const STATUS_LABEL: Record<string, string> = { working: '工作中', idle: '待命', rest: '休息中' }
const IDLE: CharState = { status: 'idle', task: '' }
const TODS: [string, string][] = [['day', '白天'], ['dusk', '黃昏'], ['night', '夜晚']]
type View = 'scene' | 'board' | 'dash'
const DashboardView = lazy(() => import('./dashboard/DashboardView').then((m) => ({ default: m.DashboardView })))

function load(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }
function save(key: string, v: string) { try { localStorage.setItem(key, v) } catch { /* 無痕模式等情況略過 */ } }

export default function App() {
  const scene = useScene(), chars = useChars(), st = useState_(), board = useBoard()
  const [sel, setSel] = useState<string | null>(null)
  const [view, setView] = useState<View>('scene')
  const [tod, setTod] = useState<string | null>(null)
  useEffect(() => { if (scene.data) setTod(load('teahouse-tod', scene.data.timeOfDay ?? 'dusk')) }, [scene.data])
  const err = scene.error || chars.error
  if (err) return <div className="boot">讀不到設定檔：{err}<br />請確認 public/scene.json 與 public/characters/index.json 存在。</div>
  if (!scene.data || !chars.data || !tod) return <div className="boot">載入中…</div>
  const cfg = scene.data, list = chars.data
  const wanted = new URLSearchParams(location.search).get('preset') ?? cfg.preset
  const preset = PRESETS[wanted]
  if (!preset) return <div className="boot">scene.json 的 preset「{wanted}」不存在。可用：{Object.keys(PRESETS).join('、')}</div>
  const stateOf = (id: string): CharState => st.data?.characters?.[id] ?? IDLE
  const picked = list.find((c) => c.id === sel)
  const report = (id: string, p: [number, number, number], yaw: number) => { const o = useOffice.getState(); o.catPositions[id] = p; o.catYaw[id] = yaw }
  const working = list.filter((c) => stateOf(c.id).status === 'working').length

  return (
    <div className={'app tod-' + tod}>
      <Stage preset={preset} timeOfDay={tod} onMiss={() => setSel(null)}>
        {list.map((c) => <Character key={c.id} cfg={c} layout={preset.layout} state={stateOf(c.id)} selected={sel === c.id} onSelect={() => setSel(c.id)} report={report} />)}
      </Stage>

      <div className="brand"><i className="mark" /><div><b>{cfg.name ?? 'Office'}</b><small>{working ? `${working} 位工作中` : '都在休息'}</small></div></div>

      <nav className="seg top-center" aria-label="畫面">
        {([['scene', preset.tabLabel], ['board', '看板'], ['dash', '儀表板']] as [View, string][]).map(([k, t]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{t}</button>)}
      </nav>

      <nav className="seg top-right" aria-label="時段">
        {TODS.map(([k, t]) => <button key={k} className={tod === k ? 'on' : ''} onClick={() => { setTod(k); save('teahouse-tod', k) }}>{t}</button>)}
      </nav>

      <nav className="dock" aria-label="角色">
        {list.map((c) => {
          const s = stateOf(c.id)
          return (
            <button key={c.id} className={'chip' + (sel === c.id ? ' on' : '')} onClick={() => setSel(sel === c.id ? null : c.id)} style={{ ['--c' as string]: c.color }}>
              <i className={'dot ' + s.status} />{c.name}<small>{STATUS_LABEL[s.status] ?? s.status}</small>
            </button>
          )
        })}
      </nav>

      {picked && view === 'scene' && (
        <section className="card detail" style={{ ['--c' as string]: picked.color }}>
          <h3>{picked.name}<small>{picked.title}</small></h3>
          <p>{picked.bio}</p>
          <div className="row"><span className={'badge ' + stateOf(picked.id).status}>{STATUS_LABEL[stateOf(picked.id).status]}</span><span>{stateOf(picked.id).task || '沒有指定任務'}</span></div>
        </section>
      )}

      {view === 'dash' && <div className="dash-overlay"><Suspense fallback={<div className="boot">載入中…</div>}><DashboardView theme={tod === 'day' ? 'light' : 'dark'} onClose={() => setView('scene')} /></Suspense></div>}

      {view === 'board' && (
        <section className="card board">
          <header><h3>任務看板</h3><button className="x" onClick={() => setView('scene')} aria-label="關閉">✕</button></header>
          {board.error && <p className="warn">讀不到 data/board.md</p>}
          <div className="cols">
            {(board.data ?? []).map((col) => (
              <div key={col.title} className="col">
                <h4>{col.title}<small>{col.items.length}</small></h4>
                {col.items.map((it, i) => <div key={i} className="item">{it.text}{it.owner && <em>@{it.owner}</em>}</div>)}
                {!col.items.length && <div className="empty">—</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

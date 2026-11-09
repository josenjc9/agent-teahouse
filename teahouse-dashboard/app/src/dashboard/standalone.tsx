import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardView, type Theme } from './DashboardView'

function initial(): Theme {
  try { const v = localStorage.getItem('odk-theme'); if (v === 'dark' || v === 'light') return v } catch { /* 略過 */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
function App() {
  const [t, setT] = useState<Theme>(initial)
  const q = new URLSearchParams(location.search).get('url')   // 例：?url=/data/another.json（只允許 /data/ 底下的檔）
  const url = q && /^\/data\/[\w.-]+\.json$/.test(q) ? q : undefined
  return <DashboardView url={url} theme={t} onTheme={(v) => { setT(v); try { localStorage.setItem('odk-theme', v) } catch { /* 略過 */ } }} />
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

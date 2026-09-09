import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Check,
  Coffee,
  Globe2,
  Leaf,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Timer,
  WifiOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TimerPanel, { clockText } from './components/TimerPanel'
import TaskPanel from './components/TaskPanel'
import DeskNotes from './components/DeskNotes'
import Rhythm from './components/Rhythm'
import Guide from './components/Guide'
import SettingsDialog from './components/SettingsDialog'
import { useOffline } from './hooks/useOffline'
import { useNow, useWorkspace } from './hooks/useWorkspace'
import { dayKey, Energy, initialState, isActive, remaining } from './lib/model'
import { DATA_KEY, DEMO_KEY } from './lib/storage'
import { chime, downloadText, unlockAudio } from './lib/audio'

export default function App() {
  const demo = new URLSearchParams(window.location.search).get('demo') === '1'
  const key = demo ? DEMO_KEY : DATA_KEY
  const { state, dispatch, writable, recovery, saveError, replace } = useWorkspace(key, demo)
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState<'desk' | 'rhythm' | 'guide'>('desk')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const now = useNow()
  const offlineStatus = useOffline()
  const timer = state.timer
  const previous = useRef(timer)
  const enabled = writable && !recovery
  const completed = state.sessions.filter(
    (session) => dayKey(session.endedAt) === dayKey(now) && session.outcome === 'completed',
  ).length
  useEffect(() => {
    void i18n.changeLanguage(state.settings.language)
    document.documentElement.lang = state.settings.language === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.theme = state.settings.theme
  }, [state.settings.language, state.settings.theme, i18n])
  useEffect(() => {
    document.title =
      timer.status === 'running' || timer.status === 'paused'
        ? `${clockText(remaining(timer, now))} · ${t(timer.mode)} · Pomo Studio`
        : 'Pomo Studio · One thing at a time'
  }, [timer, now, t])
  useEffect(() => {
    const before = previous.current
    previous.current = timer
    if (
      !enabled ||
      before.id !== timer.id ||
      before.status !== 'running' ||
      timer.status !== 'finished' ||
      timer.outcome !== 'completed'
    )
      return
    if (state.settings.sound) chime()
    if (
      state.settings.notifications &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('Pomo Studio', { body: t('finished'), tag: timer.id })
      } catch {
        /* Some mobile browsers require a service-worker notification. */
      }
    }
  }, [timer, enabled, state.settings.sound, state.settings.notifications, t])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  const toggle = useCallback(() => {
    if (!enabled) return
    void unlockAudio().catch(() => {})
    dispatch({ type: 'toggle', now: Date.now() })
  }, [enabled, dispatch])
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.code !== 'Space' ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector('dialog[open]')
      )
        return
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, a, summary, [contenteditable="true"], [role="button"]',
        )
      )
        return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [toggle])
  function reset() {
    if (!isActive(timer) || window.confirm(t('resetConfirm'))) dispatch({ type: 'reset' })
  }
  function exportRaw() {
    try {
      downloadText(localStorage.getItem(key) ?? '{}', 'pomo-studio-recovery.json')
    } catch {
      setToast(t('unsaved'))
    }
  }
  const nav = [
    { id: 'desk', icon: Timer },
    { id: 'rhythm', icon: ChartNoAxesColumnIncreasing },
    { id: 'guide', icon: BookOpen },
  ] as const
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href={demo ? '?demo=1' : '?'}>
          <span className="brand-symbol">
            <Leaf size={22} />
          </span>
          <span>
            Pomo<span className="brand-light"> Studio</span>
            <small>MAKE ROOM FOR FOCUS</small>
          </span>
        </a>
        <nav aria-label={t('brand')}>
          {nav.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? 'nav-item active' : 'nav-item'}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => setPage(id)}
            >
              <Icon size={18} />
              {t(id)}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-card">
            <span className="daily-icon">
              <Leaf size={18} />
            </span>
            <span className="eyebrow">{t('dailyGoal')}</span>
            <p>
              <strong>{completed}</strong>
              <span>
                / {state.settings.goal} {t('sessionsLabel')}
              </span>
            </p>
            <div
              className="goal-meter"
              role="progressbar"
              aria-label={t('dailyGoal')}
              aria-valuenow={Math.min(completed, state.settings.goal)}
              aria-valuemin={0}
              aria-valuemax={state.settings.goal}
            >
              <i style={{ width: `${Math.min(100, (completed / state.settings.goal) * 100)}%` }} />
            </div>
            <small>
              {completed >= state.settings.goal
                ? t('goalReached')
                : t('goalRemaining', { count: state.settings.goal - completed })}
            </small>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={14} />
            <span>{t('local')}</span>
          </div>
          <span className="version-label">POMO STUDIO / 2.0</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            {t(page)} <span>/</span>{' '}
            <span>
              {new Date(now).toLocaleDateString(
                state.settings.language === 'zh' ? 'zh-CN' : 'en-US',
                { month: 'short', day: 'numeric' },
              )}
            </span>
          </span>
          <div className="topbar-actions">
            <span className="connection">
              <span className="tiny-dot" />
              {online ? (
                t('local')
              ) : (
                <>
                  <WifiOff size={13} />
                  {t('offline')}
                </>
              )}
            </span>
            <button
              className="language-button"
              disabled={!enabled}
              onClick={() =>
                dispatch({
                  type: 'settings',
                  settings: {
                    ...state.settings,
                    language: state.settings.language === 'en' ? 'zh' : 'en',
                  },
                })
              }
              aria-label={t('language')}
            >
              <Globe2 size={16} />
              {state.settings.language === 'en' ? '中文' : 'EN'}
            </button>
            <button
              className="icon-button"
              disabled={!enabled}
              aria-label={t('theme')}
              onClick={() =>
                dispatch({
                  type: 'settings',
                  settings: {
                    ...state.settings,
                    theme: state.settings.theme === 'light' ? 'dark' : 'light',
                  },
                })
              }
            >
              {state.settings.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="icon-button"
              aria-label={t('settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        <main>
          {demo && (
            <div className="demo-banner">
              <span>{t('demo')}</span>
              <a href="?">{t('leaveDemo')} ↗</a>
            </div>
          )}
          {!writable && (
            <div className="notice" role="status">
              {t('readOnly')}
            </div>
          )}
          {saveError && (
            <div className="notice" role="alert">
              {t('unsaved')}
            </div>
          )}
          {recovery && (
            <div className="notice" role="alert">
              <p>{t('recovery')}</p>
              <button className="text-button" onClick={exportRaw}>
                {t('exportRaw')}
              </button>
              <button
                className="text-button danger"
                disabled={!writable}
                onClick={() => {
                  if (window.confirm(t('freshConfirm')))
                    replace(initialState(state.settings.language))
                }}
              >
                {t('fresh')}
              </button>
            </div>
          )}
          {page === 'desk' && (
            <>
              <div className="page-heading">
                <span className="eyebrow">{t('todayPractice')}</span>
                <h1>
                  {t('headline')}
                  <span className="heading-spark" aria-hidden="true">
                    ✳
                  </span>
                </h1>
                <p>{t('subline')}</p>
              </div>
              <fieldset className="workspace-controls" disabled={!enabled}>
                <div className="energy-strip">
                  <span>
                    <Leaf size={16} />
                    {t('energyLabel')}
                  </span>
                  <div className="energy-options">
                    {(['low', 'steady', 'high'] as Energy[]).map((energy, i) => (
                      <button
                        key={energy}
                        aria-pressed={state.energy === energy}
                        className={state.energy === energy ? 'active' : ''}
                        onClick={() => dispatch({ type: 'energy', energy })}
                      >
                        <span aria-hidden="true">{['◔', '◑', '●'][i]}</span>
                        {t(energy)}
                      </button>
                    ))}
                  </div>
                  <span className="energy-hint">{t('fitHint')}</span>
                  <button
                    className="fit-button"
                    disabled={timer.status !== 'idle'}
                    title={timer.status !== 'idle' ? t('fitDisabled') : undefined}
                    onClick={() => dispatch({ type: 'fit' })}
                  >
                    {t('useFit', { minutes: { low: 15, steady: 25, high: 45 }[state.energy] })} ↗
                  </button>
                </div>
                <div className="desk-grid">
                  <TimerPanel
                    state={state}
                    dispatch={dispatch}
                    now={now}
                    onToggle={toggle}
                    onReset={reset}
                  />
                  <TaskPanel state={state} dispatch={dispatch} />
                </div>
                {timer.mode !== 'focus' && (
                  <section className="break-prompt">
                    <Coffee size={24} />
                    <div>
                      <h2>{t('breakTitle')}</h2>
                      <p>
                        {t(
                          timer.mode === 'long'
                            ? 'breakLong'
                            : state.thoughts.length >= 3
                              ? 'breakDetours'
                              : 'breakShort',
                        )}
                      </p>
                    </div>
                  </section>
                )}
                <DeskNotes state={state} dispatch={dispatch} />
              </fieldset>
            </>
          )}
          {page === 'rhythm' && <Rhythm state={state} now={now} demo={demo} />}
          {page === 'guide' && <Guide offlineStatus={offlineStatus} demo={demo} />}
          <footer>
            <span>{t('footer')}</span>
            <span>
              <Leaf size={12} /> {t('tagline')}
            </span>
          </footer>
        </main>
      </div>
      {settingsOpen && (
        <SettingsDialog
          recovering={recovery}
          state={state}
          writable={writable}
          onClose={() => setSettingsOpen(false)}
          message={setToast}
          onSave={(settings) => {
            dispatch({ type: 'settings', settings })
            setToast(t('settingsSaved'))
          }}
          onImport={(next) => {
            replace(next)
            setToast(t('imported'))
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

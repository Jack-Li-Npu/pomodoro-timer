import { useState } from 'react'
import { Download, ShieldCheck, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { backupState, isActive, State } from '../lib/model'
import { parseState } from '../lib/storage'
import { downloadText, unlockAudio } from '../lib/audio'
import { Dialog } from './Dialog'
export default function SettingsDialog({
  state,
  onClose,
  onSave,
  onImport,
  message,
  writable,
  recovering,
}: {
  state: State
  onClose: () => void
  onSave: (settings: State['settings']) => void
  onImport: (state: State) => void
  message: (message: string) => void
  writable: boolean
  recovering: boolean
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(state.settings)
  const [pending, setPending] = useState<State | null>(null)
  async function readFile(file?: File) {
    if (!file) return
    if (isActive(state.timer)) {
      message(t('importActive'))
      return
    }
    try {
      if (file.size > 5_000_000) throw new Error('too large')
      const parsed = parseState(await file.text())
      if (parsed.timer.status === 'running')
        parsed.timer = { ...parsed.timer, status: 'paused', deadline: null }
      setPending(parsed)
    } catch {
      message(t('invalidBackup'))
    }
  }
  async function requestNotification(enabled: boolean) {
    if (!enabled) {
      setDraft({ ...draft, notifications: false })
      return
    }
    try {
      if (!('Notification' in window) || (await Notification.requestPermission()) !== 'granted') {
        message(t('permissionDenied'))
        return
      }
      setDraft((current) => ({ ...current, notifications: true }))
    } catch {
      message(t('permissionDenied'))
    }
  }
  return (
    <Dialog title={t('settings')} onClose={onClose}>
      <div className="dialog-body">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!writable) return
            void unlockAudio().catch(() => {})
            onSave(draft)
            onClose()
          }}
        >
          <fieldset disabled={!writable || recovering}>
            <h3>{t('durations')}</h3>
            <p className="muted">{t('durationHelp')}</p>
            <div className="duration-fields">
              {(['focus', 'short', 'long'] as const).map((mode) => (
                <label key={mode}>
                  {t(mode)}
                  <span className="number-input">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      required
                      value={draft[mode]}
                      onChange={(event) =>
                        setDraft({ ...draft, [mode]: Number(event.target.value) })
                      }
                    />
                    <span>min</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="two-fields">
              <label>
                {t('longEvery')}
                <input
                  type="number"
                  min={2}
                  max={12}
                  required
                  value={draft.longEvery}
                  onChange={(event) =>
                    setDraft({ ...draft, longEvery: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                {t('goal')}
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={draft.goal}
                  onChange={(event) => setDraft({ ...draft, goal: Number(event.target.value) })}
                />
              </label>
            </div>
            <div className="two-fields">
              <label>
                {t('language')}
                <select
                  value={draft.language}
                  onChange={(event) =>
                    setDraft({ ...draft, language: event.target.value as 'en' | 'zh' })
                  }
                >
                  <option value="en">English</option>
                  <option value="zh">简体中文</option>
                </select>
              </label>
              <label>
                {t('theme')}
                <select
                  value={draft.theme}
                  onChange={(event) =>
                    setDraft({ ...draft, theme: event.target.value as 'light' | 'dark' })
                  }
                >
                  <option value="light">{t('light')}</option>
                  <option value="dark">{t('dark')}</option>
                </select>
              </label>
            </div>
            <label className="toggle-row">
              <div>
                <strong>{t('sound')}</strong>
                <span>{t('soundHelp')}</span>
              </div>
              <input
                type="checkbox"
                checked={draft.sound}
                onChange={(event) => setDraft({ ...draft, sound: event.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <strong>{t('notifications')}</strong>
              <input
                type="checkbox"
                checked={draft.notifications}
                onChange={(event) => {
                  void requestNotification(event.target.checked)
                }}
              />
            </label>
            <button type="submit" className="button primary full-width">
              {t('saveSettings')}
            </button>
          </fieldset>
        </form>
        <div className="backup-section">
          <h3>
            <ShieldCheck size={18} />
            {t('privacyTitle')}
          </h3>
          <p>{t('privacyText')}</p>
          <div className="backup-actions">
            <button
              className="button secondary"
              onClick={() => {
                downloadText(
                  JSON.stringify(backupState(state, Date.now()), null, 2),
                  `pomo-studio-${new Date().toISOString().slice(0, 10)}.json`,
                )
                message(t('exported'))
              }}
            >
              <Download size={16} />
              {t('export')}
            </button>
            <label className={`button secondary file-button ${!writable ? 'disabled' : ''}`}>
              <Upload size={16} />
              {t('import')}
              <input
                type="file"
                accept="application/json,.json"
                disabled={!writable}
                aria-label={t('import')}
                onChange={(event) => {
                  void readFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
        {pending && (
          <section className="import-review">
            <h3>{t('importReview')}</h3>
            <p>
              {t('importSummary', {
                tasks: pending.tasks.length,
                sessions: pending.sessions.length,
                thoughts: pending.thoughts.length,
              })}
            </p>
            <p>{t('importWarning')}</p>
            <div className="dialog-actions">
              <button className="text-button" onClick={() => setPending(null)}>
                {t('cancel')}
              </button>
              <button
                className="button primary"
                disabled={!writable || isActive(state.timer)}
                onClick={() => {
                  onImport(pending)
                  onClose()
                }}
              >
                {t('confirmImport')}
              </button>
            </div>
          </section>
        )}
      </div>
    </Dialog>
  )
}

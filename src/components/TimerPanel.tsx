import { Dispatch } from 'react'
import { ArrowRight, Check, Pause, Play, RotateCcw, Sparkles, Coffee, Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Action, isActive, Mode, nextMode, remaining, State } from '../lib/model'
export function clockText(ms: number) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
export default function TimerPanel({
  state,
  dispatch,
  now,
  onToggle,
  onReset,
}: {
  state: State
  dispatch: Dispatch<Action>
  now: number
  onToggle: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const timer = state.timer
  const left = remaining(timer, now)
  const task = state.tasks.find((item) => item.id === timer.taskId)
  const progress = 1 - left / timer.durationMs
  const finished = timer.status === 'finished'
  const label =
    timer.status === 'running'
      ? t('pause')
      : timer.status === 'paused'
        ? t('resume')
        : timer.mode === 'focus'
          ? t('start')
          : t('startBreak')
  return (
    <section
      className={`card timer-card ${timer.mode !== 'focus' ? 'break-card' : ''}`}
      aria-label={t('desk')}
    >
      <div className="timer-top">
        <div className="mode-switch" aria-label={t('durations')}>
          {(['focus', 'short', 'long'] as Mode[]).map((mode) => (
            <button
              key={mode}
              aria-pressed={mode === timer.mode}
              disabled={isActive(timer)}
              onClick={() => dispatch({ type: 'mode', mode })}
              className={mode === timer.mode ? 'active' : ''}
            >
              {t(mode)}
            </button>
          ))}
        </div>
        <span className="session-pill">
          <span className="tiny-dot" />
          {t('sessionNumber', {
            current: Math.min(state.cycle + 1, state.settings.longEvery),
            total: state.settings.longEvery,
          })}
        </span>
      </div>
      <div className="timer-center">
        <div
          className="clock"
          role="timer"
          aria-label={t('ringLabel', { mode: t(timer.mode), time: clockText(left) })}
        >
          <svg viewBox="0 0 256 256" aria-hidden="true">
            <circle className="clock-track" cx="128" cy="128" r="117" />
            <circle
              className="clock-fill"
              cx="128"
              cy="128"
              r="117"
              strokeDasharray={735.13}
              strokeDashoffset={735.13 * (1 - progress)}
            />
            <circle className="clock-dot" cx="128" cy="11" r="4" />
          </svg>
          <div className="clock-content">
            <span className="clock-mode">
              {timer.mode === 'focus' ? <Leaf size={15} /> : <Coffee size={15} />}
              {t(timer.mode)}
            </span>
            <strong>{clockText(left)}</strong>
            <span className="clock-caption">{Math.round(timer.durationMs / 60000)} MIN</span>
          </div>
        </div>
        <p className="timer-state" aria-live="polite">
          {t(
            timer.status === 'idle'
              ? 'ready'
              : timer.status === 'finished'
                ? 'finished'
                : timer.status,
          )}
        </p>
        <div className="timer-buttons">
          <button className="icon-button reset-button" aria-label={t('reset')} onClick={onReset}>
            <RotateCcw size={19} />
          </button>
          <button
            className="button primary start-button"
            onClick={finished ? () => dispatch({ type: 'next' }) : onToggle}
          >
            {finished ? (
              <ArrowRight size={18} />
            ) : timer.status === 'running' ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            {finished ? t('next', { mode: t(nextMode(state)) }) : label}
          </button>
          <span className="shortcut-hint" aria-hidden="true">
            ␣
          </span>
        </div>
        {isActive(timer) ? (
          <div className="secondary-timer-actions">
            <button
              className="text-button"
              onClick={() => dispatch({ type: 'finish', now: Date.now() })}
            >
              {t('early')}
            </button>
            {timer.mode === 'focus' && (
              <button
                className="text-button"
                disabled={timer.durationMs >= 7200000}
                onClick={() => dispatch({ type: 'extend', now: Date.now() })}
              >
                <Sparkles size={13} />
                {t('extend')}
              </button>
            )}
          </div>
        ) : (
          <p className="timer-footnote">{t('noRush')}</p>
        )}
      </div>
      <div className="active-task">
        <span className="active-task-icon">
          {finished ? <Check size={18} /> : <span className="target-icon">◎</span>}
        </span>
        <div>
          <span className="eyebrow">{t('workingOn')}</span>
          <strong>{task?.title ?? t('unassigned')}</strong>
        </div>
        <span className="active-task-meta">
          {task
            ? `${state.sessions.filter((item) => item.taskId === task.id && item.outcome === 'completed').length}/${task.estimate}`
            : '—'}
        </span>
      </div>
    </section>
  )
}

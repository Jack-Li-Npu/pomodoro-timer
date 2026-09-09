import { useState } from 'react'
import { Activity, ArrowUpRight, Clock3, Leaf, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dayKey, Energy, State, weekDays } from '../lib/model'
export default function Rhythm({ state, now, demo }: { state: State; now: number; demo: boolean }) {
  const { t } = useTranslation()
  const [limit, setLimit] = useState(20)
  const days = weekDays(now)
  const keys = new Set(days.map((day) => day.key))
  const week = state.sessions.filter((session) => keys.has(dayKey(session.endedAt)))
  const total = Math.round(week.reduce((sum, session) => sum + session.seconds, 0) / 60)
  const values = days.map((day) =>
    Math.round(
      week
        .filter((session) => dayKey(session.endedAt) === day.key)
        .reduce((sum, session) => sum + session.seconds, 0) / 60,
    ),
  )
  const max = Math.max(...values, 60)
  const language = state.settings.language === 'zh' ? 'zh-CN' : 'en-US'
  const today = state.sessions.filter((session) => dayKey(session.endedAt) === dayKey(now))
  const completed = today.filter((session) => session.outcome === 'completed').length
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{t('rhythm')}</span>
        <h1>{t('rhythmTitle')}</h1>
        <p>{t('rhythmSub')}</p>
      </div>
      <div className="stat-grid">
        {[
          {
            icon: Clock3,
            value: Math.round(today.reduce((sum, item) => sum + item.seconds, 0) / 60),
            label: t('minutesLabel'),
          },
          { icon: Leaf, value: completed, label: t('completedLabel') },
          { icon: Target, value: `${completed}/${state.settings.goal}`, label: t('goalLabel') },
        ].map(({ icon: Icon, value, label }) => (
          <div className="card stat-card" key={label}>
            <Icon size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="rhythm-grid">
        <section className="card chart-card">
          <div className="section-heading">
            <div>
              <h2>{t('pastWeek')}</h2>
              <p>
                {t('weekMinutes', { minutes: total })}
                {demo ? ` · ${t('sampleLabel')}` : ''}
              </p>
            </div>
            <Activity size={21} />
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={days
              .map((day, index) => `${day.date.toLocaleDateString(language)}: ${values[index]} min`)
              .join('; ')}
          >
            {days.map((day, i) => (
              <div className={`bar-column ${i === 6 ? 'today-bar' : ''}`} key={day.key}>
                <span className="bar-value">{values[i] || '—'}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${(values[i] / max) * 100}%` }} />
                </div>
                <span>{day.date.toLocaleDateString(language, { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card energy-card">
          <span className="soft-icon">
            <Leaf size={24} />
          </span>
          <h2>{t('energyInsight')}</h2>
          <p>{t('energyInsightSub')}</p>
          <div className="energy-totals">
            {(['low', 'steady', 'high'] as Energy[]).map((energy) => (
              <div key={energy}>
                <span>{t(energy)}</span>
                <strong>
                  {t('bestEnergy', {
                    count: week.filter(
                      (item) => item.energy === energy && item.outcome === 'completed',
                    ).length,
                  })}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card history-card">
        <div className="section-heading">
          <h2>{t('history')}</h2>
          <ArrowUpRight size={19} />
        </div>
        {state.sessions.length ? (
          <>
            <div className="history-list">
              {[...state.sessions]
                .sort((a, b) => b.endedAt - a.endedAt)
                .slice(0, limit)
                .map((session) => (
                  <article key={session.id} className="history-row">
                    <span
                      className={`history-dot ${session.outcome === 'partial' ? 'partial' : ''}`}
                    />
                    <div className="history-name">
                      <strong>{session.taskTitle || t('unassigned')}</strong>
                      <span>
                        {new Date(session.endedAt).toLocaleString(language, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {t(session.energy)} · {t('detours', { count: session.detours })}
                      </span>
                    </div>
                    <strong className="history-duration">
                      {t('sessionTime', { minutes: Math.round(session.seconds / 60) })}
                    </strong>
                    <span className="outcome-badge">{t(session.outcome)}</span>
                  </article>
                ))}
            </div>
            {limit < state.sessions.length && (
              <button className="text-button" onClick={() => setLimit(limit + 20)}>
                {t('showMore')}
              </button>
            )}
          </>
        ) : (
          <div className="empty-history">
            <Clock3 size={30} />
            <h3>{t('noHistory')}</h3>
            <p>{t('noHistorySub')}</p>
          </div>
        )}
      </section>
    </>
  )
}

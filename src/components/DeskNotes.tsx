import { Dispatch, FormEvent, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CornerDownLeft, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Action, State } from '../lib/model'
export default function DeskNotes({
  state,
  dispatch,
}: {
  state: State
  dispatch: Dispatch<Action>
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const task = state.tasks.find((item) => item.id === state.timer.taskId)
  function park(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    dispatch({ type: 'thought', text, now: Date.now() })
    setText('')
  }
  return (
    <div className="notes-grid">
      <section className="ticket-card">
        <div className="ticket-top">
          <span className="ticket-icon">
            <CornerDownLeft size={20} />
          </span>
          <span className="eyebrow">{t('ticketTag')}</span>
          <span className="ticket-perforation" aria-hidden="true">
            ••••••
          </span>
        </div>
        <h2>{t('ticket')}</h2>
        <p>{t('ticketSub')}</p>
        <textarea
          aria-label={t('ticket')}
          placeholder={t('ticketPlaceholder')}
          maxLength={1000}
          value={task?.nextStep ?? state.nextStep}
          onChange={(event) => dispatch({ type: 'note', text: event.target.value })}
          rows={2}
        />
        <div className="ticket-footer">
          <Check size={12} />
          {t(task ? 'ticketSaved' : 'looseTicket')}
          <ArrowDownLeft size={17} />
        </div>
      </section>
      <section className="card inbox-card">
        <div className="section-heading">
          <div>
            <h2>{t('inbox')}</h2>
            <p>{t('inboxSub')}</p>
          </div>
          <span className="inbox-illustration" aria-hidden="true">
            ↳
          </span>
        </div>
        <form onSubmit={park} className="thought-form">
          <input
            aria-label={t('thoughtPlaceholder')}
            placeholder={t('thoughtPlaceholder')}
            maxLength={500}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />
          <button
            className="icon-button"
            type="submit"
            aria-label={t('park')}
            disabled={!text.trim() || state.thoughts.length >= 500}
          >
            <Send size={16} />
          </button>
        </form>
        <ul className="thought-list">
          {state.thoughts
            .slice()
            .reverse()
            .map((thought) => (
              <li key={thought.id}>
                <span>{thought.text}</span>
                <button
                  className="icon-button"
                  aria-label={`${t('makeTask')}: ${thought.text}`}
                  disabled={state.tasks.length >= 500}
                  onClick={() => dispatch({ type: 'promoteThought', id: thought.id })}
                >
                  <ArrowUpRight size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${t('dismiss')}: ${thought.text}`}
                  onClick={() => dispatch({ type: 'removeThought', id: thought.id })}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
        </ul>
        {!state.thoughts.length && <p className="empty-thoughts">{t('noThoughts')}</p>}
      </section>
    </div>
  )
}

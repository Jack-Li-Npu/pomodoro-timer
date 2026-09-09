import { Dispatch, FormEvent, useState } from 'react'
import { Check, ChevronDown, Circle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Action, isActive, State, Task } from '../lib/model'
import { Dialog } from './Dialog'
export default function TaskPanel({
  state,
  dispatch,
}: {
  state: State
  dispatch: Dispatch<Action>
}) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState(1)
  const [editing, setEditing] = useState<Task | null>(null)
  const unfinished = state.tasks.filter((task) => !task.done)
  const completed = state.tasks.filter((task) => task.done)
  const completedFor = (id: string) =>
    state.sessions.filter((session) => session.taskId === id && session.outcome === 'completed')
      .length
  const planned =
    unfinished.reduce((sum, task) => sum + Math.max(0, task.estimate - completedFor(task.id)), 0) *
    state.settings.focus
  function add(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    dispatch({ type: 'addTask', title, estimate })
    setTitle('')
    setEstimate(1)
    setAdding(false)
  }
  function taskRow(task: Task) {
    const active = state.timer.taskId === task.id
    const locked = isActive(state.timer) && active
    return (
      <li
        key={task.id}
        className={`task-row ${active ? 'selected' : ''} ${task.done ? 'task-done' : ''}`}
      >
        <button
          className="task-check"
          aria-label={`${t(task.done ? 'reopen' : 'markDone')}: ${task.title}`}
          disabled={locked}
          onClick={() => dispatch({ type: 'toggleTask', id: task.id })}
        >
          {task.done ? <Check size={15} /> : <Circle size={18} />}
        </button>
        <button
          className="task-select"
          disabled={isActive(state.timer) || task.done}
          aria-label={t('selectTask', { title: task.title })}
          aria-pressed={active}
          onClick={() => dispatch({ type: 'select', id: task.id })}
        >
          <span>{task.title}</span>
          <span className="task-estimate">
            {Array.from({ length: Math.min(task.estimate, 5) }, (_, i) => (
              <i className={i < completedFor(task.id) ? 'filled' : ''} key={i} />
            ))}{' '}
            <small>
              {completedFor(task.id)}/{task.estimate}
            </small>
          </span>
        </button>
        <button
          className="icon-button task-menu"
          disabled={locked}
          aria-label={`${t('settings')}: ${task.title}`}
          onClick={() => setEditing({ ...task })}
        >
          <MoreHorizontal size={17} />
        </button>
      </li>
    )
  }
  return (
    <section className="card tasks-card">
      <div className="section-heading">
        <div>
          <h2>{t('tasks')}</h2>
          <p>{t('tasksSub')}</p>
        </div>
        <span className="count-badge">{unfinished.length.toString().padStart(2, '0')}</span>
      </div>
      <div className="task-scroll">
        <ul className="task-list">{unfinished.map(taskRow)}</ul>
        {unfinished.length === 0 && (
          <div className="empty-tasks">
            <span className="empty-icon">
              <Pencil size={23} />
            </span>
            <strong>{t('emptyTasks')}</strong>
            <p>{t('emptyTasksSub')}</p>
          </div>
        )}
        {completed.length > 0 && (
          <details className="completed-tasks">
            <summary>
              <ChevronDown size={14} />
              {t('completedTasks')} <span>{completed.length}</span>
            </summary>
            <ul className="task-list">{completed.map(taskRow)}</ul>
          </details>
        )}
      </div>
      {adding ? (
        <form className="add-task-form" onSubmit={add}>
          <input
            autoFocus
            aria-label={t('taskPlaceholder')}
            placeholder={t('taskPlaceholder')}
            value={title}
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <div>
            <label>
              {t('estimate')}
              <input
                aria-label={t('estimate')}
                type="number"
                min={1}
                max={20}
                value={estimate}
                onChange={(event) => setEstimate(Number(event.target.value))}
                required
              />
            </label>
            <button className="text-button" type="button" onClick={() => setAdding(false)}>
              {t('cancel')}
            </button>
            <button className="button primary small" type="submit">
              {t('add')}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="add-task-button"
          disabled={state.tasks.length >= 500}
          onClick={() => setAdding(true)}
        >
          <Plus size={17} />
          {t('addTask')}
        </button>
      )}
      <div className="plan-summary" title={t('planHelp')}>
        <span className="tiny-dot" />
        {t('planSummary', { count: unfinished.length, minutes: planned })}
      </div>
      {state.timer.taskId && !isActive(state.timer) && (
        <button
          className="text-button open-focus-button"
          onClick={() => dispatch({ type: 'select', id: null })}
        >
          {t('unassigned')} ↗
        </button>
      )}
      {isActive(state.timer) && <p className="muted small-note">{t('taskLocked')}</p>}
      {editing && (
        <Dialog title={t('editTask')} onClose={() => setEditing(null)}>
          <form
            className="dialog-body"
            onSubmit={(event) => {
              event.preventDefault()
              dispatch({ type: 'updateTask', task: editing })
              setEditing(null)
            }}
          >
            <label>
              {t('taskPlaceholder')}
              <input
                value={editing.title}
                maxLength={180}
                required
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
              />
            </label>
            <label>
              {t('estimate')}
              <input
                type="number"
                min={1}
                max={20}
                required
                value={editing.estimate}
                onChange={(event) =>
                  setEditing({ ...editing, estimate: Number(event.target.value) })
                }
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  if (window.confirm(t('deleteConfirm'))) {
                    dispatch({ type: 'removeTask', id: editing.id })
                    setEditing(null)
                  }
                }}
              >
                <Trash2 size={15} />
                {t('deleteTask')}
              </button>
              <button className="button primary" type="submit">
                {t('saveTask')}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  )
}

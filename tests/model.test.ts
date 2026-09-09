import { describe, expect, it } from 'vitest'
import {
  backupState,
  dayKey,
  initialState,
  nextMode,
  reconcile,
  reducer,
  remaining,
  weekDays,
} from '../src/lib/model'
import { demoState, loadState, parseState } from '../src/lib/storage'
const start = 1_800_000_000_000
const running = () => reducer(initialState(), { type: 'toggle', now: start })
describe('timer accounting', () => {
  it('recovers an overdue timer exactly once without manufacturing more sessions', () => {
    const recovered = reconcile(parseState(JSON.stringify(running())), start + 3 * 86400000)
    expect(recovered.sessions).toHaveLength(1)
    expect(recovered.sessions[0]).toMatchObject({
      seconds: 1500,
      endedAt: start + 1500000,
      outcome: 'completed',
    })
    expect(reconcile(recovered, start + 4 * 86400000)).toBe(recovered)
    expect(recovered.timer.status).toBe('finished')
  })
  it('excludes a long pause from saved focus time', () => {
    let state = reducer(running(), { type: 'toggle', now: start + 60000 })
    expect(remaining(state.timer, start + 86400000)).toBe(1440000)
    state = reducer(state, { type: 'toggle', now: start + 86400000 })
    state = reducer(state, { type: 'finish', now: start + 86400000 + 120000 })
    expect(state.sessions[0].seconds).toBe(180)
    expect(state.sessions[0].outcome).toBe('partial')
    expect(state.cycle).toBe(0)
  })
  it('extends a running deadline and total duration by five minutes', () => {
    const state = reducer(running(), { type: 'extend', now: start + 60000 })
    expect(remaining(state.timer, start + 60000)).toBe(1740000)
    expect(reconcile(state, start + 1800000).sessions[0].seconds).toBe(1800)
  })
  it('does not resurrect an elapsed timer when extending it', () => {
    const state = reducer(running(), { type: 'extend', now: start + 1500001 })
    expect(state.timer.status).toBe('finished')
    expect(state.sessions).toHaveLength(1)
  })
  it('suggests a long break after the configured count and resets after that break', () => {
    let state = initialState()
    state.cycle = 3
    state = reducer(state, { type: 'toggle', now: start })
    state = reconcile(state, start + 1500000)
    expect(nextMode(state)).toBe('long')
    state = reducer(state, { type: 'next' })
    expect(state.timer.status).toBe('idle')
    state = reducer(state, { type: 'toggle', now: start + 1600000 })
    state = reconcile(state, start + 2500000)
    expect(state.cycle).toBe(0)
    expect(state.sessions).toHaveLength(1)
    expect(nextMode(state)).toBe('focus')
  })
  it('preserves the chosen one-off duration when changing appearance', () => {
    let state = reducer(initialState(), { type: 'energy', energy: 'low' })
    state = reducer(state, { type: 'fit' })
    state = reducer(state, { type: 'settings', settings: { ...state.settings, theme: 'dark' } })
    expect(state.timer.durationMs).toBe(900000)
    expect(state.settings.focus).toBe(25)
  })
  it('uses new settings for the next timer without interrupting active work', () => {
    const state = reducer(running(), {
      type: 'settings',
      settings: { ...initialState().settings, focus: 45 },
    })
    expect(state.timer.durationMs).toBe(1500000)
    expect(reducer(state, { type: 'reset' }).timer.durationMs).toBe(2700000)
  })
  it('exports a running timer paused at the actual remaining time', () => {
    const backup = backupState(running(), start + 123000)
    expect(backup.timer.status).toBe('paused')
    expect(backup.timer.remainingMs).toBe(1377000)
    expect(parseState(JSON.stringify(backup))).toEqual(backup)
  })
})
describe('tasks and return tickets', () => {
  it('locks task attribution while active and retains its title in history after deletion', () => {
    let state = reducer(initialState(), { type: 'addTask', title: 'Write opening', estimate: 2 })
    const task = state.tasks[0]
    state = reducer(state, { type: 'toggle', now: start })
    expect(reducer(state, { type: 'removeTask', id: task.id })).toBe(state)
    expect(reducer(state, { type: 'select', id: null })).toBe(state)
    state = reducer(state, { type: 'finish', now: start + 61000 })
    state = reducer(state, { type: 'removeTask', id: task.id })
    expect(state.tasks).toHaveLength(0)
    expect(state.sessions[0].taskTitle).toBe('Write opening')
  })
  it('keeps a separate return ticket for each task', () => {
    let state = reducer(initialState(), { type: 'addTask', title: 'A', estimate: 1 })
    const first = state.tasks[0].id
    state = reducer(state, { type: 'note', text: 'Open the draft' })
    state = reducer(state, { type: 'addTask', title: 'B', estimate: 1 })
    state = reducer(state, { type: 'select', id: state.tasks[1].id })
    state = reducer(state, { type: 'note', text: 'Read page 12' })
    expect(state.tasks.find((task) => task.id === first)?.nextStep).toBe('Open the draft')
    expect(state.tasks[1].nextStep).toBe('Read page 12')
  })
  it('counts a captured detour even after it becomes a task', () => {
    let state = reducer(running(), {
      type: 'thought',
      text: 'Read that article',
      now: start + 30000,
    })
    state = reducer(state, { type: 'promoteThought', id: state.thoughts[0].id })
    state = reducer(state, { type: 'finish', now: start + 60000 })
    expect(state.sessions[0].detours).toBe(1)
    expect(state.thoughts).toHaveLength(0)
    expect(state.tasks[0].title).toBe('Read that article')
  })
})
describe('backup validation and calendar', () => {
  it('round-trips sample data', () => {
    const state = demoState()
    expect(parseState(JSON.stringify(state))).toEqual(state)
  })
  it.each([
    '{}',
    '{broken',
    JSON.stringify({ ...initialState(), version: 9 }),
    JSON.stringify({ ...initialState(), settings: { ...initialState().settings, focus: -1 } }),
  ])('rejects malformed or unsupported backups: %s', (raw) => {
    expect(() => parseState(raw)).toThrow()
  })
  it('rejects missing task references and duplicate identifiers', () => {
    const state = demoState()
    state.timer.taskId = 'missing'
    expect(() => parseState(JSON.stringify(state))).toThrow()
    state.timer.taskId = 'demo-1'
    state.tasks.push(state.tasks[0])
    expect(() => parseState(JSON.stringify(state))).toThrow()
  })
  it('does not overwrite unreadable local data', () => {
    localStorage.setItem('broken', 'not json')
    expect(loadState('broken', false).error).toBe(true)
    expect(localStorage.getItem('broken')).toBe('not json')
  })
  it('uses local calendar days across month boundaries', () => {
    const now = new Date(2026, 2, 2, 0, 5).getTime()
    expect(dayKey(now)).toBe('2026-03-02')
    expect(weekDays(now).map((day) => day.key)).toEqual([
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
  })
})

import { defaults, initialState, reconcile, State } from './model'
export const DATA_KEY = 'pomo-studio:v1'
export const DEMO_KEY = 'pomo-studio:demo:v2'
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const num = (value: unknown, min = 0, max = 1e15): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const str = (value: unknown, max = 1000): value is string =>
  typeof value === 'string' && value.length <= max
const oneOf = (value: unknown, options: unknown[]) => options.includes(value)
const nullableId = (value: unknown) => value === null || str(value, 100)
const unique = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length
export function parseState(raw: string): State {
  if (raw.length > 5_000_000) throw new Error('Backup is too large')
  const value: unknown = JSON.parse(raw)
  if (!record(value) || value.version !== 1 || !record(value.settings) || !record(value.timer))
    throw new Error('Unsupported backup')
  const s = value.settings
  const timer = value.timer
  const settingsValid =
    ['focus', 'short', 'long'].every((key) => num(s[key], 1, 120) && Number.isInteger(s[key])) &&
    num(s.longEvery, 2, 12) &&
    Number.isInteger(s.longEvery) &&
    num(s.goal, 1, 20) &&
    Number.isInteger(s.goal) &&
    typeof s.sound === 'boolean' &&
    typeof s.notifications === 'boolean' &&
    oneOf(s.language, ['en', 'zh']) &&
    oneOf(s.theme, ['light', 'dark'])
  const tasksValid =
    Array.isArray(value.tasks) &&
    value.tasks.length <= 500 &&
    value.tasks.every(
      (task) =>
        record(task) &&
        str(task.id, 100) &&
        str(task.title, 180) &&
        num(task.estimate, 1, 20) &&
        Number.isInteger(task.estimate) &&
        typeof task.done === 'boolean' &&
        str(task.nextStep),
    )
  const thoughtsValid =
    Array.isArray(value.thoughts) &&
    value.thoughts.length <= 500 &&
    value.thoughts.every(
      (item) =>
        record(item) &&
        str(item.id, 100) &&
        str(item.text, 500) &&
        num(item.createdAt) &&
        nullableId(item.sessionId),
    )
  const sessionsValid =
    Array.isArray(value.sessions) &&
    value.sessions.length <= 5000 &&
    value.sessions.every(
      (item) =>
        record(item) &&
        str(item.id, 100) &&
        nullableId(item.taskId) &&
        str(item.taskTitle, 180) &&
        num(item.startedAt) &&
        num(item.endedAt) &&
        item.endedAt >= item.startedAt &&
        num(item.seconds, 0, 7200) &&
        num(item.detours, 0, 100000) &&
        oneOf(item.outcome, ['completed', 'partial']) &&
        oneOf(item.energy, ['low', 'steady', 'high']),
    )
  const timerValid =
    str(timer.id, 100) &&
    num(timer.detourCount, 0, 100000) &&
    Number.isInteger(timer.detourCount) &&
    oneOf(timer.mode, ['focus', 'short', 'long']) &&
    oneOf(timer.status, ['idle', 'running', 'paused', 'finished']) &&
    num(timer.durationMs, 60000, 7200000) &&
    num(timer.remainingMs, 0, timer.durationMs) &&
    (timer.deadline === null || num(timer.deadline)) &&
    (timer.startedAt === null || num(timer.startedAt)) &&
    nullableId(timer.taskId) &&
    oneOf(timer.energy, ['low', 'steady', 'high']) &&
    oneOf(timer.outcome, [null, 'completed', 'partial'])
  if (
    !settingsValid ||
    !tasksValid ||
    !thoughtsValid ||
    !sessionsValid ||
    !timerValid ||
    !oneOf(value.energy, ['low', 'steady', 'high']) ||
    !str(value.nextStep) ||
    !num(value.cycle, 0, 100000)
  )
    throw new Error('Invalid backup data')
  const state = value as unknown as State
  if (!unique(state.tasks) || !unique(state.thoughts) || !unique(state.sessions))
    throw new Error('Duplicate identifiers')
  if (
    state.timer.status === 'running' &&
    (state.timer.deadline === null || state.timer.startedAt === null)
  )
    throw new Error('Invalid running timer')
  if (
    state.timer.status === 'paused' &&
    (state.timer.startedAt === null || state.timer.deadline !== null)
  )
    throw new Error('Invalid paused timer')
  if (
    state.timer.status === 'idle' &&
    (state.timer.startedAt !== null || state.timer.deadline !== null)
  )
    throw new Error('Invalid idle timer')
  if (
    state.timer.status === 'finished' &&
    (state.timer.startedAt === null ||
      state.timer.deadline !== null ||
      state.timer.remainingMs !== 0 ||
      state.timer.outcome === null)
  )
    throw new Error('Invalid finished timer')
  if (state.timer.status !== 'finished' && state.timer.outcome !== null)
    throw new Error('Unexpected timer outcome')
  if (!Number.isInteger(state.cycle)) throw new Error('Invalid cycle')
  if (state.timer.status === 'idle' && state.timer.remainingMs !== state.timer.durationMs)
    throw new Error('Invalid idle duration')
  if (state.timer.taskId && !state.tasks.some((task) => task.id === state.timer.taskId))
    throw new Error('Missing active task')
  return state
}
export function loadState(key: string, demo: boolean): { state: State; error: boolean } {
  try {
    const raw = localStorage.getItem(key)
    return {
      state: raw
        ? reconcile(parseState(raw), Date.now())
        : demo
          ? demoState()
          : initialState(navigator.language.startsWith('zh') ? 'zh' : 'en'),
      error: false,
    }
  } catch {
    // The hook keeps persistence off until the user explicitly replaces the data.
    return { state: initialState(), error: true }
  }
}
export function demoState(): State {
  const state = initialState()
  state.tasks = [
    {
      id: 'demo-1',
      title: 'Shape the next big idea',
      estimate: 3,
      done: false,
      nextStep: 'Sketch three possible openings. Pick the one that feels most honest.',
    },
    { id: 'demo-2', title: 'Read a chapter, take a note', estimate: 1, done: false, nextStep: '' },
    { id: 'demo-3', title: 'Clear a little mental space', estimate: 1, done: true, nextStep: '' },
  ]
  state.timer.taskId = 'demo-1'
  const now = new Date()
  now.setHours(9, 0, 0, 0)
  const first = Math.min(Date.now() - 3600000, now.getTime())
  state.sessions = [0, 1, 2, 3, 4, 5, 6].flatMap((day) =>
    Array.from({ length: [2, 3, 1, 4, 2, 3, 2][day] }, (_, n) => {
      const date = new Date(first)
      date.setDate(date.getDate() - day)
      return {
        id: `sample-${day}-${n}`,
        taskId: day === 0 ? 'demo-1' : null,
        taskTitle:
          day === 0
            ? 'Shape the next big idea'
            : ['Read and reflect', 'Write a useful first draft', 'Plan a smaller next step'][
                day % 3
              ],
        startedAt: date.getTime() + n * 1800000,
        endedAt: date.getTime() + n * 1800000 + 1500000,
        seconds: 1500,
        outcome: 'completed' as const,
        energy: 'steady' as const,
        detours: n,
      }
    }),
  )
  state.cycle = 2
  state.thoughts = [
    {
      id: 'thought-demo',
      text: 'Find that article about creative routines',
      createdAt: Date.now(),
      sessionId: null,
    },
  ]
  state.settings = { ...defaults }
  return state
}

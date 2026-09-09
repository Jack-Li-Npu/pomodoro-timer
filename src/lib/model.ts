export type Mode = 'focus' | 'short' | 'long'
export type Energy = 'low' | 'steady' | 'high'
export interface Settings {
  focus: number
  short: number
  long: number
  longEvery: number
  goal: number
  sound: boolean
  notifications: boolean
  language: 'en' | 'zh'
  theme: 'light' | 'dark'
}
export interface Task {
  id: string
  title: string
  estimate: number
  done: boolean
  nextStep: string
}
export interface Thought {
  id: string
  text: string
  createdAt: number
  sessionId: string | null
}
export interface Session {
  id: string
  taskId: string | null
  taskTitle: string
  startedAt: number
  endedAt: number
  seconds: number
  outcome: 'completed' | 'partial'
  energy: Energy
  detours: number
}
export interface Timer {
  id: string
  mode: Mode
  status: 'idle' | 'running' | 'paused' | 'finished'
  durationMs: number
  remainingMs: number
  deadline: number | null
  startedAt: number | null
  taskId: string | null
  energy: Energy
  detourCount: number
  outcome: 'completed' | 'partial' | null
}
export interface State {
  version: 1
  settings: Settings
  tasks: Task[]
  thoughts: Thought[]
  sessions: Session[]
  timer: Timer
  energy: Energy
  nextStep: string
  cycle: number
}
export const defaults: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  goal: 4,
  sound: true,
  notifications: false,
  language: 'en',
  theme: 'light',
}
export const uid = () => crypto.randomUUID()
export function newTimer(mode: Mode, settings: Settings, taskId: string | null = null): Timer {
  return {
    id: uid(),
    mode,
    status: 'idle',
    durationMs: settings[mode] * 60000,
    remainingMs: settings[mode] * 60000,
    deadline: null,
    startedAt: null,
    taskId,
    energy: 'steady',
    detourCount: 0,
    outcome: null,
  }
}
export function initialState(language: 'en' | 'zh' = 'en'): State {
  const settings = { ...defaults, language }
  return {
    version: 1,
    settings,
    tasks: [],
    thoughts: [],
    sessions: [],
    timer: newTimer('focus', settings),
    energy: 'steady',
    nextStep: '',
    cycle: 0,
  }
}
export function remaining(timer: Timer, now: number): number {
  return timer.status === 'running' && timer.deadline !== null
    ? Math.max(0, Math.min(timer.durationMs, timer.deadline - now))
    : timer.remainingMs
}
export const isActive = (timer: Timer) => timer.startedAt !== null && timer.status !== 'finished'
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function weekDays(now: number): { key: string; date: Date }[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 6 + index)
    return { key: dayKey(date.getTime()), date }
  })
}
export function nextMode(state: State): Mode {
  if (state.timer.mode !== 'focus') return 'focus'
  return state.cycle >= state.settings.longEvery ? 'long' : 'short'
}
function finish(state: State, now: number, partial = false): State {
  const timer = state.timer
  if (!isActive(timer)) return state
  const left = remaining(timer, now)
  const completed = !partial || left === 0
  const endedAt = Math.max(
    timer.startedAt ?? now,
    completed && timer.deadline !== null ? Math.min(now, timer.deadline) : now,
  )
  const seconds = Math.floor((timer.durationMs - left) / 1000)
  const session: Session = {
    id: timer.id,
    taskId: timer.taskId,
    taskTitle: state.tasks.find((task) => task.id === timer.taskId)?.title ?? '',
    startedAt: timer.startedAt ?? now,
    endedAt,
    seconds,
    outcome: completed ? 'completed' : 'partial',
    energy: timer.energy,
    detours: timer.detourCount,
  }
  const shouldSave =
    timer.mode === 'focus' && seconds > 0 && !state.sessions.some((item) => item.id === timer.id)
  return {
    ...state,
    sessions: shouldSave ? [...state.sessions, session].slice(-5000) : state.sessions,
    cycle:
      timer.mode === 'focus' && completed
        ? state.cycle + 1
        : timer.mode === 'long' && completed
          ? 0
          : state.cycle,
    timer: {
      ...timer,
      status: 'finished',
      remainingMs: 0,
      deadline: null,
      outcome: completed ? 'completed' : 'partial',
    },
  }
}
export function reconcile(state: State, now: number): State {
  return state.timer.status === 'running' && remaining(state.timer, now) === 0
    ? finish(state, now)
    : state
}
export type Action =
  | { type: 'toggle'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'reset' }
  | { type: 'mode'; mode: Mode }
  | { type: 'next' }
  | { type: 'extend'; now: number }
  | { type: 'energy'; energy: Energy }
  | { type: 'fit' }
  | { type: 'select'; id: string | null }
  | { type: 'addTask'; title: string; estimate: number }
  | { type: 'updateTask'; task: Task }
  | { type: 'toggleTask'; id: string }
  | { type: 'removeTask'; id: string }
  | { type: 'note'; text: string }
  | { type: 'thought'; text: string; now: number }
  | { type: 'removeThought'; id: string }
  | { type: 'promoteThought'; id: string }
  | { type: 'settings'; settings: Settings }
  | { type: 'replace'; state: State }
export function reducer(current: State, action: Action): State {
  const state = 'now' in action ? reconcile(current, action.now) : current
  const timer = state.timer
  switch (action.type) {
    case 'replace':
      return action.state
    case 'tick':
      return state
    case 'toggle': {
      if (timer.status === 'finished') return state
      if (timer.status === 'running')
        return {
          ...state,
          timer: {
            ...timer,
            status: 'paused',
            remainingMs: remaining(timer, action.now),
            deadline: null,
          },
        }
      return {
        ...state,
        timer: {
          ...timer,
          status: 'running',
          deadline: action.now + timer.remainingMs,
          startedAt: timer.startedAt ?? action.now,
          energy: timer.startedAt === null ? state.energy : timer.energy,
        },
      }
    }
    case 'finish':
      return finish(state, action.now, true)
    case 'reset':
      return { ...state, timer: newTimer(timer.mode, state.settings, timer.taskId) }
    case 'mode':
      return isActive(timer)
        ? state
        : { ...state, timer: newTimer(action.mode, state.settings, timer.taskId) }
    case 'next':
      return timer.status !== 'finished'
        ? state
        : {
            ...state,
            timer: newTimer(
              nextMode(state),
              state.settings,
              state.tasks.some((task) => task.id === timer.taskId && !task.done)
                ? timer.taskId
                : null,
            ),
          }
    case 'extend': {
      if (!isActive(timer) || timer.mode !== 'focus' || timer.durationMs >= 120 * 60000)
        return state
      const extra = Math.min(5 * 60000, 120 * 60000 - timer.durationMs)
      return {
        ...state,
        timer: {
          ...timer,
          durationMs: timer.durationMs + extra,
          remainingMs: timer.remainingMs + extra,
          deadline: timer.deadline === null ? null : timer.deadline + extra,
        },
      }
    }
    case 'energy':
      return { ...state, energy: action.energy }
    case 'fit': {
      if (isActive(timer) || timer.status === 'finished') return state
      const minutes = { low: 15, steady: 25, high: 45 }[state.energy]
      return {
        ...state,
        timer: {
          ...newTimer('focus', state.settings, timer.taskId),
          durationMs: minutes * 60000,
          remainingMs: minutes * 60000,
        },
      }
    }
    case 'select':
      return isActive(timer) ? state : { ...state, timer: { ...timer, taskId: action.id } }
    case 'addTask': {
      const title = action.title.trim().slice(0, 180)
      if (!title || state.tasks.length >= 500) return state
      const task = {
        id: uid(),
        title,
        estimate: Math.min(20, Math.max(1, Math.round(action.estimate))),
        done: false,
        nextStep: '',
      }
      return {
        ...state,
        tasks: [...state.tasks, task],
        timer: !isActive(timer) && !timer.taskId ? { ...timer, taskId: task.id } : timer,
      }
    }
    case 'updateTask':
      return isActive(timer) && timer.taskId === action.task.id
        ? state
        : {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === action.task.id
                ? {
                    ...task,
                    title: action.task.title.trim().slice(0, 180) || task.title,
                    estimate: Math.max(1, Math.min(20, Math.round(action.task.estimate))),
                  }
                : task,
            ),
          }
    case 'toggleTask':
      return isActive(timer) && timer.taskId === action.id
        ? state
        : {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === action.id ? { ...task, done: !task.done } : task,
            ),
            timer: timer.taskId === action.id ? { ...timer, taskId: null } : timer,
          }
    case 'removeTask':
      return isActive(timer) && timer.taskId === action.id
        ? state
        : {
            ...state,
            tasks: state.tasks.filter((task) => task.id !== action.id),
            timer: timer.taskId === action.id ? { ...timer, taskId: null } : timer,
          }
    case 'note':
      return timer.taskId
        ? {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === timer.taskId ? { ...task, nextStep: action.text.slice(0, 1000) } : task,
            ),
          }
        : { ...state, nextStep: action.text.slice(0, 1000) }
    case 'thought': {
      const text = action.text.trim().slice(0, 500)
      if (!text || state.thoughts.length >= 500) return state
      return {
        ...state,
        timer: isActive(timer) ? { ...timer, detourCount: timer.detourCount + 1 } : timer,
        thoughts: [
          ...state.thoughts,
          { id: uid(), text, createdAt: action.now, sessionId: isActive(timer) ? timer.id : null },
        ],
      }
    }
    case 'removeThought':
      return { ...state, thoughts: state.thoughts.filter((thought) => thought.id !== action.id) }
    case 'promoteThought': {
      const thought = state.thoughts.find((item) => item.id === action.id)
      if (!thought || state.tasks.length >= 500) return state
      return {
        ...state,
        tasks: [
          ...state.tasks,
          { id: uid(), title: thought.text.slice(0, 180), estimate: 1, done: false, nextStep: '' },
        ],
        thoughts: state.thoughts.filter((item) => item.id !== action.id),
      }
    }
    case 'settings':
      return {
        ...state,
        settings: action.settings,
        timer:
          timer.status === 'idle' && state.settings[timer.mode] !== action.settings[timer.mode]
            ? newTimer(timer.mode, action.settings, timer.taskId)
            : timer,
      }
  }
}
export function backupState(state: State, now: number): State {
  const settled = reconcile(state, now)
  return settled.timer.status === 'running' ? reducer(settled, { type: 'toggle', now }) : settled
}

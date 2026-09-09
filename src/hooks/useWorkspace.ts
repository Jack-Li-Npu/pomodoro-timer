import { useEffect, useReducer, useRef, useState } from 'react'
import { loadState, parseState } from '../lib/storage'
import { reducer, State } from '../lib/model'

export function useWorkspace(key: string, demo: boolean) {
  const [loaded] = useState(() => loadState(key, demo))
  const [state, dispatch] = useReducer(reducer, loaded.state)
  const [writable, setWritable] = useState(false)
  const [recovery, setRecovery] = useState(loaded.error)
  const [saveError, setSaveError] = useState(false)
  const release = useRef<(() => void) | null>(null)
  useEffect(() => {
    let cancelled = false
    function acquire() {
      if (cancelled) return
      const latest = loadState(key, demo)
      dispatch({ type: 'replace', state: latest.state })
      setRecovery(latest.error)
      setWritable(true)
    }
    if (navigator.locks) {
      void navigator.locks
        .request(key, async () => {
          if (cancelled) return
          acquire()
          await new Promise<void>((resolve) => {
            release.current = resolve
          })
        })
        .catch(() => {
          if (!cancelled) setSaveError(true)
        })
    } else acquire()
    return () => {
      cancelled = true
      release.current?.()
      release.current = null
    }
  }, [key, demo])
  useEffect(() => {
    if (!writable || recovery) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }, [state, key, writable, recovery])
  useEffect(() => {
    if (writable) return
    function sync(event: StorageEvent) {
      if (event.key !== key || !event.newValue) return
      try {
        dispatch({ type: 'replace', state: parseState(event.newValue) })
      } catch {
        setRecovery(true)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key, writable])
  useEffect(() => {
    if (!writable || recovery || state.timer.status !== 'running') return
    const tick = () => dispatch({ type: 'tick', now: Date.now() })
    const interval = window.setInterval(tick, 250)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [state.timer.status, writable, recovery])
  function replace(next: State) {
    setRecovery(false)
    dispatch({ type: 'replace', state: next })
  }
  return { state, dispatch, writable, recovery, saveError, replace }
}
export function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

import { useEffect, useState } from 'react'
export type OfflineStatus =
  'offlinePreparing' | 'offlineReady' | 'offlineUnavailable' | 'offlineDevelopment'
export function useOffline(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(
    import.meta.env.PROD ? 'offlinePreparing' : 'offlineDevelopment',
  )
  useEffect(() => {
    if (!import.meta.env.PROD) return
    if (!('serviceWorker' in navigator)) {
      setStatus('offlineUnavailable')
      return
    }
    let cancelled = false
    const update = (next: OfflineStatus) => {
      if (!cancelled) setStatus(next)
    }
    async function install() {
      try {
        const registration = await navigator.serviceWorker.register(
          `${import.meta.env.BASE_URL}sw.js`,
        )
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'redundant' && !registration.active) update('offlineUnavailable')
        })
        await navigator.serviceWorker.ready
        update('offlineReady')
      } catch {
        update('offlineUnavailable')
      }
    }
    void install()
    return () => {
      cancelled = true
    }
  }, [])
  return status
}

import { useEffect, useState, type ReactNode } from 'react'
import {
  CurrentTimeContext,
  INITIAL_TIME_SNAPSHOT,
  captureCurrentTimeSnapshot,
  type CurrentTimeSnapshot,
} from '@/shared/time/currentTimeContext'

export function CurrentTimeProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<CurrentTimeSnapshot>(INITIAL_TIME_SNAPSHOT)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setSnapshot(captureCurrentTimeSnapshot())
    }, 60_000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <CurrentTimeContext.Provider value={snapshot}>
      {children}
    </CurrentTimeContext.Provider>
  )
}

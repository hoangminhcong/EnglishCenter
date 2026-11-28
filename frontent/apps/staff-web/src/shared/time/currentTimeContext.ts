import { createContext } from 'react'
import { getTodayIsoInVietnam } from '@english-center/utils'

export interface CurrentTimeSnapshot {
  nowIso: string
  todayYmdVn: string
}

export function captureCurrentTimeSnapshot(): CurrentTimeSnapshot {
  return {
    nowIso: new Date().toISOString(),
    todayYmdVn: getTodayIsoInVietnam(),
  }
}

export const INITIAL_TIME_SNAPSHOT: CurrentTimeSnapshot = captureCurrentTimeSnapshot()

export const CurrentTimeContext = createContext<CurrentTimeSnapshot>(INITIAL_TIME_SNAPSHOT)

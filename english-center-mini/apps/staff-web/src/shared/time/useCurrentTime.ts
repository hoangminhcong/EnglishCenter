import { useContext } from 'react'
import {
  CurrentTimeContext,
  type CurrentTimeSnapshot,
} from '@/shared/time/currentTimeContext'

export function useCurrentTime(): CurrentTimeSnapshot {
  return useContext(CurrentTimeContext)
}

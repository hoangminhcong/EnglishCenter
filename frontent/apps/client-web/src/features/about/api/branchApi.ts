import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { branches as seedBranches } from '@/features/about/mocks/branches'
import type { Branch } from '@/features/about/types'

export interface BranchQueryOptions {
  scope?: 'all-active' | 'map' | 'schedule'
}

function applyScope(list: Branch[], scope: NonNullable<BranchQueryOptions['scope']>): Branch[] {
  return list
    .filter((b) => {
      if (!b.isActive) return false
      if (scope === 'map') return b.showOnMap
      if (scope === 'schedule') return b.showInSchedule
      return true
    })
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

export const branchApi = {
  /**
   * scope = 'map': cơ sở vật lý hiển thị ở trang Hệ thống cơ sở & Footer
   * scope = 'schedule': cơ sở/kênh học hiển thị trên Tab Lịch khai giảng
   */
  async getPublicBranches(options?: BranchQueryOptions): Promise<Branch[]> {
    const scope = options?.scope ?? 'all-active'

    if (!USE_MOCK_API) {
      const list = await httpClient.get<Branch[]>(API_ENDPOINTS.branches.publicList, { scope })
      return list.filter((b) => b.isActive).sort((a, b) => a.displayOrder - b.displayOrder)
    }

    await mockDelay()
    return applyScope(seedBranches, scope)
  },
}

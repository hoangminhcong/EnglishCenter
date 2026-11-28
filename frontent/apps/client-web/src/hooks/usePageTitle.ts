import { useEffect } from 'react'
import { centerInfo } from '@/config/center-info'

/** Cập nhật tiêu đề tab trình duyệt theo từng trang */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return
    document.title = `${title} | ${centerInfo.name}`
  }, [title])
}

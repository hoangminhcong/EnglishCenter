export type MediaKind = 'image' | 'audio' | 'document'

export type MediaStorageStatus = 'temporary' | 'ready' | 'failed'

export interface MediaRef {
  id: string
  kind: MediaKind
  fileName: string
  mimeType: string
  sizeBytes?: number
  durationSec?: number
  url: string
  status: MediaStorageStatus
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Không rõ dung lượng'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

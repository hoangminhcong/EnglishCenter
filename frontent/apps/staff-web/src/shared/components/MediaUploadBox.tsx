import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FileText, Image as ImageIcon, Link2, Music, Trash2, Upload } from 'lucide-react'
import { Badge, Button } from '@english-center/ui'
import { toSafeHttpUrl } from '@english-center/utils'
import {
  formatFileSize,
  type MediaKind,
  type MediaRef,
} from '@/shared/types/media.types'

export interface MediaUploadBoxProps {
  label: string
  kind: MediaKind
  value: MediaRef | null
  onChange: (next: MediaRef | null) => void
  disabled?: boolean
}

const ACCEPT_MAP: Record<MediaKind, string> = {
  image: 'image/png,image/jpeg,image/webp,image/gif',
  audio: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4',
  document: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,audio/*,video/*,image/*',
}

export function MediaUploadBox({
  label,
  kind,
  value,
  onChange,
  disabled = false,
}: MediaUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const seqRef = useRef(0)
  const createdBlobUrlRef = useRef<string | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const revokePreviousBlobIfNeeded = () => {
    if (createdBlobUrlRef.current) {
      URL.revokeObjectURL(createdBlobUrlRef.current)
      createdBlobUrlRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      revokePreviousBlobIfNeeded()
    }
  }, [])

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    revokePreviousBlobIfNeeded()
    seqRef.current += 1
    const objectUrl = URL.createObjectURL(file)
    createdBlobUrlRef.current = objectUrl
    const baseRef: MediaRef = {
      id: `media-local-${seqRef.current}`,
      kind,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      url: objectUrl,
      status: 'temporary',
    }

    if (kind === 'audio') {
      const probe = new Audio(objectUrl)
      probe.onloadedmetadata = () => {
        const dur = Number.isFinite(probe.duration) ? Math.round(probe.duration) : undefined
        onChange({ ...baseRef, durationSec: dur })
      }
      probe.onerror = () => {
        onChange({ ...baseRef, status: 'failed' })
      }
    }

    onChange(baseRef)
    setUrlError(null)
    e.target.value = ''
  }

  const handleApplyExternalUrl = () => {
    const safe = toSafeHttpUrl(externalUrl.trim())
    if (!safe) {
      setUrlError('Chỉ chấp nhận đường dẫn http:// hoặc https:// hợp lệ.')
      return
    }
    seqRef.current += 1
    const fileName = safe.split('/').pop()?.split('?')[0] || `${kind}-external`
    onChange({
      id: `media-url-${seqRef.current}`,
      kind,
      fileName,
      mimeType: kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/mpeg' : 'application/pdf',
      url: safe,
      status: 'ready',
    })
    setExternalUrl('')
    setUrlError(null)
  }

  const KindIcon = kind === 'image' ? ImageIcon : kind === 'audio' ? Music : FileText

  return (
    <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#243B53]">
          <KindIcon className="h-3.5 w-3.5 text-[#2878B8]" />
          <span>{label}</span>
        </span>
        {value && (
          <Badge
            tone={
              value.status === 'failed'
                ? 'danger'
                : value.status === 'temporary'
                  ? 'warning'
                  : 'success'
            }
          >
            {value.status === 'failed'
              ? 'Tệp lỗi'
              : value.status === 'temporary'
                ? 'Đã chọn tệp từ máy'
                : 'Liên kết sẵn sàng'}
          </Badge>
        )}
      </div>

      {value ? (
        <div className="mt-2.5 space-y-2.5 rounded-xl border border-[#DCEAF3] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-[#243B53]">{value.fileName}</p>
              <p className="text-[#64748B]">
                {value.mimeType}
                {value.sizeBytes ? ` • ${formatFileSize(value.sizeBytes)}` : ''}
                {value.durationSec ? ` • ${value.durationSec}s` : ''}
              </p>
            </div>
            {!disabled && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => inputRef.current?.click()}
                >
                  Thay tệp
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    revokePreviousBlobIfNeeded()
                    onChange(null)
                  }}
                  aria-label="Xóa tệp đính kèm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {kind === 'image' && value.url && (
            <img
              src={value.url}
              alt={value.fileName}
              className="max-h-40 rounded-lg border border-[#DCEAF3] object-contain"
            />
          )}

          {kind === 'audio' && value.url && (
            <audio controls src={value.url} className="h-9 w-full">
              Trình duyệt không hỗ trợ phát âm thanh.
            </audio>
          )}
        </div>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Chọn tệp từ máy</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="url"
                disabled={disabled}
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value)
                  setUrlError(null)
                }}
                placeholder="Hoặc dán URL https://..."
                className="w-full rounded-lg border border-[#DCEAF3] bg-white py-1.5 pr-3 pl-8 text-xs text-[#243B53] outline-none focus:border-[#75BDEB]"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled || !externalUrl.trim()}
              onClick={handleApplyExternalUrl}
            >
              Gắn URL
            </Button>
          </div>
          {urlError && <p className="text-xs font-medium text-[#B93A2E]">{urlError}</p>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MAP[kind]}
        onChange={handleFilePick}
        className="hidden"
      />
    </div>
  )
}

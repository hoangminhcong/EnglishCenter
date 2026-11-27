import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Eye, Mail, MapPin, Phone, Plus, Save, Trash2 } from 'lucide-react'
import { Badge, Button, ErrorBlock, InputField, LoadingBlock } from '@english-center/ui'
import {
  formatDateTimeVi,
  isValidEmail,
  isValidVnPhone,
  toSafeHttpUrl,
} from '@english-center/utils'
import {
  displayOrPlaceholder,
  type CenterInfoSettings,
  type WorkingHourSlot,
} from '@/config/center.config'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { cmsApi } from '@/features/content/api/cmsApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { createUniqueId } from '@/shared/utils/staffFormatters'

function isOptionalSocialValid(raw: string): boolean {
  const v = raw.trim()
  if (!v) return true
  return Boolean(toSafeHttpUrl(v))
}

export function CenterInfoPage() {
  useDocumentTitle('Thông tin trung tâm')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const canUpdate = hasPermission(user, 'center_info.update')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'cms', 'center-info'],
    queryFn: () => cmsApi.getCenterInfo(),
  })

  const [editedDraft, setEditedDraft] = useState<CenterInfoSettings | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const draft = editedDraft ?? data ?? null
  const setDraft = (next: CenterInfoSettings) => setEditedDraft(next)

  const actorLabel = user ? `${user.fullName} (${user.employeeCode})` : 'Quản trị viên'

  const saveMutation = useMutation({
    mutationFn: (payload: CenterInfoSettings) => cmsApi.updateCenterInfo(payload, actorLabel),
    onSuccess: (saved) => {
      setEditedDraft(saved)
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'center-info'] })
      notify({
        tone: 'success',
        title: 'Đã lưu cấu hình thông tin trung tâm',
        description:
          'Thông tin nhận diện thương hiệu, khung giờ làm việc và các kênh liên hệ đã được cập nhật.',
      })
    },
  })

  if (isLoading || !draft) return <LoadingBlock label="Đang tải cấu hình trung tâm..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải thông tin trung tâm."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const updateWorkingHourSlot = (
    slotId: string,
    field: keyof Omit<WorkingHourSlot, 'id'>,
    value: string,
  ) => {
    setDraft({
      ...draft,
      workingHours: draft.workingHours.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot,
      ),
    })
  }

  const addWorkingHourSlot = () => {
    setDraft({
      ...draft,
      workingHours: [
        ...draft.workingHours,
        {
          id: createUniqueId('wh'),
          label: 'Ca học',
          time: '08:00 – 17:30',
          note: 'Thứ Hai - Thứ Bảy',
        },
      ],
    })
  }

  const removeWorkingHourSlot = (slotId: string) => {
    if (draft.workingHours.length <= 1) return
    setDraft({
      ...draft,
      workingHours: draft.workingHours.filter((slot) => slot.id !== slotId),
    })
  }

  const handleValidateBeforeConfirm = () => {
    setValidationError(null)
    if (!draft.name.trim()) {
      setValidationError('Tên thương hiệu trung tâm không được để trống.')
      return
    }
    if (!isValidVnPhone(draft.hotline.replace(/\s+/g, ''))) {
      setValidationError('Hotline trung tâm phải đúng định dạng 10 chữ số Việt Nam.')
      return
    }
    if (!isValidEmail(draft.email.trim())) {
      setValidationError('Email liên hệ không đúng định dạng hợp lệ.')
      return
    }
    if (
      draft.workingHours.length === 0 ||
      draft.workingHours.some((wh) => !wh.label.trim() || !wh.time.trim())
    ) {
      setValidationError('Vui lòng nhập đầy đủ nhãn ca và khung giờ làm việc của trung tâm.')
      return
    }
    if (!draft.copyrightText.trim()) {
      setValidationError('Dòng bản quyền (Copyright) không được để trống.')
      return
    }
    const socialEntries = Object.values(draft.social)
    if (socialEntries.some((url) => !isOptionalSocialValid(url))) {
      setValidationError(
        'Liên kết mạng xã hội phải bắt đầu bằng http:// hoặc https:// (hoặc để trống nếu chưa công bố).',
      )
      return
    }
    setConfirmOpen(true)
  }

  const activeSocialList = (
    [
      { key: 'Facebook', url: draft.social.facebook },
      { key: 'Zalo', url: draft.social.zalo },
      { key: 'Messenger', url: draft.social.messenger },
      { key: 'Instagram', url: draft.social.instagram },
      { key: 'YouTube', url: draft.social.youtube },
      { key: 'TikTok', url: draft.social.tiktok },
    ] as const
  ).filter((item) => item.url.trim().length > 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thông tin Trung tâm"
        description="Cấu hình thương hiệu, thông tin liên hệ và giờ làm việc của trung tâm."
        badge={<Badge tone="info">Cấu hình chung</Badge>}
        actions={
          <ActionGuard permission="center_info.update">
            <Button onClick={handleValidateBeforeConfirm}>
              <Save className="h-4 w-4" />
              <span>Lưu cấu hình trung tâm</span>
            </Button>
          </ActionGuard>
        }
      />

      {validationError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-4 py-3 text-sm font-semibold text-[#B93A2E]">
          {validationError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột chỉnh sửa */}
        <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
          <h2 className="text-base font-bold text-[#243B53]">1. Thông tin nhận diện & Liên hệ</h2>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              id="ci-name"
              label="Tên thương hiệu chính thức"
              disabled={!canUpdate}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <InputField
              id="ci-slogan"
              label="Khẩu hiệu (Slogan)"
              disabled={!canUpdate}
              value={draft.slogan}
              onChange={(e) => setDraft({ ...draft, slogan: e.target.value })}
            />
            <InputField
              id="ci-hotline"
              label="Hotline tổng đài"
              disabled={!canUpdate}
              value={draft.hotline}
              onChange={(e) => setDraft({ ...draft, hotline: e.target.value })}
            />
            <InputField
              id="ci-email"
              label="Email liên hệ chính thức"
              disabled={!canUpdate}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="contact@englishcenter.edu.vn"
            />
          </div>

          <InputField
            id="ci-address"
            label="Địa chỉ trụ sở chính"
            disabled={!canUpdate}
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />

          <div>
            <label
              htmlFor="ci-intro"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
            >
              Đoạn giới thiệu Footer
            </label>
            <textarea
              id="ci-intro"
              rows={3}
              disabled={!canUpdate}
              value={draft.intro}
              onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
              className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#243B53]">2. Khung giờ làm việc</h2>
              {canUpdate && (
                <Button size="sm" variant="secondary" onClick={addWorkingHourSlot}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm ca làm việc</span>
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {draft.workingHours.map((slot, index) => (
                <div
                  key={slot.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 sm:grid-cols-12 sm:items-end"
                >
                  <div className="sm:col-span-3">
                    <InputField
                      id={`ci-wh-label-${index}`}
                      label="Buổi / Ca"
                      disabled={!canUpdate}
                      value={slot.label}
                      onChange={(e) => updateWorkingHourSlot(slot.id, 'label', e.target.value)}
                      placeholder="Sáng"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <InputField
                      id={`ci-wh-time-${index}`}
                      label="Khung giờ"
                      disabled={!canUpdate}
                      value={slot.time}
                      onChange={(e) => updateWorkingHourSlot(slot.id, 'time', e.target.value)}
                      placeholder="08:00 – 12:00"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <InputField
                      id={`ci-wh-note-${index}`}
                      label="Ngày áp dụng"
                      disabled={!canUpdate}
                      value={slot.note}
                      onChange={(e) => updateWorkingHourSlot(slot.id, 'note', e.target.value)}
                      placeholder="Thứ Hai - Thứ Bảy"
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={draft.workingHours.length <= 1}
                        onClick={() => removeWorkingHourSlot(slot.id)}
                        aria-label="Xóa ca làm việc"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#B93A2E]" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 className="pt-2 text-base font-bold text-[#243B53]">
            3. Liên kết mạng xã hội (Để trống nếu chưa công bố)
          </h2>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              id="ci-fb"
              label="Facebook Fanpage URL"
              disabled={!canUpdate}
              value={draft.social.facebook}
              placeholder="https://www.facebook.com/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, facebook: e.target.value } })
              }
            />
            <InputField
              id="ci-zalo"
              label="Zalo OA / Hotline URL"
              disabled={!canUpdate}
              value={draft.social.zalo}
              placeholder="https://zalo.me/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, zalo: e.target.value } })
              }
            />
            <InputField
              id="ci-msg"
              label="Messenger URL"
              disabled={!canUpdate}
              value={draft.social.messenger}
              placeholder="https://m.me/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, messenger: e.target.value } })
              }
            />
            <InputField
              id="ci-ig"
              label="Instagram URL"
              disabled={!canUpdate}
              value={draft.social.instagram}
              placeholder="https://www.instagram.com/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, instagram: e.target.value } })
              }
            />
            <InputField
              id="ci-yt"
              label="Kênh YouTube"
              disabled={!canUpdate}
              value={draft.social.youtube}
              placeholder="https://www.youtube.com/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, youtube: e.target.value } })
              }
            />
            <InputField
              id="ci-tt"
              label="Kênh TikTok"
              disabled={!canUpdate}
              value={draft.social.tiktok}
              placeholder="https://www.tiktok.com/..."
              onChange={(e) =>
                setDraft({ ...draft, social: { ...draft.social, tiktok: e.target.value } })
              }
            />
          </div>

          <InputField
            id="ci-copy"
            label="4. Dòng bản quyền (Copyright)"
            disabled={!canUpdate}
            value={draft.copyrightText}
            onChange={(e) => setDraft({ ...draft, copyrightText: e.target.value })}
          />
        </div>

        {/* Cột Xem trước Header / Footer chuẩn màu Sky-Blue #75BDEB của Client Web */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2878B8]">
              <Eye className="h-4 w-4" />
              <span>Xem trước giao diện Header & Footer Website</span>
            </div>

            {/* Header Preview (#75BDEB topbar + Brand nav) */}
            <div className="overflow-hidden rounded-xl border border-[#DCEAF3] bg-white shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#75BDEB] px-3.5 py-1.5 text-[11px] font-semibold text-white">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>Hotline: {displayOrPlaceholder(draft.hotline)}</span>
                </span>
                <span className="truncate">{displayOrPlaceholder(draft.email)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-base font-black uppercase tracking-tight text-[#2878B8]">
                    <span className="text-[#F26522]">{draft.name.trim()[0] ?? 'E'}</span>
                    {draft.name.trim().slice(1) || 'nglish Center'}
                  </p>
                  <p className="text-[11px] font-semibold text-[#64748B]">
                    {displayOrPlaceholder(draft.slogan)}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F26522] px-2.5 py-1 text-[10px] font-bold text-white">
                  Tư vấn ngay
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-[#75BDEB] p-4 text-xs text-white shadow-2xs">
              <p className="text-base font-black uppercase tracking-tight text-white">
                {displayOrPlaceholder(draft.name)}
              </p>
              <p className="mt-1 leading-relaxed text-white/95">
                {displayOrPlaceholder(draft.intro)}
              </p>

              <div className="mt-3 space-y-1.5 border-t border-white/30 pt-2.5 text-white">
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{displayOrPlaceholder(draft.address)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{displayOrPlaceholder(draft.hotline)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{displayOrPlaceholder(draft.email)}</span>
                </p>
                <div className="flex items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="space-y-0.5">
                    {draft.workingHours.map((slot) => (
                      <p key={slot.id}>
                        <strong>{slot.label}:</strong> {slot.time}{' '}
                        {slot.note ? `(${slot.note})` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {activeSocialList.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/30 pt-2.5">
                  {activeSocialList.map((soc) => (
                    <span
                      key={soc.key}
                      className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      {soc.key}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 border-t border-white/30 pt-2 text-[11px] font-medium text-white/90">
                {displayOrPlaceholder(draft.copyrightText)}
              </p>
            </div>

            <p className="mt-3 text-xs text-[#64748B]">
              Cập nhật gần nhất:{' '}
              <strong>
                {draft.updatedAt ? formatDateTimeVi(draft.updatedAt) : 'Chưa cập nhật'}
              </strong>
              {draft.updatedBy.trim() ? ` bởi ${draft.updatedBy}` : ''}
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận lưu thông tin trung tâm"
        description="Xác nhận lưu thông tin nhận diện thương hiệu, giờ làm việc, kênh liên hệ và bản quyền mới cho hệ thống trung tâm?"
        loading={saveMutation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => saveMutation.mutate(draft)}
      />
    </div>
  )
}

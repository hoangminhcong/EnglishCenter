import { useEffect, useState, type SyntheticEvent } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, X } from 'lucide-react'
import { centerInfo } from '@/config/center-info'
import { isValidEmail, isValidVnPhone } from '@/utils/validators'
import { scheduleApi } from '@/features/schedules/api/scheduleApi'
import type { PublicScheduleItem, ScheduleBranch, ScheduleCourse } from '@/features/schedules/types'

interface ConsultationModalProps {
  open: boolean
  schedule: PublicScheduleItem | null
  branches: ScheduleBranch[]
  courses: ScheduleCourse[]
  onClose: () => void
}

interface FormValues {
  fullName: string
  phone: string
  email: string
  courseName: string
  branchName: string
  note: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const PHONE_ERROR = 'Số điện thoại Việt Nam không hợp lệ (VD: 0988123456)'

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên'
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự'
  }

  const normalizedPhone = values.phone.replace(/\s+/g, '')
  if (!normalizedPhone) {
    errors.phone = 'Vui lòng nhập số điện thoại'
  } else if (!isValidVnPhone(normalizedPhone)) {
    errors.phone = PHONE_ERROR
  }

  if (values.email.trim() && !isValidEmail(values.email)) {
    errors.email = 'Địa chỉ email không đúng định dạng'
  }

  if (!values.courseName.trim()) {
    errors.courseName = 'Vui lòng chọn khóa học quan tâm'
  }

  if (!values.branchName.trim()) {
    errors.branchName = 'Vui lòng chọn cơ sở mong muốn'
  }

  return errors
}

export default function ConsultationModal({
  open,
  schedule,
  branches,
  courses,
  onClose,
}: ConsultationModalProps) {
  const defaultCourseLabel = schedule
    ? `${schedule.courseName} ${schedule.courseSubtitle}`.trim()
    : ''
  const defaultBranchLabel = schedule?.branchName ?? ''

  const [values, setValues] = useState<FormValues>({
    fullName: '',
    phone: '',
    email: '',
    courseName: defaultCourseLabel,
    branchName: defaultBranchLabel,
    note: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Đóng Modal khi nhấn phím Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !schedule) return null

  const updateField = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validationErrors = validateForm(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await scheduleApi.submitConsultation({
        scheduleId: schedule.id,
        fullName: values.fullName.trim(),
        phone: values.phone.replace(/\s+/g, ''),
        email: values.email.trim() || undefined,
        courseName: values.courseName,
        branchName: values.branchName,
        note: values.note.trim() || undefined,
      })
      setSubmitStatus({ type: 'success', message: response.message })
      setValues((prev) => ({ ...prev, fullName: '', phone: '', email: '', note: '' }))
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Không thể gửi đăng ký lúc này. Vui lòng thử lại sau ít phút.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const courseOptions = courses.map((c) => `${c.scheduleTitle} ${c.scheduleSubtitle}`.trim())
  const branchOptions = branches.map((b) => b.name)

  const inputClass =
    'w-full rounded-lg border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm text-[#243B53] outline-none transition focus:border-[#75BDEB] focus:ring-2 focus:ring-[#75BDEB]/25'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-consult-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between bg-[#75BDEB] px-6 py-4 text-white">
          <div>
            <h2 id="schedule-consult-title" className="text-base font-extrabold uppercase tracking-wide sm:text-lg">
              ĐĂNG KÝ NHẬN TƯ VẤN
            </h2>
            <p className="mt-0.5 text-xs text-white/85">
              {centerInfo.name} – Lớp {schedule.classTypeLabel} ({schedule.studyMode})
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
          {submitStatus && (
            <div
              role="alert"
              className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-sm ${
                submitStatus.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {submitStatus.type === 'success' ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <span>{submitStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="consult-fullname" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="consult-fullname"
                type="text"
                value={values.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Nhập họ và tên"
                className={inputClass}
              />
              {errors.fullName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="consult-phone" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="consult-phone"
                type="tel"
                value={values.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Ví dụ: 0988123456"
                className={inputClass}
              />
              {errors.phone && <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="consult-email" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
              Email (không bắt buộc)
            </label>
            <input
              id="consult-email"
              type="email"
              value={values.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@example.com"
              className={inputClass}
            />
            {errors.email && <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="consult-course" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Khóa học quan tâm <span className="text-red-500">*</span>
              </label>
              <select
                id="consult-course"
                value={values.courseName}
                onChange={(e) => updateField('courseName', e.target.value)}
                className={`${inputClass} bg-[#EAF6FD]/60 font-semibold text-[#2878B8]`}
              >
                {!courseOptions.includes(values.courseName) && values.courseName && (
                  <option value={values.courseName}>{values.courseName}</option>
                )}
                {courseOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-white text-[#243B53]">
                    {opt}
                  </option>
                ))}
              </select>
              {errors.courseName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.courseName}</p>}
            </div>

            <div>
              <label htmlFor="consult-branch" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Cơ sở mong muốn <span className="text-red-500">*</span>
              </label>
              <select
                id="consult-branch"
                value={values.branchName}
                onChange={(e) => updateField('branchName', e.target.value)}
                className={`${inputClass} bg-[#EAF6FD]/60 font-semibold text-[#2878B8]`}
              >
                {!branchOptions.includes(values.branchName) && values.branchName && (
                  <option value={values.branchName}>{values.branchName}</option>
                )}
                {branchOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-white text-[#243B53]">
                    {opt}
                  </option>
                ))}
              </select>
              {errors.branchName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.branchName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="consult-note" className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id="consult-note"
              rows={3}
              value={values.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="Mục tiêu điểm số, thời gian rảnh có thể nhận cuộc gọi..."
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse justify-end gap-2.5 border-t border-[#DCEAF3] pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#DCEAF3] bg-white px-5 py-2.5 text-sm font-semibold text-[#64748B] transition hover:bg-[#F5FAFE]"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F26522] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#d95314] disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Gửi đăng ký
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

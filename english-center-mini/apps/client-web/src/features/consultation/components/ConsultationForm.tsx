import { useMemo, useState, type SyntheticEvent } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { consultationOptions } from '@/config/center-info'
import { useCourses } from '@/features/courses/hooks/useCourses'
import { isValidFacebookUrl, isValidVnPhone } from '@/utils/validators'
import { consultationApi } from '@/features/consultation/api/consultationApi'
import {
  SelectField,
  TextField,
  type ConsultationErrors,
  type ConsultationValues,
} from '@/features/consultation/components/ConsultationFields'

const initialValues: ConsultationValues = {
  fullName: '',
  phone: '',
  facebook: '',
  school: '',
  purpose: '',
  level: '',
  goal: '',
  route: '',
  time: '',
}

function validate(v: ConsultationValues): ConsultationErrors {
  const errors: ConsultationErrors = {}
  if (!v.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên'
  if (!v.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại'
  else if (!isValidVnPhone(v.phone)) errors.phone = 'Số điện thoại không hợp lệ'
  if (v.facebook.trim() && !isValidFacebookUrl(v.facebook))
    errors.facebook = 'Link Facebook không hợp lệ'
  if (!v.purpose.trim()) errors.purpose = 'Vui lòng cho biết mục đích'
  if (!v.level) errors.level = 'Vui lòng chọn trình độ'
  if (!v.goal) errors.goal = 'Vui lòng chọn mục tiêu'
  if (!v.route) errors.route = 'Vui lòng chọn lộ trình'
  if (!v.time) errors.time = 'Vui lòng chọn thời gian'
  return errors
}

export default function ConsultationForm() {
  const { data: courses } = useCourses()
  const [values, setValues] = useState<ConsultationValues>(initialValues)
  const [errors, setErrors] = useState<ConsultationErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const routeOptions = useMemo(() => {
    if (courses && courses.length > 0) {
      return courses.map((c) => `${c.scheduleTitle ?? c.name} ${c.scheduleSubtitle ?? ''}`.trim())
    }
    return consultationOptions.routes
  }, [courses])

  const handleChange = (name: keyof ConsultationValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const result = validate(values)
    setErrors(result)
    if (Object.keys(result).length > 0) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await consultationApi.submit({
        source: 'footer-form',
        fullName: values.fullName.trim(),
        phone: values.phone.replace(/\s/g, ''),
        facebook: values.facebook.trim() || undefined,
        school: values.school.trim() || undefined,
        purpose: values.purpose.trim(),
        currentLevel: values.level,
        targetGoal: values.goal,
        courseName: values.route,
        preferredTime: values.time,
      })
      setFeedback({ type: 'success', message: res.message })
      setValues(initialValues)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi đăng ký. Vui lòng thử lại sau.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="ec-pattern relative rounded-3xl border border-white/50 bg-[var(--ec-main)] p-6 shadow-2xl sm:p-9"
    >
      {feedback && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg bg-white p-4 text-sm text-[#243B53]"
        >
          {feedback.type === 'success' ? (
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#78B978]" />
          ) : (
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <TextField
          name="fullName"
          placeholder="Họ và tên"
          required
          value={values.fullName}
          error={errors.fullName}
          onChange={handleChange}
        />
        <TextField
          name="phone"
          placeholder="Số điện thoại"
          required
          type="tel"
          value={values.phone}
          error={errors.phone}
          onChange={handleChange}
        />
        <div className="sm:col-span-2">
          <TextField
            name="facebook"
            placeholder="Link Facebook"
            value={values.facebook}
            error={errors.facebook}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            name="school"
            placeholder="Trường học (nếu có)"
            value={values.school}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            name="purpose"
            placeholder="Bạn cần bằng TOEIC để làm gì?"
            required
            value={values.purpose}
            error={errors.purpose}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            name="level"
            placeholder="Hãy chọn trình độ hiện tại của bạn"
            required
            options={consultationOptions.levels}
            value={values.level}
            error={errors.level}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            name="goal"
            placeholder="Chọn tiếp mục tiêu bạn muốn chinh phục"
            required
            options={consultationOptions.goals}
            value={values.goal}
            error={errors.goal}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            name="route"
            placeholder="Lộ trình TOEIC mà bạn quan tâm"
            required
            options={routeOptions}
            value={values.route}
            error={errors.route}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            name="time"
            placeholder="Thời gian có thể nhận tư vấn"
            required
            options={consultationOptions.times}
            value={values.time}
            error={errors.time}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--ec-orange)] px-8 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:scale-[1.02] hover:bg-[#d95314] disabled:opacity-65 sm:text-base"
        >
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Đăng ký tư vấn
        </button>
      </div>
    </form>
  )
}

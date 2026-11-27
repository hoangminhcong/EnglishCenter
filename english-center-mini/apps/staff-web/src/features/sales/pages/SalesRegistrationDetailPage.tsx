import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil, ShieldCheck } from 'lucide-react'
import {
  REVIEWER_REGISTRATION_TRANSITIONS,
  SALE_REGISTRATION_TRANSITIONS,
  type CourseRegistrationStatus,
} from '@english-center/contracts'
import {
  Badge,
  Button,
  EmptyBlock,
  ErrorBlock,
  InputField,
  LoadingBlock,
  Modal,
} from '@english-center/ui'
import { formatDate, formatDateTimeVi, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  useSalesActor,
  useSalesLeadMutations,
  useSalesRegistrationDetail,
} from '@/features/sales/hooks/useSalesCrm'
import {
  CONSULTATION_CHANNEL_LABELS,
  REGISTRATION_STATUS_META,
} from '@/features/sales/types/sales.types'
import { StaffApiClientError } from '@/services/api/httpClient'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

export function SalesRegistrationDetailPage() {
  const { id = '' } = useParams()
  useDocumentTitle('Chi tiết Hồ sơ Đăng ký – Sales CRM')
  const { session } = useStaffAuth()
  const actor = useSalesActor()
  const navigate = useNavigate()
  const { notify } = useToast()

  const canSaleUpdate = hasPermission(session, 'sales.registrations.update')
  const canViewConsultations = hasPermission(session, 'sales.consultations.view')
  const canReview = actor.canReviewRegistrations

  const { data, isLoading, error, refetch } = useSalesRegistrationDetail(id)
  const { transitionRegistrationStatus } = useSalesLeadMutations()

  const [pendingAction, setPendingAction] = useState<CourseRegistrationStatus | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock label="Đang tải chi tiết hồ sơ đăng ký..." />

  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }

  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy hồ sơ đăng ký khóa học."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { registration, lead, statusHistory, relatedConsultations } = data
  const stMeta = REGISTRATION_STATUS_META[registration.status]

  const saleTargets = canSaleUpdate
    ? SALE_REGISTRATION_TRANSITIONS[registration.status]
    : []
  const reviewerTargets = canReview
    ? REVIEWER_REGISTRATION_TRANSITIONS[registration.status]
    : []

  const canReopenStepper =
    canSaleUpdate &&
    (registration.status === 'Draft' || registration.status === 'NeedAdditionalInfo')

  const handleCloseActionModal = () => {
    setPendingAction(null)
    setActionNote('')
    setActionError(null)
  }

  const handleExecuteTransition = () => {
    if (!pendingAction) return
    setActionError(null)
    transitionRegistrationStatus.mutate(
      {
        registrationId: registration.id,
        toStatus: pendingAction,
        note: actionNote,
      },
      {
        onSuccess: (updated) => {
          notify({
            tone: 'success',
            title: 'Đã cập nhật trạng thái hồ sơ đăng ký',
            description: `${updated.registrationCode} → ${REGISTRATION_STATUS_META[updated.status].label}`,
          })
          handleCloseActionModal()
        },
        onError: (err) => {
          setActionError(err instanceof Error ? err.message : 'Thao tác không hợp lệ.')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/sales/registrations"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Danh sách hồ sơ đăng ký</span>
        </Link>
      </div>

      <PageHeader
        title={`Hồ sơ ${registration.registrationCode}`}
        description={`Tạo lúc: ${formatDateTimeVi(registration.createdAt)} • Lớp đăng ký: ${registration.snapshot.classCode} (${registration.snapshot.branchName})`}
        badge={<Badge tone={stMeta.tone}>{stMeta.label}</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canReopenStepper && (
              <ActionGuard permission="sales.registrations.update">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/sales/registrations/new?editId=${registration.id}`)}
                >
                  <Pencil className="h-4 w-4" />
                  <span>Chỉnh sửa hồ sơ</span>
                </Button>
              </ActionGuard>
            )}

            <ActionGuard permission="sales.registrations.update">
              {saleTargets.map((target) => (
                <Button
                  key={`sale-${target}`}
                  variant={target === 'Cancelled' ? 'danger' : 'primary'}
                  onClick={() => {
                    setActionError(null)
                    setActionNote('')
                    setPendingAction(target)
                  }}
                >
                  {target === 'Submitted' ? 'Nộp hồ sơ đăng ký' : 'Hủy hồ sơ'}
                </Button>
              ))}
            </ActionGuard>

            <ActionGuard permission="sales.registrations.review">
              {reviewerTargets
                .filter((target) => !saleTargets.includes(target))
                .map((target) => (
                  <Button
                    key={`rev-${target}`}
                    variant={
                      target === 'Approved'
                        ? 'cta'
                        : target === 'Rejected' || target === 'Cancelled'
                          ? 'danger'
                          : 'secondary'
                    }
                    onClick={() => {
                      setActionError(null)
                      setActionNote('')
                      setPendingAction(target)
                    }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {target === 'Reviewing'
                        ? 'Tiếp nhận xét duyệt'
                        : target === 'Approved'
                          ? 'Duyệt hồ sơ'
                          : target === 'NeedAdditionalInfo'
                            ? 'Yêu cầu bổ sung'
                            : target === 'Rejected'
                              ? 'Từ chối hồ sơ'
                              : 'Hủy hồ sơ'}
                    </span>
                  </Button>
                ))}
            </ActionGuard>
          </div>
        }
      />

      {registration.reviewerNote && (
        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs text-[#78350F]">
          <strong>Phản hồi xét duyệt từ Giáo vụ / Admin:</strong> {registration.reviewerNote}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Cột trái: Khách hàng + Snapshot bất biến + Mục tiêu & Cam kết */}
        <div className="space-y-5 lg:col-span-7">
          {/* Thông tin khóa học & học phí đã đăng ký */}
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF4F8] pb-3">
              <h2 className="inline-flex min-w-0 items-center gap-1.5 text-base font-extrabold text-[#243B53]">
                <Lock className="h-4 w-4 shrink-0 text-[#2878B8]" />
                <span>Thông tin khóa học & học phí đã đăng ký</span>
              </h2>
              <Badge tone="info">
                Ghi nhận lúc {formatDateTimeVi(registration.snapshot.capturedAt)}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-[#F8FBFD] p-4 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[#64748B]">Khóa học:</span>{' '}
                <strong>
                  {registration.snapshot.courseName} ({registration.snapshot.courseCode})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Mục tiêu khóa:</span>{' '}
                <strong>{registration.snapshot.targetOutcomeLabel}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Cơ sở:</span>{' '}
                <strong>{registration.snapshot.branchName}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Lớp đã chọn:</span>{' '}
                <strong className="text-[#2878B8]">
                  {registration.snapshot.classCode} – {registration.snapshot.className}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Lịch học:</span>{' '}
                <strong>{registration.snapshot.classScheduleSummary}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Ngày khai giảng:</span>{' '}
                <strong>{formatDate(registration.snapshot.classStartDate)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Học phí niêm yết:</span>{' '}
                <strong>{formatVnd(registration.snapshot.listedTuitionVnd)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Chính sách áp dụng:</span>{' '}
                <strong>{registration.snapshot.policyCode ?? 'Niêm yết gốc'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Giảm ưu đãi:</span>{' '}
                <strong>-{formatVnd(registration.snapshot.discountAmountVnd)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Học phí dự kiến chốt tư vấn:</span>{' '}
                <strong className="text-base font-black text-[#1F7A4C]">
                  {formatVnd(registration.snapshot.netEstimatedTuitionVnd)}
                </strong>
              </p>
            </div>
          </div>

          {/* Thông tin khách hàng & Cam kết */}
          <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-5 text-sm shadow-2xs">
            <h2 className="text-base font-extrabold text-[#243B53]">
              Thông tin Khách hàng, Mục tiêu điểm & Cam kết tư vấn
            </h2>
            {lead && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-[#64748B]">Khách hàng:</span>{' '}
                  <Link
                    to={`/sales/leads/${lead.id}`}
                    className="font-bold text-[#2878B8] hover:underline"
                  >
                    {lead.fullName}
                  </Link>
                </p>
                <p>
                  <span className="text-[#64748B]">Số điện thoại:</span>{' '}
                  <strong>{lead.phone}</strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 border-t border-[#EEF4F8] pt-3 sm:grid-cols-2">
              <p>
                <span className="text-[#64748B]">Điểm đầu vào / Mục tiêu:</span>{' '}
                <strong>
                  {registration.scoreGoal.currentScore ?? 'Chưa thi'} {'→'}{' '}
                  {registration.scoreGoal.targetScore}+ TOEIC
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Khung thang điểm:</span>{' '}
                <code>{registration.scoreGoal.scaleVersionCode}</code>
              </p>
            </div>

            <div className="rounded-xl bg-[#F8FBFD] p-3.5 text-xs">
              <p className="font-bold text-[#243B53]">Điều kiện áp dụng đã tư vấn:</p>
              <p className="mt-1 text-[#475569]">
                {registration.commitment.attendanceAndHomeworkConditions}
              </p>
              {registration.commitment.consultationNote && (
                <p className="mt-1.5 text-[#2878B8]">
                  <strong>Ghi chú kèm theo:</strong> {registration.commitment.consultationNote}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Lịch sử trạng thái hồ sơ + Tư vấn liên quan */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <h2 className="text-base font-extrabold text-[#243B53]">
              Lịch sử xử lý & Xét duyệt hồ sơ ({statusHistory.length})
            </h2>
            <div className="mt-3 space-y-2.5">
              {statusHistory.length === 0 ? (
                <EmptyBlock title="Chưa có lịch sử xử lý hồ sơ" />
              ) : (
                statusHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 font-bold text-[#243B53]">
                        {item.fromStatus
                          ? `${REGISTRATION_STATUS_META[item.fromStatus].label} → `
                          : ''}
                        <span className="text-[#2878B8]">
                          {REGISTRATION_STATUS_META[item.toStatus].label}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {formatDateTimeVi(item.changedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[#64748B]">Thực hiện bởi: {item.changedByName}</p>
                    {item.note && (
                      <p className="mt-1 font-medium text-[#243B53]">Ghi chú: {item.note}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <h2 className="text-base font-extrabold text-[#243B53]">
              Lịch sử tư vấn liên quan ({canViewConsultations ? relatedConsultations.length : 0})
            </h2>
            <div className="mt-3 space-y-2.5">
              {!canViewConsultations ? (
                <p className="text-xs text-[#64748B]">
                  Bạn không có quyền xem lịch sử tư vấn.
                </p>
              ) : relatedConsultations.length === 0 ? (
                <p className="text-xs text-[#64748B]">Chưa có nhật ký tư vấn trước đó.</p>
              ) : (
                relatedConsultations.map((cons) => (
                  <div
                    key={cons.id}
                    className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="neutral">{CONSULTATION_CHANNEL_LABELS[cons.channel]}</Badge>
                      <span className="text-[11px] text-[#64748B]">
                        {formatDateTimeVi(cons.consultedAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[#243B53]">{cons.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận chuyển trạng thái hồ sơ */}
      <Modal
        open={Boolean(pendingAction)}
        title={
          pendingAction
            ? `Chuyển trạng thái hồ sơ sang "${REGISTRATION_STATUS_META[pendingAction].label}"`
            : 'Cập nhật trạng thái'
        }
        onClose={handleCloseActionModal}
        maxWidthClassName="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseActionModal}>
              Hủy
            </Button>
            <Button
              onClick={handleExecuteTransition}
              loading={transitionRegistrationStatus.isPending}
            >
              Xác nhận thực hiện
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-sm">
          {actionError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
              {actionError}
            </div>
          )}

          <InputField
            id="reg-trans-note"
            label={
              pendingAction === 'NeedAdditionalInfo' ||
              pendingAction === 'Rejected' ||
              pendingAction === 'Cancelled'
                ? 'Lý do / Yêu cầu cụ thể (Bắt buộc) *'
                : 'Ghi chú xử lý (Tùy chọn)'
            }
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="Nhập nội dung lưu vào lịch sử xét duyệt..."
          />
        </div>
      </Modal>
    </div>
  )
}

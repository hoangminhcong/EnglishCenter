import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  MessageSquarePlus,
  Pencil,
  PhoneOff,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import type { FollowUpStatus } from '@english-center/contracts'
import {
  Badge,
  Button,
  DataTable,
  DataTableCell,
  DataTableContainer,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from '@english-center/ui'
import { formatDateTimeVi, formatVnd, isValidFacebookUrl, toSafeHttpUrl } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  CreateOrEditLeadModal,
  LogConsultationModal,
  ScheduleFollowUpModal,
  TransitionLeadStatusModal,
} from '@/features/sales/components/LeadModals'
import {
  useSalesActor,
  useSalesLeadDetail,
  useSalesLeadMutations,
  useSalesReferenceCatalogs,
} from '@/features/sales/hooks/useSalesCrm'
import {
  CONSULTATION_CHANNEL_LABELS,
  FOLLOW_UP_STATUS_META,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_META,
  REGISTRATION_STATUS_META,
  isFollowUpOverdue,
} from '@/features/sales/types/sales.types'
import { StaffApiClientError } from '@/services/api/httpClient'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'

export function SalesLeadDetailPage() {
  const { leadId = '' } = useParams()
  useDocumentTitle('Chi tiết Khách hàng – Sales CRM')
  const { session } = useStaffAuth()
  const actor = useSalesActor()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { nowIso, todayYmdVn } = useCurrentTime()

  const canViewConsultations = hasPermission(session, 'sales.consultations.view')
  const canViewFollowUps = hasPermission(session, 'sales.followups.view')
  const canViewRegistrations = hasPermission(session, 'sales.registrations.view')

  const [activeTab, setActiveTab] = useState<
    'info' | 'consultations' | 'followups' | 'registrations'
  >('info')
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [consultOpen, setConsultOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)

  const { data, isLoading, error, refetch } = useSalesLeadDetail(leadId)
  const { courses, branches, classes, saleEmployees } = useSalesReferenceCatalogs()
  const { updateFollowUpStatus } = useSalesLeadMutations()

  if (isLoading) return <LoadingBlock label="Đang tải hồ sơ khách hàng tiềm năng..." />

  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }

  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy hồ sơ khách hàng tiềm năng này."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { lead, consultations, followUps, statusHistory, registrations } = data
  const courseMap = new Map(courses.map((c) => [c.id, c.name]))
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const classMap = new Map(classes.map((cls) => [cls.id, `${cls.classCode} – ${cls.className}`]))
  const stMeta = LEAD_STATUS_META[lead.status]
  const candidateFbUrl = toSafeHttpUrl(lead.facebookUrl)
  const safeFacebookUrl =
    candidateFbUrl && !candidateFbUrl.startsWith('/') && isValidFacebookUrl(candidateFbUrl)
      ? candidateFbUrl
      : null

  const handleFollowUpTransition = (
    followUpId: string,
    nextStatus: Exclude<FollowUpStatus, 'Scheduled'>,
  ) => {
    updateFollowUpStatus.mutate(
      { followUpId, status: nextStatus },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: `Đã cập nhật lịch liên hệ: ${FOLLOW_UP_STATUS_META[nextStatus].label}`,
            description: lead.fullName,
          })
        },
        onError: (err) => {
          notify({
            tone: 'error',
            title: 'Không thể cập nhật lịch liên hệ lại',
            description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
          })
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/sales/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay về Sales Dashboard</span>
        </Link>
      </div>

      <PageHeader
        title={`${lead.fullName} (${lead.phone})`}
        description={`Nguồn: ${LEAD_SOURCE_LABELS[lead.source]} • Tiếp nhận: ${formatDateTimeVi(lead.createdAt)}`}
        badge={<Badge tone={stMeta.tone}>{stMeta.label}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionGuard permission="sales.leads.update">
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span>Sửa thông tin</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="sales.consultations.create">
              <Button variant="secondary" onClick={() => setConsultOpen(true)}>
                <MessageSquarePlus className="h-4 w-4" />
                <span>Ghi tư vấn</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="sales.followups.create">
              <Button variant="secondary" onClick={() => setFollowUpOpen(true)}>
                <CalendarClock className="h-4 w-4" />
                <span>Hẹn gọi lại</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="sales.leads.update">
              <Button variant="secondary" onClick={() => setStatusOpen(true)}>
                <RefreshCw className="h-4 w-4" />
                <span>Đổi trạng thái</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="sales.registrations.create">
              <Button
                variant="cta"
                onClick={() => navigate(`/sales/registrations/new?leadId=${lead.id}`)}
              >
                <FilePlus2 className="h-4 w-4" />
                <span>Đăng ký khóa học</span>
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* 4 Tabs chuẩn đặc tả */}
      <div className="inline-flex flex-wrap rounded-2xl border border-[#DCEAF3] bg-white p-1.5 text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'info' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          1. Thông tin & Lịch sử trạng thái ({statusHistory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('consultations')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'consultations' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          2. Lịch sử tư vấn ({canViewConsultations ? consultations.length : 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'followups' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          3. Lịch liên hệ lại ({canViewFollowUps ? followUps.length : 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('registrations')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'registrations' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          4. Lịch sử đăng ký ({canViewRegistrations ? registrations.length : 0})
        </button>
      </div>

      {/* TAB 1: THÔNG TIN & LỊCH SỬ TRẠNG THÁI */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
            <h2 className="text-base font-extrabold text-[#243B53]">Hồ sơ nhu cầu học tập</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[#64748B]">Họ và tên:</span>{' '}
                <strong>{lead.fullName}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Số điện thoại:</span>{' '}
                <strong>{lead.phone}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Email:</span>{' '}
                <strong>{lead.email || '[Chưa cung cấp]'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Facebook:</span>{' '}
                {safeFacebookUrl ? (
                  <a
                    href={safeFacebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all font-bold text-[#2878B8] hover:underline"
                  >
                    <span>{safeFacebookUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <strong>{lead.facebookUrl || '[Chưa cung cấp]'}</strong>
                )}
              </p>
              <p>
                <span className="text-[#64748B]">Trường / Đơn vị:</span>{' '}
                <strong>{lead.schoolOrWork || '[Chưa cập nhật]'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Khung giờ liên hệ:</span>{' '}
                <strong>{lead.preferredContactTime || 'Linh hoạt'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Trình độ hiện tại:</span>{' '}
                <strong>{lead.currentLevelNote || '[Chưa đánh giá]'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Mục tiêu kỳ vọng:</span>{' '}
                <strong>{lead.targetGoalNote || '[Chưa cập nhật]'}</strong>
              </p>
              <p className="sm:col-span-2">
                <span className="text-[#64748B]">Cơ sở mong muốn:</span>{' '}
                <strong>
                  {lead.preferredBranchId
                    ? (branchMap.get(lead.preferredBranchId) ?? lead.preferredBranchId)
                    : 'Chưa cố định cơ sở'}
                </strong>
              </p>
            </div>

            <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3.5 text-sm">
              <p className="text-xs font-extrabold uppercase text-[#2878B8]">
                Khóa học & Lớp đang quan tâm
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lead.interestedCourseIds.length === 0 ? (
                  <span className="text-xs text-[#64748B]">Chưa gắn khóa học quan tâm</span>
                ) : (
                  lead.interestedCourseIds.map((cid) => (
                    <Badge key={cid} tone="info">
                      {courseMap.get(cid) ?? cid}
                    </Badge>
                  ))
                )}
              </div>
              {lead.interestedClassId && (
                <p className="mt-2 text-xs text-[#243B53]">
                  Lớp dự kiến:{' '}
                  <strong>{classMap.get(lead.interestedClassId) ?? lead.interestedClassId}</strong>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#EEF4F8] bg-white p-3.5 text-sm">
              <p className="text-xs font-extrabold uppercase text-[#64748B]">Nhu cầu chi tiết</p>
              <p className="mt-1 text-[#243B53]">{lead.learningNeed}</p>
            </div>

            <div className="rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3.5 text-xs text-[#243B53]">
              <strong>Ghi nhận đồng ý liên hệ:</strong> {lead.consentSummary}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
            <h2 className="text-base font-extrabold text-[#243B53]">
              Nhật ký chuyển trạng thái Lead
            </h2>
            {statusHistory.length === 0 ? (
              <EmptyBlock title="Chưa có lịch sử chuyển trạng thái." />
            ) : (
              statusHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 font-bold text-[#243B53]">
                      {item.fromStatus ? `${LEAD_STATUS_META[item.fromStatus].label} → ` : ''}
                      <span className="text-[#2878B8]">
                        {LEAD_STATUS_META[item.toStatus].label}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {formatDateTimeVi(item.changedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#64748B]">Thực hiện bởi: {item.changedByName}</p>
                  {item.reason && (
                    <p className="mt-1 font-medium text-[#243B53]">Ghi chú: {item.reason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ TƯ VẤN */}
      {activeTab === 'consultations' && (
        <div className="space-y-3">
          {!canViewConsultations ? (
            <EmptyBlock title="Bạn không có quyền xem lịch sử tư vấn." />
          ) : consultations.length === 0 ? (
            <EmptyBlock
              title="Chưa có bản ghi tư vấn nào"
              description="Nhấn 'Ghi tư vấn' để lưu lại nội dung trao đổi đầu tiên với khách hàng."
            />
          ) : (
            consultations.map((cons, idx) => (
              <div
                key={cons.id}
                className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF4F8] pb-2.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone="info">
                      Lần tư vấn #{consultations.length - idx} –{' '}
                      {CONSULTATION_CHANNEL_LABELS[cons.channel]}
                    </Badge>
                    {cons.advisedCourseId && (
                      <Badge tone="neutral">
                        {courseMap.get(cons.advisedCourseId) ?? cons.advisedCourseId}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {formatDateTimeVi(cons.consultedAt)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 text-sm md:grid-cols-2">
                  <p>
                    <span className="text-[#64748B]">Nhu cầu ghi nhận:</span>{' '}
                    <strong>{cons.identifiedNeed}</strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Kết quả:</span>{' '}
                    <strong className="text-[#1F7A4C]">{cons.outcome}</strong>
                  </p>
                </div>
                <p className="mt-2 text-sm text-[#243B53]">
                  <span className="text-[#64748B]">Nội dung trao đổi:</span> {cons.summary}
                </p>
                {cons.note && (
                  <p className="mt-1.5 text-xs text-[#64748B]">Ghi chú thêm: {cons.note}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: LỊCH LIÊN HỆ LẠI */}
      {activeTab === 'followups' && (
        <div className="space-y-3">
          {!canViewFollowUps ? (
            <EmptyBlock title="Bạn không có quyền xem lịch liên hệ lại." />
          ) : followUps.length === 0 ? (
            <EmptyBlock title="Chưa có lịch hẹn gọi lại cho khách hàng này" />
          ) : (
            followUps.map((fup) => {
              const overdue = isFollowUpOverdue(fup, nowIso)
              return (
                <div
                  key={fup.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#243B53]">
                        Hẹn lúc: {formatDateTimeVi(fup.dueAt)}
                      </span>
                      {overdue ? (
                        <Badge tone="danger">Quá hạn</Badge>
                      ) : (
                        <Badge tone={FOLLOW_UP_STATUS_META[fup.status].tone}>
                          {FOLLOW_UP_STATUS_META[fup.status].label}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#475569]">{fup.note}</p>
                  </div>

                  {fup.status === 'Scheduled' && (
                    <ActionGuard permission="sales.followups.update">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          loading={updateFollowUpStatus.isPending}
                          onClick={() => handleFollowUpTransition(fup.id, 'Completed')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hoàn thành</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={updateFollowUpStatus.isPending}
                          onClick={() => handleFollowUpTransition(fup.id, 'Missed')}
                        >
                          <PhoneOff className="h-3.5 w-3.5" />
                          <span>Không bắt máy</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={updateFollowUpStatus.isPending}
                          onClick={() => handleFollowUpTransition(fup.id, 'Cancelled')}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Hủy lịch</span>
                        </Button>
                      </div>
                    </ActionGuard>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB 4: LỊCH SỬ ĐĂNG KÝ KHÓA HỌC */}
      {activeTab === 'registrations' &&
        (!canViewRegistrations ? (
          <EmptyBlock title="Bạn không có quyền xem lịch sử đăng ký." />
        ) : registrations.length === 0 ? (
          <EmptyBlock
            title="Khách hàng chưa có hồ sơ đăng ký khóa học"
            description="Nhấn nút 'Đăng ký khóa học' ở góc phải để tạo hồ sơ gắn vào lớp cụ thể."
          />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">Mã hồ sơ</DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học & Lớp</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mục tiêu điểm
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Học phí dự kiến
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái xử lý
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {registrations.map((reg) => (
                  <DataTableRow key={reg.id}>
                    <DataTableCell className="whitespace-nowrap">
                      <Link
                        to={`/sales/registrations/${reg.id}`}
                        className="font-bold text-[#2878B8] hover:underline"
                      >
                        {reg.registrationCode}
                      </Link>
                      <p className="text-xs text-[#64748B]">
                        {formatDateTimeVi(reg.createdAt)}
                      </p>
                    </DataTableCell>
                    <DataTableCell>
                      <p className="font-bold text-[#243B53]">{reg.snapshot.courseName}</p>
                      <p className="text-xs text-[#64748B]">
                        Lớp <strong>{reg.snapshot.classCode}</strong> • {reg.snapshot.branchName}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-xs font-bold">
                      {reg.scoreGoal.currentScore ? `${reg.scoreGoal.currentScore} → ` : ''}
                      {reg.scoreGoal.targetScore}+ TOEIC
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right font-bold text-[#1F7A4C]">
                      {formatVnd(reg.snapshot.netEstimatedTuitionVnd)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={REGISTRATION_STATUS_META[reg.status].tone}>
                        {REGISTRATION_STATUS_META[reg.status].label}
                      </Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {editOpen && (
        <CreateOrEditLeadModal
          open={editOpen}
          actor={actor}
          initialLead={lead}
          courses={courses}
          branches={branches}
          saleEmployees={saleEmployees}
          onClose={() => setEditOpen(false)}
        />
      )}

      {statusOpen && (
        <TransitionLeadStatusModal
          open={statusOpen}
          lead={lead}
          canAdminReopenLead={actor.canAdminReopenLead}
          onClose={() => setStatusOpen(false)}
        />
      )}

      {consultOpen && (
        <LogConsultationModal
          open={consultOpen}
          lead={lead}
          courses={courses}
          classes={classes}
          onClose={() => setConsultOpen(false)}
        />
      )}

      {followUpOpen && (
        <ScheduleFollowUpModal
          open={followUpOpen}
          lead={lead}
          defaultDateYmd={todayYmdVn}
          onClose={() => setFollowUpOpen(false)}
        />
      )}
    </div>
  )
}

import { useMemo, useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Copy, Eye, MessageSquarePlus } from 'lucide-react'
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
  InputField,
  LoadingBlock,
  Modal,
  SelectField,
   type BadgeTone } from '@english-center/ui'
import { formatDate, formatDateTimeVi, formatVnd, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'
import type {
  PendingSalesRegistrationItem,
  PlacementQueueCandidate,
  SalesRegistrationReviewDecision,
} from '@/features/academic/types/academic.types'

const PENDING_REG_STATUS_META: Record<
  PendingSalesRegistrationItem['status'],
  { label: string; tone: BadgeTone }
> = {
  Submitted: { label: 'Mới gửi duyệt', tone: 'warning' },
  Reviewing: { label: 'Đang rà soát', tone: 'info' },
  NeedAdditionalInfo: { label: 'Chờ Sale bổ sung', tone: 'danger' },
}

export function AcademicPlacementPage() {
  useDocumentTitle('Xếp lớp theo tháng & Duyệt hồ sơ Sale')
  const { user } = useStaffAuth()
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const canReviewSalesReg = hasPermission(user, 'sales.registrations.review')

  const activeTab: 'queue' | 'review' =
    searchParams.get('tab') === 'review' ? 'review' : 'queue'

  const handleSwitchTab = (nextTab: 'queue' | 'review') => {
    if (nextTab === 'review') {
      setSearchParams({ tab: 'review' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')

  const [contactModalItem, setContactModalItem] = useState<PlacementQueueCandidate | null>(null)
  const [contactSummary, setContactSummary] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')
  const [contactNote, setContactNote] = useState('')

  const [placeModalItem, setPlaceModalItem] = useState<PlacementQueueCandidate | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [placeNote, setPlaceNote] = useState('')

  const [inspectReg, setInspectReg] = useState<PendingSalesRegistrationItem | null>(null)
  const [reviewerNoteInput, setReviewerNoteInput] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.placement(todayYmdVn),
    queryFn: () => academicApi.getPlacementWorkspace(todayYmdVn),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const filteredCandidates = useMemo(() => {
    const list = data?.candidates ?? []
    return list.filter((c) => {
      if (monthFilter && c.expectedMonth !== monthFilter) return false
      if (courseFilter !== 'ALL' && c.courseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && c.branchId !== branchFilter) return false
      if (search.trim()) {
        return (
          matchText(c.fullName, search) ||
          matchText(c.phone, search) ||
          matchText(c.registrationCode ?? '', search) ||
          matchText(c.studentCode ?? '', search) ||
          matchText(c.saleOwnerName ?? '', search)
        )
      }
      return true
    })
  }, [data, monthFilter, courseFilter, branchFilter, search])

  const filteredPendingRegistrations = useMemo(() => {
    const list = data?.pendingRegistrations ?? []
    return list.filter((r) => {
      if (courseFilter !== 'ALL' && r.courseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && r.branchId !== branchFilter) return false
      if (search.trim()) {
        return (
          matchText(r.registrationCode, search) ||
          matchText(r.leadFullName, search) ||
          matchText(r.leadPhone, search) ||
          matchText(r.saleOwnerName, search) ||
          matchText(r.classCode, search)
        )
      }
      return true
    })
  }, [data, courseFilter, branchFilter, search])

  const compatibleClassesForModal = useMemo(() => {
    if (!placeModalItem || !data) return []
    return data.openClasses.filter((cls) => cls.courseId === placeModalItem.courseId)
  }, [placeModalItem, data])

  const logContactMutation = useMutation({
    mutationFn: () => {
      if (!contactModalItem) throw new Error('Chưa chọn học viên.')
      return academicApi.logPlacementContact(actor, {
        targetKey: contactModalItem.candidateKey,
        studentOrLeadName: contactModalItem.fullName,
        phone: contactModalItem.phone,
        resultSummary: contactSummary,
        nextFollowUpDate: nextFollowUpDate || undefined,
        note: contactNote,
      })
    },
    onSuccess: () => {
      setContactModalItem(null)
      setContactSummary('')
      setNextFollowUpDate('')
      setContactNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: 'Đã lưu lịch sử liên hệ xếp lớp',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu ghi chú liên hệ',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const confirmPlacementMutation = useMutation({
    mutationFn: () => {
      if (!placeModalItem) throw new Error('Chưa chọn học viên.')
      const clsId = selectedClassId || compatibleClassesForModal[0]?.id || ''
      return academicApi.confirmMonthlyPlacement(actor, {
        candidateKey: placeModalItem.candidateKey,
        targetClassId: clsId,
        note: placeNote,
      })
    },
    onSuccess: (res) => {
      setPlaceModalItem(null)
      setPlaceNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'accounting'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã xếp lớp chính thức vào ${res.classCode}`,
        description: `Mã học viên: ${res.studentCode} – Bản ghi: ${res.enrollmentCode}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể xếp lớp',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const reviewRegistrationMutation = useMutation({
    mutationFn: (decision: SalesRegistrationReviewDecision) => {
      if (!inspectReg) throw new Error('Chưa chọn hồ sơ đăng ký.')
      return academicApi.reviewSalesRegistration(actor, {
        registrationId: inspectReg.id,
        nextStatus: decision,
        reviewerNote: reviewerNoteInput,
      })
    },
    onSuccess: (_res, decision) => {
      const code = inspectReg?.registrationCode ?? ''
      setInspectReg(null)
      setReviewerNoteInput('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sales'] })
      if (decision === 'Approved') {
        handleSwitchTab('queue')
        notify({
          tone: 'success',
          title: `Đã phê duyệt hồ sơ ${code} chuyển sang Hàng đợi Xếp lớp`,
          description: 'Giáo vụ có thể liên hệ xác nhận ca học và bấm Xếp lớp chính thức ngay.',
        })
      } else {
        const decisionLabel =
          decision === 'Reviewing'
            ? 'Đang rà soát'
            : decision === 'NeedAdditionalInfo'
              ? 'Chờ bổ sung thông tin'
              : 'Từ chối'
        notify({
          tone: 'success',
          title: `Đã cập nhật xét duyệt hồ sơ ${code}`,
          description: `Trạng thái mới: ${decisionLabel}.`,
        })
      }
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật xét duyệt hồ sơ',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      notify({
        tone: 'info',
        title: `Đã sao chép SĐT ${phone}`,
        description: 'Giáo vụ liên hệ qua điện thoại công vụ và ghi chú kết quả cuộc gọi tại đây.',
      })
    } catch {
      notify({
        tone: 'warning',
        title: `Số điện thoại: ${phone}`,
      })
    }
  }

  const openPlaceModal = (item: PlacementQueueCandidate) => {
    setPlaceModalItem(item)
    const matchingOpen = (data?.openClasses ?? []).filter((c) => c.courseId === item.courseId)
    const preferred = matchingOpen.find((c) => c.id === item.preferredClassId)
    setSelectedClassId(preferred?.id ?? matchingOpen[0]?.id ?? '')
    setPlaceNote('')
  }

  const handleContactSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    logContactMutation.mutate()
  }

  const handlePlaceSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    confirmPlacementMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách xếp lớp & xét duyệt hồ sơ..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải không gian điều phối xếp lớp."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xếp lớp theo tháng & Duyệt hồ sơ đăng ký từ Sale"
        description="Xét duyệt hồ sơ đăng ký khóa học từ bộ phận Tư vấn và xếp lớp theo đợt khai giảng."
        badge={
          <div className="flex items-center gap-2">
            <Badge tone="warning">{data.candidates.length} chờ xếp lớp</Badge>
            <Badge tone="info">{data.pendingRegistrations.length} hồ sơ Sale chờ duyệt</Badge>
          </div>
        }
      />

      {/* Thanh chuyển 2 Tab + Bộ lọc */}
      <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleSwitchTab('queue')}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === 'queue'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            Hàng đợi Xếp lớp theo tháng ({data.candidates.length})
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('review')}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === 'review'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            Duyệt hồ sơ đăng ký từ Sale ({data.pendingRegistrations.length})
          </button>
        </div>

        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            activeTab === 'queue' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          }`}
        >
          <InputField
            id="plc-search"
            placeholder="Tìm họ tên, SĐT, mã hồ sơ REG, mã HV, tên Sale..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {activeTab === 'queue' && (
            <InputField
              id="plc-month"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          )}
          <SelectField
            id="plc-course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Mọi khóa học' },
              ...courses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <SelectField
            id="plc-branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Mọi cơ sở' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </div>

      {activeTab === 'queue' ? (
        <>
          {filteredCandidates.length === 0 ? (
            <EmptyBlock
              title="Không có học viên nào đang chờ xếp lớp theo bộ lọc"
              description="Khi Giáo vụ duyệt thêm hồ sơ đăng ký từ Sale ở Tab 2, hồ sơ sẽ tự động hiển thị tại đây."
            />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="min-w-[170px]">Học viên</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">Liên hệ</DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[180px]">
                      Khóa & Cơ sở / Lớp nguyện vọng
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Đầu vào → Mục tiêu
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Ngày ĐK & Thời gian chờ
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[160px]">
                      Sale phụ trách & Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Ghi chú</DataTableHeaderCell>
                    <DataTableHeaderCell>Lịch sử liên hệ</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Xếp lớp
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {filteredCandidates.map((item) => (
                    <DataTableRow key={item.candidateKey}>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <p className="font-extrabold whitespace-nowrap text-[#243B53]">
                            {item.fullName}
                          </p>
                          <Badge
                            tone={
                              item.sourceType === 'approved_sales_registration' ? 'info' : 'neutral'
                            }
                          >
                            {item.sourceType === 'approved_sales_registration'
                              ? `${item.registrationCode}`
                              : `${item.studentCode}`}
                          </Badge>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#243B53]">{item.phone}</strong>
                          <button
                            type="button"
                            onClick={() => {
                              void handleCopyPhone(item.phone)
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[#DCEAF3] bg-[#F8FBFD] px-1.5 py-0.5 text-[11px] font-semibold text-[#2878B8] hover:bg-[#EAF6FD]"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        {item.email && <p className="mt-0.5 text-[#64748B]">{item.email}</p>}
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">{item.courseName}</p>
                        <p className="text-[#64748B]">{item.branchName}</p>
                        {item.preferredClassCode && (
                          <p className="font-semibold whitespace-nowrap text-[#2878B8]">
                            Nguyện vọng: {item.preferredClassCode}
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <span className="font-bold text-[#243B53]">{item.entryScoreTotal}</span> →{' '}
                        <span className="font-extrabold text-[#1F7A4C]">
                          {item.targetScoreTotal}
                        </span>{' '}
                        TOEIC
                        {item.commitmentLabel && (
                          <p className="mt-0.5 text-[11px] text-[#64748B]">{item.commitmentLabel}</p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">
                          ĐK: {formatDate(item.waitingSinceIso)}
                        </p>
                        <p className="font-bold text-[#D97706]">Chờ {item.waitingDays} ngày</p>
                        <p className="text-[11px] text-[#64748B]">Tháng {item.expectedMonth}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <div className="flex flex-col items-start gap-1.5">
                          <p className="font-semibold whitespace-nowrap text-[#243B53]">
                            {item.saleOwnerName ?? 'Nội bộ Giáo vụ'}
                          </p>
                          <Badge
                            tone={
                              item.sourceType === 'approved_sales_registration' ? 'success' : 'info'
                            }
                          >
                            {item.statusLabel}
                          </Badge>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="max-w-[180px] text-xs text-[#475569]">
                        {item.notes ?? <span className="text-[#94A3B8]">—</span>}
                      </DataTableCell>
                      <DataTableCell className="max-w-[220px] text-xs">
                        {item.latestContactLog ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-[#243B53]">
                              {item.latestContactLog.resultSummary}
                            </p>
                            {item.latestContactLog.note && (
                              <p className="text-[11px] text-[#2878B8]">
                                Ghi chú: {item.latestContactLog.note}
                              </p>
                            )}
                            <p className="text-[11px] text-[#64748B]">
                              {formatDateTimeVi(item.latestContactLog.contactedAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="whitespace-nowrap text-[#D97706]">
                            Chưa gọi xác nhận lịch
                          </span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <ActionGuard permission="class-placement.assign">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setContactModalItem(item)
                                setContactSummary('')
                                setNextFollowUpDate('')
                                setContactNote('')
                              }}
                            >
                              <MessageSquarePlus className="h-3.5 w-3.5" />
                              <span>Ghi chú gọi</span>
                            </Button>
                            <Button size="sm" onClick={() => openPlaceModal(item)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Xếp lớp</span>
                            </Button>
                          </div>
                        </ActionGuard>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}

          {/* Nhật ký liên hệ xếp lớp */}
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
              Nhật ký liên hệ xác nhận xếp lớp ({data.contactLogs.length})
            </h2>
            {data.contactLogs.length === 0 ? (
              <EmptyBlock title="Chưa có nhật ký liên hệ xếp lớp." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.contactLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#243B53]">
                        {log.studentOrLeadName} ({log.phone})
                      </strong>
                      <span className="text-[#64748B]">{formatDateTimeVi(log.contactedAt)}</span>
                    </div>
                    <p className="mt-1 text-[#475569]">{log.resultSummary}</p>
                    {log.note && (
                      <p className="mt-0.5 font-medium text-[#2878B8]">Ghi chú: {log.note}</p>
                    )}
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      Người liên hệ: {log.contactedByName}
                      {log.nextFollowUpDate ? ` • Hẹn gọi lại: ${formatDate(log.nextFollowUpDate)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : !canReviewSalesReg ? (
        <EmptyBlock
          title="Bạn không có quyền xét duyệt hồ sơ đăng ký"
          description="Chỉ Giáo vụ đào tạo hoặc Quản trị viên mới được phép phê duyệt hồ sơ đăng ký khóa học."
        />
      ) : (
        <ActionGuard permission="sales.registrations.review">
          {filteredPendingRegistrations.length === 0 ? (
            <EmptyBlock
              title="Không còn hồ sơ đăng ký nào từ Sale đang chờ Giáo vụ xét duyệt"
              description="Các hồ sơ đã duyệt được tự động chuyển sang Tab 1 – Hàng đợi Xếp lớp theo tháng."
            />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã hồ sơ & Ngày gửi
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Học viên (Lead) & Liên hệ
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[190px]">
                      Khóa học / Cơ sở / Lớp nguyện vọng
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Đầu vào → Cam kết
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Học phí tạm tính
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[160px]">
                      Sale phụ trách & Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Thẩm định
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {filteredPendingRegistrations.map((reg) => {
                    const st = PENDING_REG_STATUS_META[reg.status]
                    return (
                      <DataTableRow key={reg.id}>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-extrabold text-[#2878B8]">{reg.registrationCode}</p>
                          <p className="text-xs text-[#64748B]">
                            {formatDateTimeVi(reg.submittedAt)}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-xs whitespace-nowrap">
                          <p className="font-bold text-[#243B53]">{reg.leadFullName}</p>
                          <p className="text-[#475569]">{reg.leadPhone}</p>
                          {reg.leadEmail && <p className="text-[#64748B]">{reg.leadEmail}</p>}
                        </DataTableCell>
                        <DataTableCell className="text-xs">
                          <p className="font-semibold text-[#243B53]">{reg.courseName}</p>
                          <p className="text-[#64748B]">{reg.branchName}</p>
                          <p className="font-semibold whitespace-nowrap text-[#2878B8]">
                            Lớp ĐK: {reg.classCode} (KG: {formatDate(reg.classStartDate)})
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-xs whitespace-nowrap">
                          <span className="font-bold text-[#243B53]">{reg.entryScoreTotal}</span> →{' '}
                          <span className="font-extrabold text-[#1F7A4C]">
                            {reg.targetScoreTotal}
                          </span>{' '}
                          TOEIC
                          <p className="mt-0.5 text-[11px] text-[#64748B]">
                            {reg.advisedOutcomeLabel}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-right text-xs whitespace-nowrap">
                          <p className="font-extrabold text-[#243B53]">
                            {formatVnd(reg.netEstimatedTuitionVnd)}
                          </p>
                          {reg.discountAmountVnd > 0 && (
                            <p className="text-[11px] text-[#1F7A4C]">
                              Giảm {formatVnd(reg.discountAmountVnd)}
                            </p>
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-xs">
                          <div className="flex flex-col items-start gap-1.5">
                            <p className="font-semibold whitespace-nowrap text-[#243B53]">
                              {reg.saleOwnerName}
                            </p>
                            <Badge tone={st.tone}>{st.label}</Badge>
                            {reg.reviewerNote && (
                              <p className="max-w-[180px] text-[11px] text-[#B45309]">
                                Ghi chú: {reg.reviewerNote}
                              </p>
                            )}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => {
                                setInspectReg(reg)
                                setReviewerNoteInput(reg.reviewerNote ?? '')
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Xem & Duyệt</span>
                            </Button>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </ActionGuard>
      )}

      {/* Modal Ghi chú liên hệ */}
      <Modal
        open={Boolean(contactModalItem)}
        title={`Ghi chú liên hệ – ${contactModalItem?.fullName ?? ''}`}
        onClose={() => setContactModalItem(null)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <InputField
            id="pcl-result"
            label="Kết quả trao đổi với học viên *"
            placeholder="VD: Đã xác nhận tham gia ca tối 2-4-6 từ ngày khai giảng"
            value={contactSummary}
            onChange={(e) => setContactSummary(e.target.value)}
            required
          />
          <InputField
            id="pcl-next"
            type="date"
            label="Ngày hẹn liên hệ lại (nếu chưa chốt được ca học)"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
          />
          <InputField
            id="pcl-note"
            label="Ghi chú bổ sung"
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContactModalItem(null)}
            >
              Đóng
            </Button>
            <Button type="submit" loading={logContactMutation.isPending}>
              Lưu lịch sử liên hệ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác nhận xếp lớp */}
      <Modal
        open={Boolean(placeModalItem)}
        title={`Xác nhận xếp lớp chính thức – ${placeModalItem?.fullName ?? ''}`}
        onClose={() => setPlaceModalItem(null)}
        maxWidthClassName="max-w-lg"
      >
        {placeModalItem &&
          (compatibleClassesForModal.length === 0 ? (
            <EmptyBlock
              title={`Chưa có lớp mở còn chỗ cho khóa ${placeModalItem.courseName}`}
              description="Hãy sang mục Quản lý lớp học để mở lớp mới trước khi xếp học viên."
            />
          ) : (
            <form onSubmit={handlePlaceSubmit} className="space-y-4">
              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
                <p>
                  <span className="text-[#64748B]">Khóa học đăng ký:</span>{' '}
                  <strong>{placeModalItem.courseName}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Cơ sở ưu tiên:</span>{' '}
                  <strong>{placeModalItem.branchName}</strong>
                </p>
                {placeModalItem.agreedTuitionVnd > 0 && (
                  <p>
                    <span className="text-[#64748B]">Mức học phí đã đăng ký:</span>{' '}
                    <strong>{formatVnd(placeModalItem.agreedTuitionVnd)}</strong>
                  </p>
                )}
              </div>

              <SelectField
                id="plc-cls-select"
                label="Chọn lớp tương thích còn chỗ trống *"
                value={selectedClassId || compatibleClassesForModal[0]?.id || ''}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={compatibleClassesForModal.map((cls) => ({
                  value: cls.id,
                  label: `${cls.classCode} – ${cls.branchName} (${cls.studyDays}, KG ${cls.startDate}, còn ${cls.remainingSeats ?? '?'} chỗ)`,
                }))}
              />

              <InputField
                id="plc-confirm-note"
                label="Ghi chú xếp lớp"
                placeholder="VD: Đã gửi thông báo lịch học buổi đầu tiên cho học viên"
                value={placeNote}
                onChange={(e) => setPlaceNote(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPlaceModalItem(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" loading={confirmPlacementMutation.isPending}>
                  Xác nhận xếp lớp
                </Button>
              </div>
            </form>
          ))}
      </Modal>

      {/* Modal Thẩm định Snapshot Hồ sơ đăng ký từ Sale */}
      <Modal
        open={Boolean(inspectReg)}
        title={`Thẩm định Hồ sơ đăng ký Sale – ${inspectReg?.registrationCode ?? ''}`}
        onClose={() => setInspectReg(null)}
        maxWidthClassName="max-w-2xl"
      >
        {inspectReg && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-extrabold uppercase text-[#2878B8]">
                  1. Thông tin Học viên & Sale phụ trách
                </p>
                <p>
                  <span className="text-[#64748B]">Họ và tên:</span>{' '}
                  <strong className="text-[#243B53]">{inspectReg.leadFullName}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Điện thoại:</span>{' '}
                  <strong>{inspectReg.leadPhone}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Email:</span>{' '}
                  <strong>{inspectReg.leadEmail ?? 'Chưa cung cấp'}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Sale lập hồ sơ:</span>{' '}
                  <strong>{inspectReg.saleOwnerName}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-extrabold uppercase text-[#2878B8]">
                  2. Khóa học & Lớp nguyện vọng
                </p>
                <p>
                  <span className="text-[#64748B]">Khóa học:</span>{' '}
                  <strong className="text-[#243B53]">{inspectReg.courseName}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Cơ sở:</span>{' '}
                  <strong>{inspectReg.branchName}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Lớp đăng ký:</span>{' '}
                  <strong>
                    {inspectReg.classCode} (KG: {formatDate(inspectReg.classStartDate)})
                  </strong>
                </p>
                {inspectReg.classScheduleSummary && (
                  <p>
                    <span className="text-[#64748B]">Lịch học:</span>{' '}
                    <strong>{inspectReg.classScheduleSummary}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCEAF3] bg-white p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-extrabold uppercase text-[#1F7A4C]">
                  3. Đầu vào & Điều kiện cam kết
                </p>
                <p>
                  <span className="text-[#64748B]">Mốc điểm:</span>{' '}
                  <strong>
                    {inspectReg.entryScoreTotal} → {inspectReg.targetScoreTotal} TOEIC
                  </strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Đầu ra cam kết:</span>{' '}
                  <strong>{inspectReg.advisedOutcomeLabel}</strong>
                </p>
                <p className="text-[#475569]">
                  <span className="text-[#64748B]">Điều kiện:</span>{' '}
                  {inspectReg.commitmentConditionsText}
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-extrabold uppercase text-[#2878B8]">
                  4. Học phí & Ưu đãi tạm tính
                </p>
                <p>
                  <span className="text-[#64748B]">Học phí niêm yết:</span>{' '}
                  <strong>{formatVnd(inspectReg.listedTuitionVnd)}</strong>{' '}
                  {inspectReg.tuitionPolicyCode ? `(${inspectReg.tuitionPolicyCode})` : ''}
                </p>
                <p>
                  <span className="text-[#64748B]">Giảm trừ ưu đãi:</span>{' '}
                  <strong className="text-[#1F7A4C]">
                    -{formatVnd(inspectReg.discountAmountVnd)}
                  </strong>{' '}
                  {inspectReg.discountReason ? `(${inspectReg.discountReason})` : ''}
                </p>
                <p>
                  <span className="text-[#64748B]">Thực đóng dự kiến:</span>{' '}
                  <strong className="text-sm text-[#243B53]">
                    {formatVnd(inspectReg.netEstimatedTuitionVnd)}
                  </strong>
                </p>
              </div>
            </div>

            {inspectReg.consultationNote && (
              <div className="rounded-xl bg-[#FFFBEB] p-3 text-[#78350F]">
                <strong>Ghi chú nhu cầu học tập từ Sale:</strong> {inspectReg.consultationNote}
              </div>
            )}

            <InputField
              id="reg-reviewer-note"
              label="Ghi chú thẩm định của Giáo vụ (Bắt buộc khi Yêu cầu bổ sung hoặc Từ chối)"
              placeholder="Nhập nhận xét rà soát sĩ số, điểm đầu vào hoặc nội dung cần Sale bổ sung..."
              value={reviewerNoteInput}
              onChange={(e) => setReviewerNoteInput(e.target.value)}
            />

            <ActionGuard permission="sales.registrations.review">
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setInspectReg(null)}>
                  Đóng
                </Button>
                {inspectReg.status !== 'Reviewing' && (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={reviewRegistrationMutation.isPending}
                    onClick={() => reviewRegistrationMutation.mutate('Reviewing')}
                  >
                    Tiếp nhận rà soát
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  loading={reviewRegistrationMutation.isPending}
                  onClick={() => reviewRegistrationMutation.mutate('NeedAdditionalInfo')}
                >
                  Yêu cầu bổ sung
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={reviewRegistrationMutation.isPending}
                  onClick={() => reviewRegistrationMutation.mutate('Rejected')}
                >
                  Từ chối
                </Button>
                <Button
                  type="button"
                  loading={reviewRegistrationMutation.isPending}
                  onClick={() => reviewRegistrationMutation.mutate('Approved')}
                >
                  Phê duyệt chuyển xếp lớp
                </Button>
              </div>
            </ActionGuard>
          </div>
        )}
      </Modal>
    </div>
  )
}

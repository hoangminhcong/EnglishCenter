import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, MapPin, Pencil, Plus } from 'lucide-react'
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
  Pagination,
  SelectField,
} from '@english-center/ui'
import {
  isValidEmail,
  isValidVnPhone,
  matchText,
  paginate,
  toSafeHttpUrl,
} from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cmsApi } from '@/features/content/api/cmsApi'
import type { ManagedBranchRecord } from '@/features/content/types/cms.types'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

type BranchSortKey = 'order_asc' | 'name_asc' | 'id_asc'

const PAGE_SIZE = 7

export function BranchesPage() {
  useDocumentTitle('Hệ thống cơ sở')
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Offline' | 'Online'>('ALL')
  const [sortBy, setSortBy] = useState<BranchSortKey>('order_asc')
  const [page, setPage] = useState(1)

  const [editorOpen, setEditorOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formState, setFormState] = useState<ManagedBranchRecord>({
    id: '',
    name: '',
    shortLabel: '',
    studyMode: 'Offline',
    city: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
    lat: 21.0285,
    lng: 105.8542,
    image: '',
    mapUrl: '',
    isActive: true,
    showOnMap: true,
    showInSchedule: true,
    displayOrder: 1,
  })

  const { data: branches = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: ManagedBranchRecord) => cmsApi.upsertBranch(payload, isEdit),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'branches'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: isEdit ? 'Đã cập nhật cơ sở đào tạo' : 'Đã thêm cơ sở mới',
        description: `${saved.name} (${saved.id}) – Thứ tự #${saved.displayOrder}`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu cơ sở.')
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = branches.filter((b) => {
      if (modeFilter !== 'ALL' && b.studyMode !== modeFilter) return false
      if (search.trim()) {
        return (
          matchText(b.name, search) ||
          matchText(b.address, search) ||
          matchText(b.id, search) ||
          matchText(b.district, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi')
      if (sortBy === 'id_asc') return a.id.localeCompare(b.id, 'vi')
      return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'vi')
    })
  }, [branches, modeFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  const openCreate = () => {
    setIsEdit(false)
    setFormError(null)
    setFormState({
      id: '',
      name: '',
      shortLabel: '',
      studyMode: 'Offline',
      city: '',
      district: '',
      address: '',
      phone: '',
      email: '',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.0285,
      lng: 105.8542,
      image: '',
      mapUrl: '',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: branches.length + 1,
    })
    setEditorOpen(true)
  }

  const openEdit = (branch: ManagedBranchRecord) => {
    setIsEdit(true)
    setFormError(null)
    setFormState({
      ...branch,
      image: branch.image ?? '',
    })
    setEditorOpen(true)
  }

  const handleSave = () => {
    if (!formState.id.trim() || !formState.name.trim() || !formState.address.trim()) {
      setFormError('Vui lòng nhập đầy đủ Mã cơ sở, Tên cơ sở và Địa chỉ.')
      return
    }
    if (!isValidVnPhone(formState.phone.replace(/\s+/g, ''))) {
      setFormError('Số điện thoại cơ sở không hợp lệ (10 chữ số Việt Nam).')
      return
    }
    const trimmedEmail = formState.email.trim()
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFormError('Email cơ sở không đúng định dạng hợp lệ (hoặc để trống nếu chưa thiết lập).')
      return
    }
    if (!formState.workingHours.trim()) {
      setFormError('Vui lòng nhập Giờ làm việc của cơ sở.')
      return
    }
    if (
      !Number.isFinite(formState.lat) ||
      formState.lat < -90 ||
      formState.lat > 90 ||
      !Number.isFinite(formState.lng) ||
      formState.lng < -180 ||
      formState.lng > 180
    ) {
      setFormError('Tọa độ Vĩ độ (lat: -90..90) hoặc Kinh độ (lng: -180..180) không hợp lệ.')
      return
    }
    if (formState.mapUrl.trim() && !toSafeHttpUrl(formState.mapUrl.trim())) {
      setFormError('Đường dẫn bản đồ Google Maps phải là URL http/https hợp lệ.')
      return
    }
    if (
      formState.image?.trim() &&
      !toSafeHttpUrl(formState.image.trim()) &&
      !formState.image.trim().startsWith('/')
    ) {
      setFormError('Ảnh cơ sở phải là URL http/https hoặc đường dẫn hợp lệ.')
      return
    }
    saveMutation.mutate({
      ...formState,
      email: trimmedEmail,
      image: formState.image?.trim() || undefined,
      displayOrder: Math.max(1, Number(formState.displayOrder) || 1),
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải hệ thống cơ sở..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách cơ sở."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hệ thống Cơ sở Đào tạo"
        description="Quản lý danh sách cơ sở đào tạo trực tiếp và trực tuyến."
        badge={<Badge tone="info">{branches.length} cơ sở</Badge>}
        actions={
          <ActionGuard permission="branches.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Thêm cơ sở mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="br-search"
            label="Tìm kiếm cơ sở"
            placeholder="Nhập tên cơ sở, quận/huyện, địa chỉ hoặc mã cơ sở..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="br-mode"
          label="Hình thức hoạt động"
          value={modeFilter}
          onChange={(e) => {
            setModeFilter(e.target.value as 'ALL' | 'Offline' | 'Online')
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả cơ sở' },
            { value: 'Offline', label: 'Cơ sở trực tiếp (Offline)' },
            { value: 'Online', label: 'Trực tuyến (TOEIC Online)' },
          ]}
        />
        <SelectField
          id="br-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as BranchSortKey)
            setPage(1)
          }}
          options={[
            { value: 'order_asc', label: 'Thứ tự hiển thị' },
            { value: 'name_asc', label: 'Tên cơ sở A → Z' },
            { value: 'id_asc', label: 'Mã cơ sở A → Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không tìm thấy cơ sở nào phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[210px]">
                    Thứ tự & Tên cơ sở
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Địa chỉ, Tọa độ & Liên hệ</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Hiển thị Website
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((b) => (
                  <DataTableRow key={b.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge tone="neutral">#{b.displayOrder}</Badge>
                        <p className="font-bold text-[#243B53]">{b.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs whitespace-nowrap text-[#64748B]">
                        ID: <code>{b.id}</code> • {b.studyMode}
                      </p>
                    </DataTableCell>
                    <DataTableCell>
                      <p className="inline-flex items-start gap-1 text-xs font-medium text-[#243B53]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2878B8]" />
                        <span>{b.address}</span>
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        ĐT: <strong className="whitespace-nowrap">{b.phone}</strong> • Email:{' '}
                        {b.email || '—'} • Tọa độ:{' '}
                        <code className="whitespace-nowrap">
                          {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                        </code>
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#475569]">
                        <Clock className="h-3 w-3 text-[#2878B8]" />
                        <span>{b.workingHours}</span>
                      </p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1.5 xl:flex-row xl:items-center">
                        <Badge tone={b.showOnMap ? 'info' : 'neutral'}>
                          {b.showOnMap ? 'Hiện bản đồ' : 'Ẩn bản đồ'}
                        </Badge>
                        <Badge tone={b.showInSchedule ? 'info' : 'neutral'}>
                          {b.showInSchedule ? 'Có lịch KG' : 'Ẩn lịch KG'}
                        </Badge>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={b.isActive ? 'success' : 'neutral'}>
                        {b.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right whitespace-nowrap">
                      <ActionGuard permission="branches.update">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Chỉnh sửa</span>
                          </Button>
                        </div>
                      </ActionGuard>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>

          <Pagination
            page={paginated.page}
            totalPages={paginated.totalPages}
            onChange={setPage}
          />
        </div>
      )}

      <Modal
        open={editorOpen}
        title={isEdit ? `Chỉnh sửa ${formState.name}` : 'Thêm cơ sở đào tạo mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              Lưu cơ sở
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              id="bf-id"
              label="Mã định danh cơ sở (ID)"
              disabled={isEdit}
              value={formState.id}
              onChange={(e) => setFormState({ ...formState, id: e.target.value })}
            />
            <SelectField
              id="bf-mode"
              label="Hình thức"
              value={formState.studyMode}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  studyMode: e.target.value as 'Offline' | 'Online',
                })
              }
              options={[
                { value: 'Offline', label: 'Trực tiếp (Offline)' },
                { value: 'Online', label: 'Trực tuyến (Online)' },
              ]}
            />
            <InputField
              id="bf-name"
              label="Tên hiển thị đầy đủ"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            />
            <InputField
              id="bf-short"
              label="Nhãn rút gọn (Tab lịch khai giảng)"
              value={formState.shortLabel}
              onChange={(e) => setFormState({ ...formState, shortLabel: e.target.value })}
            />
            <InputField
              id="bf-city"
              label="Tỉnh / Thành phố"
              value={formState.city}
              onChange={(e) => setFormState({ ...formState, city: e.target.value })}
            />
            <InputField
              id="bf-dist"
              label="Quận / Huyện"
              value={formState.district}
              onChange={(e) => setFormState({ ...formState, district: e.target.value })}
            />
            <InputField
              id="bf-phone"
              label="Số điện thoại cơ sở"
              value={formState.phone}
              onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
            />
            <InputField
              id="bf-email"
              label="Email cơ sở (Không bắt buộc)"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
              placeholder="VD: contact@englishcenter.edu.vn"
            />
            <InputField
              id="bf-lat"
              label="Vĩ độ bản đồ (Latitude)"
              type="number"
              step="0.0001"
              value={formState.lat}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  lat: Number(e.target.value),
                })
              }
            />
            <InputField
              id="bf-lng"
              label="Kinh độ bản đồ (Longitude)"
              type="number"
              step="0.0001"
              value={formState.lng}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  lng: Number(e.target.value),
                })
              }
            />
            <InputField
              id="bf-hours"
              label="Giờ làm việc (Working Hours)"
              value={formState.workingHours}
              onChange={(e) => setFormState({ ...formState, workingHours: e.target.value })}
              placeholder="VD: 08:00 – 21:45 (Thứ Hai - Thứ Bảy)"
            />
            <InputField
              id="bf-order"
              label="Thứ tự hiển thị (Display Order)"
              type="number"
              min={1}
              value={formState.displayOrder}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  displayOrder: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>

          <InputField
            id="bf-addr"
            label="Địa chỉ chi tiết"
            value={formState.address}
            onChange={(e) => setFormState({ ...formState, address: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              id="bf-map"
              label="Liên kết Google Maps (https://...)"
              value={formState.mapUrl}
              onChange={(e) => setFormState({ ...formState, mapUrl: e.target.value })}
            />
            <InputField
              id="bf-image"
              label="Ảnh đại diện cơ sở (URL tùy chọn)"
              value={formState.image ?? ''}
              onChange={(e) => setFormState({ ...formState, image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-2.5 text-xs font-bold">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
              />
              <span>Đang hoạt động</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-2.5 text-xs font-bold">
              <input
                type="checkbox"
                checked={formState.showOnMap}
                onChange={(e) => setFormState({ ...formState, showOnMap: e.target.checked })}
              />
              <span>Hiện trên Bản đồ</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-2.5 text-xs font-bold">
              <input
                type="checkbox"
                checked={formState.showInSchedule}
                onChange={(e) =>
                  setFormState({ ...formState, showInSchedule: e.target.checked })
                }
              />
              <span>Hiện ở Lịch khai giảng</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}

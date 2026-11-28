import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Lock, Shield } from 'lucide-react'
import { Badge, EmptyBlock, ErrorBlock, LoadingBlock } from '@english-center/ui'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import {
  ACCESS_SCOPE_LABELS,
  PERMISSION_CATALOG,
  ROLE_DEFINITIONS,
} from '@/services/permissions/permissions.config'
import type { StaffRole } from '@/types/rbac.types'
import { PageHeader } from '@/shared/components/PageHeader'

function parseRoleQueryParam(raw: string | null): StaffRole | null {
  if (!raw) return null
  const upper = raw.toUpperCase()
  const found = ROLE_DEFINITIONS.find((r) => r.role === upper)
  return found ? found.role : null
}

export function RolesPage() {
  useDocumentTitle('Vai trò & Quyền hạn')
  const [searchParams, setSearchParams] = useSearchParams()

  const paramRole = parseRoleQueryParam(searchParams.get('role'))
  const [fallbackRole, setFallbackRole] = useState<StaffRole>('ADMIN')
  const selectedRole: StaffRole = paramRole ?? fallbackRole

  const { data: roles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'roles'],
    queryFn: () => accountsApi.listRolesMatrix(),
  })

  if (isLoading) return <LoadingBlock label="Đang tải danh mục vai trò..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách vai trò hệ thống."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  if (roles.length === 0) {
    return <EmptyBlock title="Chưa có dữ liệu vai trò hệ thống" />
  }

  const activeRoleItem = roles.find((r) => r.role === selectedRole) ?? roles[0]!
  const assignedSet = new Set(activeRoleItem.permissions)
  const groups = Array.from(new Set(PERMISSION_CATALOG.map((p) => p.group)))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Danh mục Vai trò & Quyền hạn"
        description="Tra cứu bộ quyền mặc định của từng vai trò nhân sự trong hệ thống."
        badge={
          <Badge tone="neutral">
            <Lock className="mr-1 h-3 w-3" />
            Chỉ đọc
          </Badge>
        }
        actions={
          <ActionGuard permission="accounts.view">
            <Link
              to="/accounts"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2 text-xs font-bold text-[#243B53] transition hover:border-[#75BDEB] hover:bg-[#F5FAFE] hover:text-[#2878B8]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại Quản lý tài khoản</span>
            </Link>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-4">
          {roles.map((roleItem) => {
            const active = roleItem.role === activeRoleItem.role
            return (
              <button
                key={roleItem.role}
                type="button"
                onClick={() => {
                  setFallbackRole(roleItem.role)
                  setSearchParams({ role: roleItem.role }, { replace: true })
                }}
                className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-[#2878B8] bg-[#EAF6FD]/70 shadow-2xs'
                    : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 text-sm font-extrabold text-[#243B53]">
                    {roleItem.label}
                  </span>
                  <Badge tone="info">{roleItem.shortBadge}</Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
                  {roleItem.description}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#2878B8]">
                  <span>{roleItem.permissions.length} quyền</span>
                  <span>{roleItem.accountCount} tài khoản</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-8">
          <div className="border-b border-[#DCEAF3] pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#2878B8]" />
              <h2 className="text-lg font-extrabold text-[#243B53]">{activeRoleItem.label}</h2>
            </div>
            <p className="mt-1.5 text-xs text-[#64748B]">
              Phạm vi dữ liệu mặc định:{' '}
              <strong className="text-[#243B53]">
                {ACCESS_SCOPE_LABELS[activeRoleItem.scopeType]}
              </strong>{' '}
              • Điều hướng sau đăng nhập: <code>{activeRoleItem.defaultLandingRoute}</code>
            </p>
          </div>

          <div className="mt-4 space-y-5">
            {groups.map((groupName) => {
              const grantedInGroup = PERMISSION_CATALOG.filter(
                (p) => p.group === groupName && assignedSet.has(p.code),
              )
              if (grantedInGroup.length === 0) return null

              return (
                <div key={groupName}>
                  <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#2878B8]">
                    {groupName} ({grantedInGroup.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {grantedInGroup.map((perm) => (
                      <div
                        key={perm.code}
                        className="flex items-start gap-2.5 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-2.5 text-xs"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A4C]" />
                        <div className="min-w-0">
                          <p className="font-bold text-[#243B53]">{perm.label}</p>
                          <code className="text-[11px] text-[#2878B8]">{perm.code}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

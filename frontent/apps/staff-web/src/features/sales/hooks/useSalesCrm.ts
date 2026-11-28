import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { accountsApi, getDisplayNameForAccount } from '@/features/accounts/api/accountsApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { toeicConfigApi } from '@/features/toeic-config/api/toeicConfigApi'
import { trainingApi } from '@/features/training/api/trainingApi'
import { tuitionApi } from '@/features/tuition/api/tuitionApi'
import { salesApi } from '@/features/sales/services/salesApi'
import type {
  AttachCourseInterestInput,
  CreateConsultationInput,
  CreateFollowUpInput,
  CreateLeadInput,
  SalesActorContext,
  SalesPeriodFilter,
  TransitionLeadStatusInput,
  TransitionRegistrationStatusInput,
  UpdateFollowUpStatusInput,
  UpdateLeadInput,
  UpsertCourseRegistrationInput,
} from '@/features/sales/types/sales.types'
import {
  getEffectivePermissionScope,
  hasPermission,
} from '@/services/permissions/permissions.config'
import { mapScopeTypeToLegacyDataScope } from '@/types/rbac.types'
import { useCurrentTime } from '@/shared/time/useCurrentTime'

export function useSalesActor(): SalesActorContext {
  const { session, user } = useStaffAuth()

  return useMemo<SalesActorContext>(() => {
    const canReview = hasPermission(session, 'sales.registrations.review')
    const canReopen = hasPermission(session, 'sales.leads.reopen')
    const leadScopeGrant = getEffectivePermissionScope(session, 'sales.leads.view')
    const resolvedScope =
      leadScopeGrant?.type === 'ALL' || canReview
        ? 'all'
        : mapScopeTypeToLegacyDataScope(leadScopeGrant?.type ?? user?.scopeType ?? 'OWN')

    return {
      userId: user?.id ?? 'anonymous',
      fullName: user?.fullName ?? 'Nhân sự',
      role: user?.roles[0] ?? 'SALES',
      scope: resolvedScope,
      branchId: user?.branchId,
      canReviewRegistrations: canReview,
      canAdminReopenLead: canReopen,
    }
  }, [session, user])
}

export function useSalesReferenceCatalogs() {
  const { session } = useStaffAuth()
  const canViewClasses = hasPermission(session, 'sales.classes.view')

  const coursesQuery = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const branchesQuery = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const classesQuery = useQuery({
    queryKey: ['staff', 'training', 'all-center-classes'],
    queryFn: () => trainingApi.listAllCenterClasses(),
    enabled: canViewClasses,
  })

  const accountsQuery = useQuery({
    queryKey: ['staff', 'accounts'],
    queryFn: () => accountsApi.listAccounts(),
  })

  const tuitionPoliciesQuery = useQuery({
    queryKey: ['staff', 'tuition-policies'],
    queryFn: () => tuitionApi.listPolicies(),
  })

  const milestonesQuery = useQuery({
    queryKey: ['staff', 'toeic-milestones'],
    queryFn: () => toeicConfigApi.listMilestones(),
  })

  const scalesQuery = useQuery({
    queryKey: ['staff', 'toeic-scales'],
    queryFn: () => toeicConfigApi.listScales(),
  })

  const saleEmployees = useMemo(() => {
    return (accountsQuery.data ?? [])
      .filter((acc) => acc.roles.includes('SALES') && acc.status === 'active')
      .map((acc) => ({
        id: acc.id,
        fullName: getDisplayNameForAccount(acc),
        employeeCode: acc.staffProfile?.employeeCode ?? acc.employeeProfile?.employeeCode ?? 'NV-SAL',
        branchName: acc.staffProfile?.branchName ?? acc.employeeProfile?.branchName ?? '',
      }))
  }, [accountsQuery.data])

  return {
    courses: coursesQuery.data ?? [],
    branches: branchesQuery.data ?? [],
    classes: classesQuery.data ?? [],
    tuitionPolicies: tuitionPoliciesQuery.data ?? [],
    milestones: milestonesQuery.data ?? [],
    scales: scalesQuery.data ?? [],
    saleEmployees,
    isLoadingCatalogs:
      coursesQuery.isLoading ||
      branchesQuery.isLoading ||
      classesQuery.isLoading ||
      tuitionPoliciesQuery.isLoading ||
      milestonesQuery.isLoading ||
      scalesQuery.isLoading,
  }
}

export function useAccessibleSalesLeads() {
  const actor = useSalesActor()

  return useQuery({
    queryKey: ['staff', 'sales', 'accessible-leads', actor.userId, actor.scope, actor.branchId],
    queryFn: () => salesApi.listAccessibleLeads(actor),
  })
}

export function useSalesRegistrationsList() {
  const actor = useSalesActor()

  return useQuery({
    queryKey: ['staff', 'sales', 'registrations', actor.userId, actor.scope, actor.branchId],
    queryFn: () => salesApi.listRegistrations(actor),
  })
}

export function useSalesRegistrationDetail(registrationId: string) {
  const actor = useSalesActor()

  return useQuery({
    queryKey: [
      'staff',
      'sales',
      'registration-detail',
      registrationId,
      actor.userId,
      actor.scope,
      actor.branchId,
    ],
    queryFn: () => salesApi.getRegistrationDetail(actor, registrationId),
    enabled: Boolean(registrationId),
    retry: false,
  })
}

export function useSalesDashboardData(period: SalesPeriodFilter) {
  const actor = useSalesActor()
  const { todayYmdVn, nowIso } = useCurrentTime()

  return useQuery({
    queryKey: [
      'staff',
      'sales',
      'dashboard',
      actor.userId,
      actor.scope,
      actor.branchId,
      period,
      todayYmdVn,
    ],
    queryFn: () =>
      salesApi.getDashboardData(actor, {
        period,
        todayYmdVn,
        nowIso,
      }),
  })
}

export function useSalesLeadDetail(leadId: string) {
  const actor = useSalesActor()

  return useQuery({
    queryKey: ['staff', 'sales', 'lead', leadId, actor.userId, actor.scope, actor.branchId],
    queryFn: () => salesApi.getLeadDetail(actor, leadId),
    enabled: Boolean(leadId),
    retry: false,
  })
}

export function useSalesLeadMutations() {
  const actor = useSalesActor()
  const queryClient = useQueryClient()

  const invalidateAllSales = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'sales'] })
  }

  const createLead = useMutation({
    mutationFn: (input: CreateLeadInput) => salesApi.createLead(actor, input),
    onSuccess: invalidateAllSales,
  })

  const updateLead = useMutation({
    mutationFn: (input: UpdateLeadInput) => salesApi.updateLead(actor, input),
    onSuccess: invalidateAllSales,
  })

  const transitionLeadStatus = useMutation({
    mutationFn: (input: TransitionLeadStatusInput) =>
      salesApi.transitionLeadStatus(actor, input),
    onSuccess: invalidateAllSales,
  })

  const createConsultation = useMutation({
    mutationFn: (input: CreateConsultationInput) =>
      salesApi.createConsultation(actor, input),
    onSuccess: invalidateAllSales,
  })

  const createFollowUp = useMutation({
    mutationFn: (input: CreateFollowUpInput) => salesApi.createFollowUp(actor, input),
    onSuccess: invalidateAllSales,
  })

  const updateFollowUpStatus = useMutation({
    mutationFn: (input: UpdateFollowUpStatusInput) =>
      salesApi.updateFollowUpStatus(actor, input),
    onSuccess: invalidateAllSales,
  })

  const attachCourseInterest = useMutation({
    mutationFn: (input: AttachCourseInterestInput) =>
      salesApi.attachCourseInterestToLead(actor, input),
    onSuccess: invalidateAllSales,
  })

  const saveOrSubmitRegistration = useMutation({
    mutationFn: (input: UpsertCourseRegistrationInput) =>
      salesApi.saveOrSubmitRegistration(actor, input),
    onSuccess: invalidateAllSales,
  })

  const transitionRegistrationStatus = useMutation({
    mutationFn: (input: TransitionRegistrationStatusInput) =>
      salesApi.transitionRegistrationStatus(actor, input),
    onSuccess: invalidateAllSales,
  })

  return {
    createLead,
    updateLead,
    transitionLeadStatus,
    createConsultation,
    createFollowUp,
    updateFollowUpStatus,
    attachCourseInterest,
    saveOrSubmitRegistration,
    transitionRegistrationStatus,
  }
}

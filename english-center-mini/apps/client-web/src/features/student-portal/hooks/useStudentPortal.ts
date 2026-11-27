import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { studentPortalRepository } from '../repositories/studentPortal.repository';
import type {
  CreateSupportRequestInput,
  SubmitDemoScoreInput,
  SubmitHomeworkInput,
} from '../model/studentPortal.types';

export const studentPortalQueryKeys = CLIENT_QUERY_KEYS.studentPortal;

export function useStudentPortalData() {
  const { user } = useAuth();
  const studentId = user?.id ?? 'guest';

  return useQuery({
    queryKey: studentPortalQueryKeys.dataset(studentId),
    queryFn: () =>
      studentPortalRepository.getPortalDataset(studentId, {
        fullName: user?.fullName,
        email: user?.email,
        phone: user?.phone,
      }),
    enabled: Boolean(user?.id),
  });
}

export function useStudentTuitionOverview() {
  const { user } = useAuth();
  const studentId = user?.id ?? 'guest';

  return useQuery({
    queryKey: studentPortalQueryKeys.tuition(studentId),
    queryFn: () => studentPortalRepository.getTuitionOverview(studentId),
    enabled: Boolean(user?.id),
  });
}

export function useSubmitHomeworkMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const studentId = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (input: SubmitHomeworkInput) =>
      studentPortalRepository.submitHomework(studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentPortalQueryKeys.dataset(studentId),
      });
    },
  });
}

export function useSubmitDemoScoreMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const studentId = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (input: SubmitDemoScoreInput) =>
      studentPortalRepository.submitDemoScore(studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentPortalQueryKeys.dataset(studentId),
      });
    },
  });
}

export function useCreateSupportRequestMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const studentId = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (input: CreateSupportRequestInput) =>
      studentPortalRepository.createSupportRequest(studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentPortalQueryKeys.dataset(studentId),
      });
    },
  });
}

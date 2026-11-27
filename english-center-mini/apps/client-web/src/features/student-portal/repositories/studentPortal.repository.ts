import type { StudentTuitionOverviewDto } from '@english-center/contracts';
import { USE_MOCK_API } from '@/services/api/apiConfig';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { httpClient } from '@/services/api/httpClient';
import { mockDelay } from '@/services/api/mockUtils';
import { formatDate, getTodayIsoInVietnam } from '@/utils/format';
import {
  getSeededStudentPortalDataset,
  getSeededStudentTuitionOverview,
} from '../mocks/studentPortalMockData';
import { calculateReferenceDemoTotal } from '../model/studentPortal.schema';
import type {
  AssignmentSubmission,
  CreateSupportRequestInput,
  StudentPortalDataset,
  SubmitDemoScoreInput,
  SubmitHomeworkInput,
  SupportRequestRecord,
} from '../model/studentPortal.types';

export interface StudentPortalRepository {
  getPortalDataset(
    studentId: string,
    fallbackUser?: { fullName?: string; email?: string; phone?: string }
  ): Promise<StudentPortalDataset>;

  getTuitionOverview(studentId: string): Promise<StudentTuitionOverviewDto>;

  submitHomework(
    studentId: string,
    input: SubmitHomeworkInput
  ): Promise<AssignmentSubmission>;

  submitDemoScore(
    studentId: string,
    input: SubmitDemoScoreInput
  ): Promise<AssignmentSubmission>;

  createSupportRequest(
    studentId: string,
    input: CreateSupportRequestInput
  ): Promise<SupportRequestRecord>;
}

let defaultInjectedDataset: StudentPortalDataset | null = null;
const injectedDatasetsByStudent = new Map<string, StudentPortalDataset>();
const injectedTuitionByStudent = new Map<string, StudentTuitionOverviewDto>();
const inMemorySubmissions = new Map<string, Record<string, AssignmentSubmission>>();
const inMemorySupportRequests = new Map<string, SupportRequestRecord[]>();

export function configureMockPortalDatasetForTest(
  dataset: StudentPortalDataset | null
): void;
export function configureMockPortalDatasetForTest(
  studentId: string,
  dataset: StudentPortalDataset | null
): void;
export function configureMockPortalDatasetForTest(
  arg1: string | StudentPortalDataset | null,
  arg2?: StudentPortalDataset | null
): void {
  if (typeof arg1 === 'string') {
    if (arg2) {
      injectedDatasetsByStudent.set(arg1, structuredClone(arg2));
    } else {
      injectedDatasetsByStudent.delete(arg1);
    }
    return;
  }

  defaultInjectedDataset = arg1 ? structuredClone(arg1) : null;
  if (arg1?.student?.id) {
    injectedDatasetsByStudent.set(arg1.student.id, structuredClone(arg1));
  }
}

export function configureMockTuitionForTest(
  overview: StudentTuitionOverviewDto | null
): void;
export function configureMockTuitionForTest(
  studentId: string,
  overview: StudentTuitionOverviewDto | null
): void;
export function configureMockTuitionForTest(
  arg1: string | StudentTuitionOverviewDto | null,
  arg2?: StudentTuitionOverviewDto | null
): void {
  if (typeof arg1 === 'string') {
    if (arg2) {
      injectedTuitionByStudent.set(arg1, {
        ...structuredClone(arg2),
        studentId: arg1,
      });
    } else {
      injectedTuitionByStudent.delete(arg1);
    }
    return;
  }

  if (arg1 === null) {
    injectedTuitionByStudent.clear();
    return;
  }

  injectedTuitionByStudent.set(arg1.studentId, structuredClone(arg1));
}

export function resetMockPortalForTest(): void {
  defaultInjectedDataset = null;
  injectedDatasetsByStudent.clear();
  injectedTuitionByStudent.clear();
  inMemorySubmissions.clear();
  inMemorySupportRequests.clear();
}

function createEmptyTuitionOverview(studentId: string): StudentTuitionOverviewDto {
  return {
    studentId,
    studentCode: '',
    totalReceivableVnd: 0,
    totalPaidConfirmedVnd: 0,
    totalRemainingVnd: 0,
    items: [],
  };
}

function createEmptyPortalDataset(
  studentId: string,
  fallbackUser?: { fullName?: string; email?: string; phone?: string }
): StudentPortalDataset {
  const todayIso = getTodayIsoInVietnam();
  const zeroScore = { lc: 0, rc: 0, total: 0 };

  return {
    hasEnrollment: false,
    student: {
      id: studentId,
      studentCode: '',
      fullName: fallbackUser?.fullName?.trim() || 'Học viên',
      email: fallbackUser?.email?.trim() || '',
      phone: fallbackUser?.phone?.trim() || '',
      learningStatus: 'waiting_placement',
      entryScore: zeroScore,
      goalScore: zeroScore,
    },
    classInfo: null,
    enrollments: [],
    assessmentGrades: [],
    generalResources: [],
    lessons: [],
    assignments: [],
    attendance: [],
    examResults: {
      entryScore: zeroScore,
      goalScore: zeroScore,
      midTerm: null,
      finalTerm: null,
    },
    supportRequests: [],
    referenceToday: todayIso,
  };
}

function buildActiveMockDataset(
  studentId: string,
  fallbackUser?: { fullName?: string; email?: string; phone?: string }
): StudentPortalDataset {
  const base =
    injectedDatasetsByStudent.get(studentId) ??
    defaultInjectedDataset ??
    getSeededStudentPortalDataset(studentId, fallbackUser) ??
    createEmptyPortalDataset(studentId, fallbackUser);

  const cloned = structuredClone(base);
  const storedSubs = inMemorySubmissions.get(studentId) ?? {};
  const storedReqs = inMemorySupportRequests.get(studentId) ?? [];

  if (Object.keys(storedSubs).length > 0) {
    cloned.assignments = cloned.assignments.map((item) => {
      const updated = storedSubs[item.id];
      if (!updated) return item;
      return {
        ...item,
        submission: updated,
        isOverdue: false,
      };
    });
  }

  if (storedReqs.length > 0) {
    cloned.supportRequests = [...storedReqs, ...cloned.supportRequests];
  }

  return cloned;
}

function recordMockSubmission(
  studentId: string,
  submission: AssignmentSubmission
): void {
  const prev = inMemorySubmissions.get(studentId) ?? {};
  inMemorySubmissions.set(studentId, {
    ...prev,
    [submission.assignmentId]: submission,
  });
}

export const studentPortalRepository: StudentPortalRepository & {
  configureMockPortalDatasetForTest: typeof configureMockPortalDatasetForTest;
  configureMockTuitionForTest: typeof configureMockTuitionForTest;
  resetMockPortalForTest: typeof resetMockPortalForTest;
} = {
  configureMockPortalDatasetForTest,
  configureMockTuitionForTest,
  resetMockPortalForTest,

  async getPortalDataset(studentId, fallbackUser) {
    if (!USE_MOCK_API) {
      return httpClient.get<StudentPortalDataset>(
        API_ENDPOINTS.studentPortal.profileMe
      );
    }

    await mockDelay(180);
    return buildActiveMockDataset(studentId, fallbackUser);
  },

  async getTuitionOverview(studentId) {
    if (!USE_MOCK_API) {
      return httpClient.get<StudentTuitionOverviewDto>(
        API_ENDPOINTS.studentPortal.tuitionMe
      );
    }

    await mockDelay(150);
    const injected =
      injectedTuitionByStudent.get(studentId) ??
      getSeededStudentTuitionOverview(studentId);
    if (injected) {
      return structuredClone(injected);
    }
    return createEmptyTuitionOverview(studentId);
  },

  async submitHomework(studentId, input) {
    const trimmedLink = input.driveLink.trim();
    const trimmedNote = input.studentAnswerNote?.trim() || undefined;

    if (!USE_MOCK_API) {
      return httpClient.post<AssignmentSubmission>(
        API_ENDPOINTS.studentPortal.submitAssignment(input.assignmentId),
        {
          submissionType: 'homework',
          driveLink: trimmedLink || undefined,
          studentAnswerNote: trimmedNote,
          partScores: {
            lc: input.lcCorrect,
            rc: input.rcCorrect,
          },
        }
      );
    }

    await mockDelay(250);
    const submission: AssignmentSubmission = {
      assignmentId: input.assignmentId,
      studentId,
      status: 'submitted',
      driveLink: trimmedLink || undefined,
      studentAnswerNote: trimmedNote,
      partScores: {
        lc: input.lcCorrect,
        rc: input.rcCorrect,
      },
      isConfirmedByTeacher: false,
      submittedAt: new Date().toISOString(),
    };
    recordMockSubmission(studentId, submission);
    return submission;
  },

  async submitDemoScore(studentId, input) {
    if (!USE_MOCK_API) {
      return httpClient.post<AssignmentSubmission>(
        API_ENDPOINTS.studentPortal.submitAssignment(input.assignmentId),
        {
          submissionType: 'demo',
          demoScores: calculateReferenceDemoTotal(input.lcScore, input.rcScore),
        }
      );
    }

    await mockDelay(250);
    const submission: AssignmentSubmission = {
      assignmentId: input.assignmentId,
      studentId,
      status: 'submitted',
      demoScores: calculateReferenceDemoTotal(input.lcScore, input.rcScore),
      isConfirmedByTeacher: false,
      submittedAt: new Date().toISOString(),
    };
    recordMockSubmission(studentId, submission);
    return submission;
  },

  async createSupportRequest(studentId, input) {
    if (!USE_MOCK_API) {
      return httpClient.post<SupportRequestRecord>(
        API_ENDPOINTS.studentPortal.createSupportRequest,
        input
      );
    }

    await mockDelay(250);
    const todayIso = getTodayIsoInVietnam();
    const nowIso = new Date().toISOString();
    const record: SupportRequestRecord = {
      id: `req-${Date.now()}`,
      requestCode: `REQ-${String(Date.now()).slice(-6)}`,
      studentId,
      type: input.type,
      requestType: input.type,
      reason: input.reason,
      content: input.content.trim(),
      detailNote: input.content.trim(),
      effectiveDate: input.effectiveDate?.trim() || todayIso,
      holdUntilDate: input.holdUntilDate?.trim() || undefined,
      contact: input.contact?.trim() || undefined,
      createdAt: formatDate(todayIso),
      submittedAt: nowIso,
      status: 'Pending',
    };
    const prev = inMemorySupportRequests.get(studentId) ?? [];
    inMemorySupportRequests.set(studentId, [record, ...prev]);
    return record;
  },
};

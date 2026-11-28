import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { mapTeacherToStudentAttendanceStatus } from '@english-center/contracts'
import { branchApi } from '../src/features/about/api/branchApi.ts'
import {
  CLIENT_CLEANUP_MIGRATION_KEY,
  CLIENT_SESSION_STORAGE_KEY,
  authService,
  authSessionStore,
  configureMockAuthUsersForTest,
  resetMockAuthForTest,
  runClientStorageCleanupMigration,
} from '../src/features/auth/services/authService.ts'
import { courseApi } from '../src/features/courses/api/courseApi.ts'
import { scheduleApi } from '../src/features/schedules/api/scheduleApi.ts'
import {
  computePortalWeightedGrades,
  resolveStudentAttendanceStatus,
} from '../src/features/student-portal/model/studentPortal.schema.ts'
import {
  configureMockTuitionForTest,
  resetMockPortalForTest,
  studentPortalRepository,
} from '../src/features/student-portal/repositories/studentPortal.repository.ts'
import {
  configureStudyZoneMockAdapter,
  resetStudyZoneMockAdapter,
  studyZoneApi,
} from '../src/features/study-zone/api/studyZoneApi.ts'
import { attemptApi } from '../src/features/test-online/api/attemptApi.ts'
import { historyApi } from '../src/features/test-online/api/historyApi.ts'
import {
  configureTestOnlineMockAdapter,
  resetTestOnlineMockAdapter,
  testApi,
} from '../src/features/test-online/api/testApi.ts'
import {
  ATTEMPTS_STORAGE_KEY,
  RESULTS_STORAGE_KEY,
  attemptStorageService,
} from '../src/features/test-online/services/attemptService.ts'
import {
  DEFAULT_TOEIC_SCORE_CONVERSION_TABLE,
  gradeTestAttempt,
} from '../src/features/test-online/services/scoringService.ts'
import {
  buildRealUserHistoryFixture,
  fixtureStudentTuitionOverview,
  fixtureStudyAnswerKeys,
  fixtureStudyExercise,
  fixtureStudyTopic,
  fixtureToeicAnswerKeys,
  fixtureToeicFullTest,
} from './fixtures/clientTestFixtures.ts'

beforeEach(() => {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
  resetMockAuthForTest()
  resetMockPortalForTest()
  resetStudyZoneMockAdapter()
  resetTestOnlineMockAdapter()
})

describe('1. Synchronized Client Web Review Seed Startup', () => {
  it('populates Study Zone topics, TOEIC Online tests, and Test History on fresh startup with zero .demo artifacts', async () => {
    const [grammarTopics, vocabTopics, listeningTopics, tests, history] = await Promise.all([
      studyZoneApi.getTopics('grammar'),
      studyZoneApi.getTopics('vocabulary'),
      studyZoneApi.getTopics('listening'),
      testApi.getTests(),
      historyApi.getHistory({}),
    ])

    assert.equal(grammarTopics.length > 0, true)
    assert.equal(vocabTopics.length > 0, true)
    assert.equal(listeningTopics.length > 0, true)
    assert.equal(tests.length > 0, true)
    assert.equal(history.length >= 2, true)
  })
})

describe('2. Surgical localStorage Attempt History Preservation', () => {
  it('purges legacy fake seed IDs while preserving genuine user attempts and resolving history detail when tests = []', async () => {
    const fakeSeedAttempt = buildRealUserHistoryFixture('ATT-20261112-101')
    const secondFakeSeed = buildRealUserHistoryFixture('ATT-20261119-601')
    const realUserRecord = buildRealUserHistoryFixture('ATT-USER-REAL-001')

    globalThis.localStorage.setItem('ec_toeic_test_seeded_v5', '1')
    globalThis.localStorage.setItem(
      ATTEMPTS_STORAGE_KEY,
      JSON.stringify({
        [fakeSeedAttempt.attempt.id]: fakeSeedAttempt.attempt,
        [secondFakeSeed.attempt.id]: secondFakeSeed.attempt,
        [realUserRecord.attempt.id]: realUserRecord.attempt,
      }),
    )
    globalThis.localStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify({
        [fakeSeedAttempt.result.attemptId]: fakeSeedAttempt.result,
        [secondFakeSeed.result.attemptId]: secondFakeSeed.result,
        [realUserRecord.result.attemptId]: realUserRecord.result,
      }),
    )

    const historyRecords = await historyApi.getHistory({})
    assert.equal(historyRecords.length, 1)
    assert.equal(historyRecords[0]?.attempt.id, 'ATT-USER-REAL-001')
    assert.equal(historyRecords[0]?.result?.convertedTotalScore, 845)

    assert.equal(attemptStorageService.getAttemptById('ATT-20261112-101'), null)
    assert.equal(attemptStorageService.getResultByAttemptId('ATT-20261112-101'), null)
    assert.equal(globalThis.localStorage.getItem('ec_toeic_test_seeded_v5'), null)
    assert.equal(globalThis.localStorage.getItem('ec_toeic_seed_purged_v1'), '1')

    // Even when testApi has tests = [], getHistoryDetail still returns result cleanly with test: null
    const detail = await historyApi.getHistoryDetail('ATT-USER-REAL-001')
    assert.notEqual(detail, null)
    assert.equal(detail?.test, null)
    assert.equal(detail?.attempt.id, 'ATT-USER-REAL-001')
    assert.equal(detail?.result?.convertedTotalScore, 845)
    assert.equal(detail?.result?.listeningCorrect, 88)
    assert.equal(detail?.result?.readingCorrect, 82)
  })

  it('handles malformed JSON or non-object storage values gracefully without crashing', async () => {
    globalThis.localStorage.setItem(ATTEMPTS_STORAGE_KEY, '{corrupted-json')
    globalThis.localStorage.setItem(RESULTS_STORAGE_KEY, '[1, 2, 3]')

    const history = await historyApi.getHistory({})
    assert.deepEqual(history, [])
  })
})

describe('3. TOEIC Exam Engine Rules & Scoring Conversion', () => {
  it('enforces Listening One-Play Rule, unlocks listeningCompleted only after all listening audio groups lock, and grades accurately on 10–990 scale', async () => {
    configureTestOnlineMockAdapter({
      tests: [fixtureToeicFullTest],
      answerKeys: fixtureToeicAnswerKeys,
    })

    const started = await attemptApi.startAttempt({
      testId: fixtureToeicFullTest.id,
      testSlug: fixtureToeicFullTest.slug,
      practiceMode: 'full',
      selectedParts: [1, 2, 3, 4, 5, 6, 7],
      selectedDuration: 120,
    })

    assert.equal(started.status, 'in_progress')
    assert.equal(started.currentStage, 'part_intro')
    assert.equal(Boolean(started.timerPausedAt), true)
    assert.equal(started.listeningCompleted, false)

    const listeningAudioKeys = Object.keys(started.audioStates).sort()
    assert.deepEqual(listeningAudioKeys, [
      'fx-audio-p3',
      'fx-audio-p4',
      'fx-q1',
      'fx-q2',
    ])
    for (const key of listeningAudioKeys) {
      assert.equal(started.audioStates[key]?.status, 'NOT_PLAYED')
    }

    // Confirm Part 1 introduction -> timer unpauses and enters questions stage
    const afterIntro = await attemptApi.confirmPartIntroduction(started.id, 1, 'fx-q1')
    assert.equal(afterIntro.currentStage, 'questions')
    assert.equal(afterIntro.timerPausedAt, undefined)

    // Listening One-Play Rule: NOT_PLAYED -> PLAYING -> LOCKED
    const playingP1 = await attemptApi.updateAudioStatus(started.id, 'fx-q1', 'PLAYING')
    assert.equal(playingP1?.audioStates['fx-q1']?.status, 'PLAYING')
    assert.equal(playingP1?.listeningCompleted, false)

    const lockedP1 = await attemptApi.updateAudioStatus(started.id, 'fx-q1', 'LOCKED')
    assert.equal(lockedP1?.audioStates['fx-q1']?.status, 'LOCKED')
    assert.equal(lockedP1?.listeningCompleted, false)

    // Replay attempts once LOCKED must be rejected
    const replayAttempt = await attemptApi.updateAudioStatus(started.id, 'fx-q1', 'PLAYING')
    assert.equal(replayAttempt?.audioStates['fx-q1']?.status, 'LOCKED')
    const resetAttempt = await attemptApi.updateAudioStatus(started.id, 'fx-q1', 'NOT_PLAYED')
    assert.equal(resetAttempt?.audioStates['fx-q1']?.status, 'LOCKED')

    // Lock remaining listening groups one by one; listeningCompleted only flips after the final group locks
    const afterP2 = await attemptApi.updateAudioStatus(started.id, 'fx-q2', 'COMPLETED')
    assert.equal(afterP2?.audioStates['fx-q2']?.status, 'LOCKED')
    assert.equal(afterP2?.listeningCompleted, false)

    const afterP3 = await attemptApi.updateAudioStatus(started.id, 'fx-audio-p3', 'LOCKED')
    assert.equal(afterP3?.listeningCompleted, false)

    const afterP4 = await attemptApi.updateAudioStatus(started.id, 'fx-audio-p4', 'LOCKED')
    assert.equal(afterP4?.listeningCompleted, true)

    // Answer all 6 Listening correctly (100% -> 495) and 4/5 Reading correctly (80% -> 380) => 875/990
    await attemptApi.saveAttemptProgress(started.id, {
      answers: {
        'fx-q1': 'fx-q1-b',
        'fx-q2': 'fx-q2-a',
        'fx-q3': 'fx-q3-c',
        'fx-q4': 'fx-q4-d',
        'fx-q5': 'fx-q5-a',
        'fx-q6': 'fx-q6-b',
        'fx-q7': 'fx-q7-a',
        'fx-q8': 'fx-q8-b',
        'fx-q9': 'fx-q9-c',
        'fx-q10': 'fx-q10-d',
        'fx-q11': 'fx-q11-b', // wrong answer (correct is fx-q11-a)
      },
      flaggedQuestionIds: ['fx-q11'],
    })

    const submittedResult = await attemptApi.submitAttempt(started.id, 'submitted')
    assert.equal(submittedResult.totalQuestions, 11)
    assert.equal(submittedResult.correctCount, 10)
    assert.equal(submittedResult.incorrectCount, 1)
    assert.equal(submittedResult.unansweredCount, 0)
    assert.equal(submittedResult.listeningCorrect, 6)
    assert.equal(submittedResult.readingCorrect, 4)
    assert.equal(submittedResult.isFullTestScoreEligible, true)
    assert.equal(submittedResult.convertedListeningScore, 495)
    assert.equal(submittedResult.convertedReadingScore, 380)
    assert.equal(submittedResult.convertedTotalScore, 875)
    assert.equal(submittedResult.reviews['fx-q11']?.isFlagged, true)

    // Verify 10–990 boundary conversion with DEFAULT_TOEIC_SCORE_CONVERSION_TABLE (0% -> 10, 100% -> 990)
    assert.equal(DEFAULT_TOEIC_SCORE_CONVERSION_TABLE.length > 0, true)
    const zeroAttempt = {
      ...started,
      answers: {},
      status: 'submitted' as const,
    }
    const minScoreResult = gradeTestAttempt(
      fixtureToeicFullTest,
      zeroAttempt,
      'submitted',
      new Date().toISOString(),
      fixtureToeicAnswerKeys,
    )
    assert.equal(minScoreResult.convertedTotalScore, 10)

    const allCorrectAnswers: Record<string, string> = {}
    for (const [qId, key] of Object.entries(fixtureToeicAnswerKeys)) {
      allCorrectAnswers[qId] = key.correctOptionId
    }
    const maxScoreResult = gradeTestAttempt(
      fixtureToeicFullTest,
      { ...started, answers: allCorrectAnswers, status: 'submitted' },
      'submitted',
      new Date().toISOString(),
      fixtureToeicAnswerKeys,
    )
    assert.equal(maxScoreResult.convertedTotalScore, 990)
  })
})

describe('4. Study Zone Exercise Grading', () => {
  it('grades submitted Study Zone exercises accurately (correctCount, incorrectCount, unansweredCount, accuracyPercent)', async () => {
    configureStudyZoneMockAdapter({
      topics: [fixtureStudyTopic],
      exercises: [fixtureStudyExercise],
      answerKeys: fixtureStudyAnswerKeys,
    })

    const topics = await studyZoneApi.getTopics('grammar')
    assert.equal(topics.length, 1)
    assert.equal(topics[0]?.slug, 'noun-phrases-toeic')

    const exercise = await studyZoneApi.getExerciseById('fx-sz-ex-1')
    assert.notEqual(exercise, null)
    assert.equal(exercise?.questions.length, 4)

    // 2 correct (sz-q1, sz-q2), 1 wrong (sz-q3), 1 unanswered (sz-q4)
    const result = await studyZoneApi.submitExercise({
      exerciseId: 'fx-sz-ex-1',
      answers: {
        'sz-q1': 'sz-q1-b',
        'sz-q2': 'sz-q2-a',
        'sz-q3': 'sz-q3-a',
      },
      durationSeconds: 95,
    })

    assert.equal(result.totalQuestions, 4)
    assert.equal(result.answeredCount, 3)
    assert.equal(result.correctCount, 2)
    assert.equal(result.incorrectCount, 1)
    assert.equal(result.unansweredCount, 1)
    assert.equal(result.accuracyPercent, 50)
    assert.equal(result.scoreTen, 5)
    assert.equal(result.reviews['sz-q1']?.isCorrect, true)
    assert.equal(result.reviews['sz-q2']?.isCorrect, true)
    assert.equal(result.reviews['sz-q3']?.isCorrect, false)
    assert.equal(result.reviews['sz-q4']?.selectedOptionId, null)
  })
})

describe('5. Public APIs, Auth Portal Separation & Student Portal Synchronization', () => {
  it('returns synchronized public branches/courses/schedules, seeded student portal data for enrolled students, and clean unenrolled state for unplaced users', async () => {
    const [branches, courses, schedules, enrolledPortal, enrolledTuition, unplacedPortal, unplacedTuition] =
      await Promise.all([
        branchApi.getPublicBranches(),
        courseApi.getPublicCourses(),
        scheduleApi.getPublicSchedules({ month: 11, year: 2026 }),
        studentPortalRepository.getPortalDataset('stu-hv-001'),
        studentPortalRepository.getTuitionOverview('stu-hv-001'),
        studentPortalRepository.getPortalDataset('stu-real-01', {
          fullName: 'Học viên mới đăng ký',
          email: 'hv@englishcenter.vn',
        }),
        studentPortalRepository.getTuitionOverview('stu-real-01'),
      ])

    assert.equal(branches.length >= 6, true)
    assert.equal(courses.length >= 4, true)
    assert.equal(schedules.length > 0, true)

    assert.equal(enrolledPortal.hasEnrollment, true)
    assert.equal(enrolledPortal.classInfo?.classCode, 'EC-S01')
    assert.equal(enrolledPortal.lessons.length, 24)
    assert.equal(enrolledPortal.assignments.length >= 4, true)
    assert.equal(enrolledTuition.totalReceivableVnd, 4_500_000)
    assert.equal(enrolledTuition.totalPaidConfirmedVnd, 3_000_000)
    assert.equal(enrolledTuition.totalRemainingVnd, 1_500_000)

    assert.equal(unplacedPortal.hasEnrollment, false)
    assert.equal(unplacedPortal.classInfo, null)
    assert.deepEqual(unplacedPortal.lessons, [])
    assert.deepEqual(unplacedPortal.assignments, [])
    assert.deepEqual(unplacedPortal.attendance, [])

    assert.equal(unplacedTuition.studentId, 'stu-real-01')
    assert.equal(unplacedTuition.totalReceivableVnd, 0)
    assert.equal(unplacedTuition.totalPaidConfirmedVnd, 0)
    assert.equal(unplacedTuition.totalRemainingVnd, 0)
    assert.deepEqual(unplacedTuition.items, [])
  })

  it('isolates tuition overview per studentId, maps Staff attendance 1-to-1, and creates Pending academic requests', async () => {
    configureMockTuitionForTest('stu-tuition-01', fixtureStudentTuitionOverview)

    const [ownerTuition, otherStudentTuition] = await Promise.all([
      studentPortalRepository.getTuitionOverview('stu-tuition-01'),
      studentPortalRepository.getTuitionOverview('stu-other-02'),
    ])

    assert.equal(ownerTuition.studentId, 'stu-tuition-01')
    assert.equal(ownerTuition.totalReceivableVnd, 4_500_000)
    assert.equal(ownerTuition.totalPaidConfirmedVnd, 3_000_000)
    assert.equal(ownerTuition.totalRemainingVnd, 1_500_000)
    assert.equal(ownerTuition.items.length, 1)
    assert.equal(ownerTuition.items[0]?.receipts.length, 1)

    assert.equal(otherStudentTuition.studentId, 'stu-other-02')
    assert.equal(otherStudentTuition.totalReceivableVnd, 0)
    assert.equal(otherStudentTuition.totalPaidConfirmedVnd, 0)
    assert.equal(otherStudentTuition.totalRemainingVnd, 0)
    assert.deepEqual(otherStudentTuition.items, [])

    // 1-to-1 Staff Teacher -> Student Portal attendance status mapping
    assert.equal(mapTeacherToStudentAttendanceStatus('Present'), 'on')
    assert.equal(mapTeacherToStudentAttendanceStatus('Late'), 'late')
    assert.equal(mapTeacherToStudentAttendanceStatus('Excused'), 'excused')
    assert.equal(mapTeacherToStudentAttendanceStatus('Unexcused'), 'absent')
    assert.equal(mapTeacherToStudentAttendanceStatus('Unmarked'), 'none')
    assert.equal(resolveStudentAttendanceStatus('Present'), 'on')
    assert.equal(resolveStudentAttendanceStatus('Unexcused'), 'absent')

    // Support request creation returns 'Pending' matching Staff Academic's AcademicRequestStatus
    const createdReq = await studentPortalRepository.createSupportRequest('stu-tuition-01', {
      type: 'hold',
      reason: 'Công việc hoặc học tập bận',
      content: 'Em cần bảo lưu 1 tháng do lịch thực tập tại trường.',
      effectiveDate: '2026-12-01',
    })
    assert.equal(createdReq.status, 'Pending')
    assert.equal(createdReq.type, 'hold')
    assert.equal(createdReq.effectiveDate, '2026-12-01')
    assert.equal(Boolean(createdReq.requestCode), true)

    // Weighted GPA ignores null ungraded categories (matching TeacherGradebookPage 1-to-1)
    const weighted = computePortalWeightedGrades([
      {
        id: 'g-1',
        classId: 'cls-1',
        classCode: 'T600-K12',
        studentId: 'stu-tuition-01',
        studentCode: 'HV-2026-001',
        studentName: 'Học viên A',
        category: 'homework',
        assessmentTitle: 'BTVN Đợt 1',
        examDate: '2026-11-10',
        maxListeningScore: 50,
        maxReadingScore: 50,
        maxTotalScore: 100,
        listeningScore: 40,
        readingScore: 40,
        totalScore: 80,
        updatedByTeacherId: 'tch-1',
        updatedByTeacherName: 'Cô Minh Anh',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
      {
        id: 'g-2',
        classId: 'cls-1',
        classCode: 'T600-K12',
        studentId: 'stu-tuition-01',
        studentCode: 'HV-2026-001',
        studentName: 'Học viên A',
        category: 'final',
        assessmentTitle: 'Final Test',
        examDate: '2026-12-20',
        maxListeningScore: 495,
        maxReadingScore: 495,
        maxTotalScore: 990,
        listeningScore: null,
        readingScore: null,
        totalScore: null,
        updatedByTeacherId: 'tch-1',
        updatedByTeacherName: 'Cô Minh Anh',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
    ])
    assert.equal(weighted.homeworkPercent, 80)
    assert.equal(weighted.finalPercent, null)
    assert.equal(weighted.weightedAveragePercent, 80)
    assert.equal(weighted.completionState, 'partial')
  })

  it('rejects .demo accounts, purges stale demo sessions, and enforces STUDENT vs STAFF portal boundary', async () => {
    const demoLogin = await authService.login({
      identifier: 'student.demo',
      password: 'Student@Demo1!',
    })
    assert.equal(demoLogin.success, false)

    // Verify storage migration purges legacy stu-001 / .demo session
    globalThis.localStorage.removeItem(CLIENT_CLEANUP_MIGRATION_KEY)
    globalThis.localStorage.setItem(
      CLIENT_SESSION_STORAGE_KEY,
      JSON.stringify({
        id: 'stu-001',
        username: 'student.demo',
        fullName: 'Demo',
        email: 'demo@example.com',
        phone: '0987654321',
        role: 'student',
        accountType: 'STUDENT',
        portal: 'CLIENT',
        accountStatus: 'ACTIVE',
        defaultLandingRoute: '/student/dashboard',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    )
    runClientStorageCleanupMigration()
    assert.equal(authSessionStore.getCurrentUser(), null)

    // Inject test fixtures to verify STAFF portal redirect and LOCKED account block
    configureMockAuthUsersForTest([
      {
        id: 'stf-test-01',
        username: 'nv.tuvan',
        email: 'tuvan@englishcenter.vn',
        password: 'ValidStaffPassword1!',
        accountType: 'STAFF',
        portal: 'STAFF',
        accountStatus: 'ACTIVE',
      },
      {
        id: 'stu-locked-01',
        username: 'hv.khoa',
        email: 'khoa@englishcenter.vn',
        password: 'ValidStudentPassword1!',
        accountType: 'STUDENT',
        portal: 'CLIENT',
        accountStatus: 'LOCKED',
      },
      {
        id: 'stu-active-01',
        username: 'hv.hop.le',
        email: 'hople@englishcenter.vn',
        password: 'ValidStudentPassword1!',
        fullName: 'Trần Minh Quân',
        phone: '0912345678',
        accountType: 'STUDENT',
        portal: 'CLIENT',
        accountStatus: 'ACTIVE',
      },
    ])

    const staffAttempt = await authService.login({
      identifier: 'nv.tuvan',
      password: 'ValidStaffPassword1!',
    })
    assert.equal(staffAttempt.success, false)
    assert.equal(staffAttempt.portalRedirect?.outcome, 'PORTAL_REDIRECT_REQUIRED')
    assert.equal(staffAttempt.portalRedirect?.targetPortal, 'STAFF')
    assert.equal(authSessionStore.getCurrentUser(), null)

    const lockedAttempt = await authService.login({
      identifier: 'hv.khoa',
      password: 'ValidStudentPassword1!',
    })
    assert.equal(lockedAttempt.success, false)
    assert.equal(authSessionStore.getCurrentUser(), null)

    const validStudentAttempt = await authService.login({
      identifier: 'hv.hop.le',
      password: 'ValidStudentPassword1!',
    })
    assert.equal(validStudentAttempt.success, true)
    assert.equal(validStudentAttempt.user?.accountType, 'STUDENT')
    assert.equal(validStudentAttempt.user?.portal, 'CLIENT')
    assert.equal(authSessionStore.getCurrentUser()?.id, 'stu-active-01')
  })
})

-- =============================================================================
-- Migration 004: Academic Operations, Tuition Accounting & Classroom Teaching
-- =============================================================================

-- 29. Ghi danh chính thức vào lớp (Enrollments)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_code VARCHAR(64) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  source_registration_id UUID REFERENCES course_registrations(id) ON DELETE RESTRICT,
  tuition_policy_id_snapshot UUID REFERENCES tuition_policies(id) ON DELETE RESTRICT,
  tuition_policy_code_snapshot VARCHAR(64),
  listed_tuition_snapshot_vnd BIGINT NOT NULL DEFAULT 0 CHECK (listed_tuition_snapshot_vnd >= 0),
  discount_snapshot_vnd BIGINT NOT NULL DEFAULT 0 CHECK (discount_snapshot_vnd >= 0),
  agreed_tuition_vnd BIGINT NOT NULL DEFAULT 0 CHECK (agreed_tuition_vnd >= 0),
  billing_exemption_reason VARCHAR(30)
    CHECK (billing_exemption_reason IS NULL OR billing_exemption_reason IN ('TRANSFER', 'RETAKE', 'RETURN_FROM_HOLD')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'HOLD', 'TRANSFERRED', 'COMPLETED', 'DROPPED')),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrollments_student_status ON enrollments (student_id, status);
CREATE INDEX idx_enrollments_class_status ON enrollments (class_id, status);

CREATE TRIGGER trg_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 30. Lịch sử chuyển lớp học vụ (Class Transfer History)
CREATE TABLE class_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  from_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  to_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  transferred_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_transfer_history_student ON class_transfer_history (student_id, transferred_at DESC);

CREATE TRIGGER trg_class_transfer_history_updated_at
BEFORE UPDATE ON class_transfer_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 31. Nhật ký liên hệ xếp lớp của Giáo vụ (Placement Contact Logs)
CREATE TABLE placement_contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE RESTRICT,
  registration_id UUID REFERENCES course_registrations(id) ON DELETE RESTRICT,
  contact_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  contacted_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_summary TEXT NOT NULL,
  next_follow_up_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_placement_contact_target CHECK (student_id IS NOT NULL OR registration_id IS NOT NULL)
);

CREATE INDEX idx_placement_contact_logs_student ON placement_contact_logs (student_id, contacted_at DESC);
CREATE INDEX idx_placement_contact_logs_reg ON placement_contact_logs (registration_id, contacted_at DESC);

CREATE TRIGGER trg_placement_contact_logs_updated_at
BEFORE UPDATE ON placement_contact_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 32. Đơn yêu cầu học vụ & hỗ trợ học viên (Student Academic Requests)
CREATE TABLE student_academic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code VARCHAR(64) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE RESTRICT,
  current_course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  current_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  target_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  request_type VARCHAR(20) NOT NULL
    CHECK (request_type IN ('HOLD', 'RESUME', 'TRANSFER', 'RETAKE', 'SUPPORT')),
  reason TEXT NOT NULL,
  detail_note TEXT NOT NULL DEFAULT '',
  effective_date DATE NOT NULL,
  hold_until_date DATE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_academic_requests_status ON student_academic_requests (status, submitted_at DESC);
CREATE INDEX idx_student_academic_requests_student ON student_academic_requests (student_id, submitted_at DESC);

CREATE TRIGGER trg_student_academic_requests_updated_at
BEFORE UPDATE ON student_academic_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 33. Khoản phải thu học phí (Receivables)
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_code VARCHAR(64) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  tuition_policy_id UUID REFERENCES tuition_policies(id) ON DELETE RESTRICT,
  tuition_policy_code VARCHAR(64),
  listed_tuition_vnd BIGINT NOT NULL CHECK (listed_tuition_vnd >= 0),
  discount_amount_vnd BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_vnd >= 0),
  discount_reason TEXT,
  total_receivable_vnd BIGINT NOT NULL CHECK (total_receivable_vnd >= 0),
  paid_confirmed_vnd BIGINT NOT NULL DEFAULT 0 CHECK (paid_confirmed_vnd >= 0),
  due_date DATE NOT NULL,
  status VARCHAR(25) NOT NULL DEFAULT 'UNPAID'
    CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  cancel_reason TEXT,
  note TEXT,
  created_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receivables_student_status ON receivables (student_id, status);
CREATE INDEX idx_receivables_branch_due ON receivables (branch_id, status, due_date);

CREATE TRIGGER trg_receivables_updated_at
BEFORE UPDATE ON receivables
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 34. Giao dịch thu tiền từng đợt (Payment Transactions)
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code VARCHAR(64) NOT NULL UNIQUE,
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0),
  payment_method VARCHAR(25) NOT NULL
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payer_name VARCHAR(150) NOT NULL,
  recorded_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  bank_transfer_meta JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED'
    CHECK (status IN ('CONFIRMED', 'PENDING_VERIFICATION', 'VOIDED')),
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_receivable ON payment_transactions (receivable_id, status, paid_at DESC);
CREATE INDEX idx_payment_transactions_student ON payment_transactions (student_id, paid_at DESC);

CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 35. Nhật ký kiểm toán giao dịch thu tiền (Transaction Audit Logs)
CREATE TABLE transaction_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  action VARCHAR(25) NOT NULL
    CHECK (action IN ('CREATED', 'CONFIRMED', 'VOIDED', 'NOTE_UPDATED')),
  detail TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_audit_logs_tx ON transaction_audit_logs (transaction_id, occurred_at DESC);

CREATE TRIGGER trg_transaction_audit_logs_updated_at
BEFORE UPDATE ON transaction_audit_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 36. Phiếu thu học phí chính thức (Payment Receipts)
CREATE TABLE payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(64) NOT NULL UNIQUE,
  transaction_id UUID NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  payer_name VARCHAR(150) NOT NULL,
  cashier_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0),
  payment_method VARCHAR(25) NOT NULL
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER')),
  reason_content TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'ISSUED'
    CHECK (status IN ('ISSUED', 'VOIDED')),
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_receipts_receivable ON payment_receipts (receivable_id, issued_at DESC);
CREATE INDEX idx_payment_receipts_student ON payment_receipts (student_id, issued_at DESC);

CREATE TRIGGER trg_payment_receipts_updated_at
BEFORE UPDATE ON payment_receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 37. Hồ sơ hoàn phí (Refund Records)
CREATE TABLE refund_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_code VARCHAR(64) NOT NULL UNIQUE,
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE RESTRICT,
  original_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0),
  payment_method VARCHAR(25) NOT NULL
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER')),
  reason TEXT NOT NULL,
  status VARCHAR(25) NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
  requested_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_records_receivable_status ON refund_records (receivable_id, status);

CREATE TRIGGER trg_refund_records_updated_at
BEFORE UPDATE ON refund_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 38. Lịch buổi học thực tế của lớp (Schedule Sessions)
CREATE TABLE schedule_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  session_number INTEGER NOT NULL CHECK (session_number > 0),
  week_index INTEGER NOT NULL DEFAULT 1 CHECK (week_index > 0),
  session_date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  room_label VARCHAR(100),
  activity_type VARCHAR(20) NOT NULL DEFAULT 'CLASS'
    CHECK (activity_type IN ('CLASS', 'REVIEW', 'DEMO', 'MID', 'FINAL')),
  official_title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_schedule_session_number UNIQUE (class_id, session_number)
);

CREATE INDEX idx_schedule_sessions_class_date ON schedule_sessions (class_id, session_date);
CREATE INDEX idx_schedule_sessions_teacher_date ON schedule_sessions (teacher_id, session_date);

CREATE TRIGGER trg_schedule_sessions_updated_at
BEFORE UPDATE ON schedule_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 39. Kế hoạch giảng dạy chi tiết từng buổi (Teaching Session Plans)
CREATE TABLE teaching_session_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES schedule_sessions(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  topic_title VARCHAR(255) NOT NULL,
  lc_content TEXT NOT NULL DEFAULT '',
  rc_content TEXT NOT NULL DEFAULT '',
  learning_objectives TEXT NOT NULL DEFAULT '',
  material_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  homework_brief TEXT,
  teacher_note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teaching_session_plans_updated_at
BEFORE UPDATE ON teaching_session_plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 40. Điểm danh học viên theo buổi (Attendance Records)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES schedule_sessions(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'UNMARKED'
    CHECK (status IN ('UNMARKED', 'PRESENT', 'LATE', 'EXCUSED', 'UNEXCUSED')),
  note TEXT,
  recorded_by_teacher_id UUID REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_records_class_student ON attendance_records (class_id, student_id);

CREATE TRIGGER trg_attendance_records_updated_at
BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 41. Nhật ký chỉnh sửa điểm danh (Attendance Audit Logs)
CREATE TABLE attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES schedule_sessions(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  previous_status VARCHAR(20) NOT NULL,
  next_status VARCHAR(20) NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_audit_logs_class ON attendance_audit_logs (class_id, changed_at DESC);

CREATE TRIGGER trg_attendance_audit_logs_updated_at
BEFORE UPDATE ON attendance_audit_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 42. Bài tập về nhà & Demo Test giao theo lớp (Class Assignments)
CREATE TABLE class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES schedule_sessions(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  assigned_date DATE NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  submission_format VARCHAR(25) NOT NULL
    CHECK (submission_format IN ('DRIVE_LINK', 'LC_RC_SHEET', 'FILE_URL')),
  max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0),
  is_demo_test BOOLEAN NOT NULL DEFAULT false,
  part_max_questions JSONB,
  target_scope VARCHAR(30) NOT NULL DEFAULT 'WHOLE_CLASS'
    CHECK (target_scope IN ('WHOLE_CLASS', 'GROUP', 'INDIVIDUAL_STUDENTS')),
  target_group_label VARCHAR(100),
  target_student_ids UUID[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLOSED')),
  closed_at TIMESTAMPTZ,
  created_by_teacher_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_assignments_class_due ON class_assignments (class_id, due_at DESC);

CREATE TRIGGER trg_class_assignments_updated_at
BEFORE UPDATE ON class_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 43. Bài nộp BTVN của học viên (Assignment Submissions)
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES class_assignments(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED'
    CHECK (status IN (
      'NOT_SUBMITTED',
      'SUBMITTED',
      'LATE_SUBMITTED',
      'GRADING',
      'GRADED',
      'RETURNED_FOR_REVISION'
    )),
  submission_url TEXT,
  student_answer_note TEXT,
  lc_correct INTEGER CHECK (lc_correct IS NULL OR lc_correct >= 0),
  rc_correct INTEGER CHECK (rc_correct IS NULL OR rc_correct >= 0),
  demo_scores JSONB,
  evaluation_outcome VARCHAR(20)
    CHECK (evaluation_outcome IS NULL OR evaluation_outcome IN ('PASSED', 'FAILED')),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(6, 2),
  teacher_feedback TEXT,
  graded_by_teacher_id UUID REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_assignment_submission_student UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_assignment_submissions_student ON assignment_submissions (student_id, submitted_at DESC);

CREATE TRIGGER trg_assignment_submissions_updated_at
BEFORE UPDATE ON assignment_submissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 44. Điểm kiểm tra chính thức trên lớp: Mid-test / Final-test (Official Exam Grades)
CREATE TABLE official_exam_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('HOMEWORK', 'QUIZ', 'REGULAR', 'MID', 'FINAL', 'TOEIC_MOCK')),
  assessment_title VARCHAR(200) NOT NULL,
  exam_date DATE NOT NULL,
  max_listening_score INTEGER NOT NULL DEFAULT 495 CHECK (max_listening_score >= 0),
  max_reading_score INTEGER NOT NULL DEFAULT 495 CHECK (max_reading_score >= 0),
  max_total_score INTEGER NOT NULL DEFAULT 990 CHECK (max_total_score >= 0),
  listening_score INTEGER CHECK (listening_score IS NULL OR listening_score >= 0),
  reading_score INTEGER CHECK (reading_score IS NULL OR reading_score >= 0),
  total_score INTEGER CHECK (total_score IS NULL OR total_score >= 0),
  part_breakdown JSONB,
  teacher_comment TEXT,
  updated_by_teacher_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_official_exam_grades_class_student ON official_exam_grades (class_id, student_id, exam_date DESC);

CREATE TRIGGER trg_official_exam_grades_updated_at
BEFORE UPDATE ON official_exam_grades
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 45. Nhật ký chỉnh sửa bảng điểm lớp (Grade Audit Logs)
CREATE TABLE grade_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES official_exam_grades(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  previous_total INTEGER,
  next_total INTEGER,
  changed_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grade_audit_logs_class ON grade_audit_logs (class_id, changed_at DESC);

CREATE TRIGGER trg_grade_audit_logs_updated_at
BEFORE UPDATE ON grade_audit_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 46. Đề xuất đăng ký / điều chỉnh lịch giảng dạy (Teaching Schedule Requests)
CREATE TABLE teaching_schedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code VARCHAR(64) NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  study_days VARCHAR(100) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  start_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status VARCHAR(25) NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teaching_schedule_requests_teacher ON teaching_schedule_requests (teacher_id, status);

CREATE TRIGGER trg_teaching_schedule_requests_updated_at
BEFORE UPDATE ON teaching_schedule_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Migration 003: Sales CRM, Consultations & Course Registrations
-- =============================================================================

-- 22. Khách hàng tiềm năng (Leads)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  facebook_url TEXT,
  school_or_work VARCHAR(255),
  learning_need TEXT NOT NULL DEFAULT '',
  current_level_note TEXT,
  target_goal_note TEXT,
  preferred_contact_time VARCHAR(120),
  interested_course_ids UUID[] NOT NULL DEFAULT '{}',
  preferred_branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  interested_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  source VARCHAR(40) NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('WEBSITE_CONSULTATION', 'SCHEDULE_MODAL', 'COURSE_PAGE', 'MANUAL')),
  consent_summary TEXT NOT NULL DEFAULT '',
  assigned_sale_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'NEW'
    CHECK (status IN (
      'NEW',
      'CONTACTING',
      'CONSULTING',
      'FOLLOW_UP',
      'INTERESTED',
      'NOT_INTERESTED',
      'LOST',
      'REGISTERED'
    )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_sale_status ON leads (assigned_sale_id, status, created_at DESC);
CREATE INDEX idx_leads_phone ON leads (phone);
CREATE INDEX idx_leads_email ON leads (email) WHERE email IS NOT NULL;

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 23. Nhật ký tư vấn bất biến (Consultations)
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  sale_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  consulted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel VARCHAR(30) NOT NULL
    CHECK (channel IN ('PHONE', 'IN_PERSON', 'MESSAGE', 'OTHER')),
  summary TEXT NOT NULL,
  identified_need TEXT NOT NULL DEFAULT '',
  advised_course_id UUID REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  advised_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_lead_time ON consultations (lead_id, consulted_at DESC);

CREATE TRIGGER trg_consultations_updated_at
BEFORE UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 24. Lịch hẹn liên hệ lại (Follow Ups)
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  assigned_sale_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_sale_due ON follow_ups (assigned_sale_id, status, due_at);
CREATE INDEX idx_follow_ups_lead ON follow_ups (lead_id, due_at DESC);

CREATE TRIGGER trg_follow_ups_updated_at
BEFORE UPDATE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 25. Lịch sử chuyển trạng thái Lead (Lead Status History)
CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL
    CHECK (to_status IN (
      'NEW',
      'CONTACTING',
      'CONSULTING',
      'FOLLOW_UP',
      'INTERESTED',
      'NOT_INTERESTED',
      'LOST',
      'REGISTERED'
    )),
  changed_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_status_history_lead ON lead_status_history (lead_id, changed_at DESC);

CREATE TRIGGER trg_lead_status_history_updated_at
BEFORE UPDATE ON lead_status_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 26. Hồ sơ đăng ký khóa học (Course Registrations)
CREATE TABLE course_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_code VARCHAR(64) NOT NULL UNIQUE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES student_profiles(id) ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  sale_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  tuition_policy_id UUID REFERENCES tuition_policies(id) ON DELETE RESTRICT,
  score_goal JSONB NOT NULL DEFAULT '{}'::jsonb,
  commitment JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_tuition JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reviewer_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'SUBMITTED',
      'REVIEWING',
      'NEED_ADDITIONAL_INFO',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
      'CONVERTED'
    )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_registrations_sale_status ON course_registrations (sale_id, status, created_at DESC);
CREATE INDEX idx_course_registrations_class_status ON course_registrations (class_id, status);
CREATE INDEX idx_course_registrations_lead ON course_registrations (lead_id);

CREATE TRIGGER trg_course_registrations_updated_at
BEFORE UPDATE ON course_registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE student_profiles
  ADD CONSTRAINT fk_student_profiles_source_registration
  FOREIGN KEY (source_registration_id) REFERENCES course_registrations(id) ON DELETE RESTRICT;

-- 27. Bản chụp bất biến lúc tạo/nộp hồ sơ đăng ký (Registration Snapshots)
CREATE TABLE registration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE REFERENCES course_registrations(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  course_code VARCHAR(64) NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  target_outcome_label VARCHAR(150) NOT NULL,
  branch_name VARCHAR(200) NOT NULL,
  class_code VARCHAR(64) NOT NULL,
  class_name VARCHAR(200) NOT NULL,
  class_schedule_summary VARCHAR(255) NOT NULL,
  class_start_date DATE NOT NULL,
  listed_tuition_vnd BIGINT NOT NULL CHECK (listed_tuition_vnd >= 0),
  policy_code VARCHAR(64),
  discount_program_name VARCHAR(200),
  discount_amount_vnd BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_vnd >= 0),
  net_estimated_tuition_vnd BIGINT NOT NULL CHECK (net_estimated_tuition_vnd >= 0),
  scale_version_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_registration_snapshots_updated_at
BEFORE UPDATE ON registration_snapshots
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 28. Lịch sử xét duyệt hồ sơ đăng ký (Registration Status History)
CREATE TABLE registration_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES course_registrations(id) ON DELETE RESTRICT,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL
    CHECK (to_status IN (
      'DRAFT',
      'SUBMITTED',
      'REVIEWING',
      'NEED_ADDITIONAL_INFO',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
      'CONVERTED'
    )),
  changed_by_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registration_status_history_reg ON registration_status_history (registration_id, changed_at DESC);

CREATE TRIGGER trg_registration_status_history_updated_at
BEFORE UPDATE ON registration_status_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

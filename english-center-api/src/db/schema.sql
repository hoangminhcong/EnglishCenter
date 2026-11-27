-- =============================================================================
-- LIVE DATABASE SCHEMA (Single Source of Truth)
-- Đồng bộ 100% với: src/db/migrations/001..005
-- Tổng cộng: 64 bảng nghiệp vụ & kiểm toán phủ kín toàn hệ thống English Center
-- =============================================================================

-- =============================================================================
-- Migration 001: Core Infrastructure, Auth, RBAC, Branches & Course Catalog
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Hệ thống cơ sở (Branches)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  short_label VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  working_hours VARCHAR(255),
  lat NUMERIC(9, 6) NOT NULL DEFAULT 0,
  lng NUMERIC(9, 6) NOT NULL DEFAULT 0,
  map_url TEXT,
  image_url TEXT,
  study_mode VARCHAR(20) NOT NULL DEFAULT 'OFFLINE'
    CHECK (study_mode IN ('ONLINE', 'OFFLINE')),
  show_on_map BOOLEAN NOT NULL DEFAULT true,
  show_in_schedule BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_active_order ON branches (is_active, display_order);

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Danh mục phòng ban nội bộ (Departments)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Vai trò hệ thống (Roles)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE
    CHECK (code IN ('ADMIN', 'SALES', 'ACCOUNTANT', 'ACADEMIC', 'TEACHER', 'STUDENT')),
  name VARCHAR(120) NOT NULL,
  portal_type VARCHAR(20) NOT NULL
    CHECK (portal_type IN ('STAFF', 'CLIENT')),
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Danh mục quyền chi tiết module.action (Permissions)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(60) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_module ON permissions (module);

CREATE TRIGGER trg_permissions_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Gán quyền vào vai trò (Role Permissions)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);

CREATE TRIGGER trg_role_permissions_updated_at
BEFORE UPDATE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Tài khoản đăng nhập hợp nhất (User Accounts)
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL
    CHECK (account_type IN ('STAFF', 'STUDENT')),
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN (
      'PENDING_ACTIVATION',
      'ACTIVE',
      'LOCKED',
      'DISABLED',
      'PASSWORD_RESET_REQUIRED'
    )),
  provisioning_method VARCHAR(30) NOT NULL DEFAULT 'SELF_REGISTER'
    CHECK (provisioning_method IN ('INVITE_LINK', 'TEMPORARY_PASSWORD', 'SELF_REGISTER')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  invitation_sent_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_accounts_type_status ON user_accounts (account_type, status);

CREATE TRIGGER trg_user_accounts_updated_at
BEFORE UPDATE ON user_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Phiên đăng nhập & Token thách thức bảo mật (Auth Sessions)
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  token_type VARCHAR(30) NOT NULL
    CHECK (token_type IN ('SESSION', 'REFRESH', 'PASSWORD_CHALLENGE', 'PASSWORD_RESET', 'INVITE')),
  ip_address VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_sessions_user_active ON auth_sessions (user_id, token_type, expires_at)
  WHERE revoked_at IS NULL;

CREATE TRIGGER trg_auth_sessions_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Phân công vai trò & Phạm vi dữ liệu DataScope (User Role Assignments)
CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'OWN'
    CHECK (scope_type IN ('OWN', 'TEAM', 'BRANCH', 'ALL')),
  scope_ids UUID[] NOT NULL DEFAULT '{}',
  assigned_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_role_assignment UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_role_assignments_user ON user_role_assignments (user_id) WHERE is_active = true;

CREATE TRIGGER trg_user_role_assignments_updated_at
BEFORE UPDATE ON user_role_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. Nhật ký kiểm toán tài khoản & phân quyền (Account Audit Logs)
CREATE TABLE account_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
  action_type VARCHAR(50) NOT NULL
    CHECK (action_type IN (
      'ACCOUNT_CREATED',
      'PROFILE_UPDATED',
      'ROLE_UPDATED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'ACCOUNT_DISABLED',
      'INVITATION_RESENT',
      'PASSWORD_RESET_REQUESTED',
      'FIRST_LOGIN_PASSWORD_CHANGED',
      'OWN_PASSWORD_CHANGED',
      'OWN_PROFILE_UPDATED'
    )),
  previous_summary TEXT,
  next_summary TEXT NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_audit_logs_target ON account_audit_logs (target_user_id, occurred_at DESC);

CREATE TRIGGER trg_account_audit_logs_updated_at
BEFORE UPDATE ON account_audit_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. Hồ sơ nhân sự & giảng viên (Employee Profiles)
CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE RESTRICT,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  profile_type VARCHAR(20) NOT NULL
    CHECK (profile_type IN ('EMPLOYEE', 'TEACHER')),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  job_title VARCHAR(150),
  verified_toeic_score INTEGER CHECK (verified_toeic_score IS NULL OR (verified_toeic_score >= 0 AND verified_toeic_score <= 990)),
  specializations TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_profiles_branch_type ON employee_profiles (branch_id, profile_type, status);

CREATE TRIGGER trg_employee_profiles_updated_at
BEFORE UPDATE ON employee_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Phiên bản thang điểm quy đổi TOEIC (Score Scale Versions)
CREATE TABLE score_scale_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  skill_category VARCHAR(30) NOT NULL DEFAULT 'LISTENING_READING'
    CHECK (skill_category IN ('LISTENING_READING', 'SPEAKING', 'WRITING', 'SPEAKING_WRITING')),
  conversion_table JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_score_scale_versions_updated_at
BEFORE UPDATE ON score_scale_versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 12. Mốc mục tiêu đầu ra TOEIC (TOEIC Milestones)
CREATE TABLE toeic_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  skill_category VARCHAR(30) NOT NULL DEFAULT 'LISTENING_READING'
    CHECK (skill_category IN ('LISTENING_READING', 'SPEAKING', 'WRITING', 'SPEAKING_WRITING')),
  min_score INTEGER NOT NULL DEFAULT 0 CHECK (min_score >= 0),
  target_score INTEGER NOT NULL CHECK (target_score >= 0),
  scale_version_id UUID REFERENCES score_scale_versions(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_toeic_milestones_updated_at
BEFORE UPDATE ON toeic_milestones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. Danh mục khóa học (Course Catalogs)
CREATE TABLE course_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  schedule_title VARCHAR(200) NOT NULL DEFAULT '',
  schedule_subtitle VARCHAR(255) NOT NULL DEFAULT '',
  target_score_label VARCHAR(120) NOT NULL,
  milestone_id UUID REFERENCES toeic_milestones(id) ON DELETE RESTRICT,
  skill_category VARCHAR(30) NOT NULL DEFAULT 'LISTENING_READING'
    CHECK (skill_category IN ('LISTENING_READING', 'SPEAKING', 'WRITING', 'SPEAKING_WRITING')),
  level_label VARCHAR(100),
  short_description TEXT,
  description TEXT NOT NULL DEFAULT '',
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  banner_image_url TEXT,
  listed_tuition_vnd BIGINT NOT NULL DEFAULT 0 CHECK (listed_tuition_vnd >= 0),
  duration_label VARCHAR(120),
  sessions_count INTEGER CHECK (sessions_count IS NULL OR sessions_count > 0),
  introduction JSONB,
  benefits JSONB,
  expected_outcomes JSONB,
  teaching_method JSONB,
  curriculum JSONB,
  gallery JSONB,
  testimonials JSONB,
  faqs JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_catalogs_status_order ON course_catalogs (status, display_order);

CREATE TRIGGER trg_course_catalogs_updated_at
BEFORE UPDATE ON course_catalogs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. Chính sách học phí & ưu đãi theo hiệu lực thời gian (Tuition Policies)
CREATE TABLE tuition_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code VARCHAR(64) NOT NULL UNIQUE,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  listed_tuition_vnd BIGINT NOT NULL CHECK (listed_tuition_vnd >= 0),
  discount_program_name VARCHAR(200),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount_vnd BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_vnd >= 0),
  net_tuition_vnd BIGINT NOT NULL CHECK (net_tuition_vnd >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED')),
  note TEXT,
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tuition_policy_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_tuition_policies_course_effective ON tuition_policies (course_id, status, effective_from DESC);

CREATE TRIGGER trg_tuition_policies_updated_at
BEFORE UPDATE ON tuition_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 15. Phiên bản khung chương trình giảng dạy theo buổi (Course Syllabus Versions)
CREATE TABLE course_syllabus_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  version_code VARCHAR(64) NOT NULL,
  effective_from DATE NOT NULL,
  summary_note TEXT NOT NULL DEFAULT '',
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  updated_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_course_syllabus_version UNIQUE (course_id, version_code)
);

CREATE TRIGGER trg_course_syllabus_versions_updated_at
BEFORE UPDATE ON course_syllabus_versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Migration 002: Public CMS, Center Classes & Student Profiles
-- =============================================================================

-- 16. Thông tin thương hiệu & cấu hình trung tâm (Center Info - Singleton)
CREATE TABLE center_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key VARCHAR(20) NOT NULL UNIQUE DEFAULT 'DEFAULT'
    CHECK (singleton_key = 'DEFAULT'),
  name VARCHAR(200) NOT NULL,
  slogan VARCHAR(300) NOT NULL DEFAULT '',
  hotline VARCHAR(50) NOT NULL,
  hotline_href VARCHAR(80) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  working_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  fanpage_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  copyright_text VARCHAR(255) NOT NULL DEFAULT '',
  updated_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_center_info_updated_at
BEFORE UPDATE ON center_info
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 17. Tin tức, Thông báo & Bài viết chuyên môn (News Posts & Articles)
CREATE TABLE news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  category VARCHAR(60) NOT NULL,
  sub_category_tag VARCHAR(120),
  thumbnail_url TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_name VARCHAR(150) NOT NULL DEFAULT 'English Center',
  published_date DATE,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED')),
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_posts_public_list ON news_posts (status, category, published_date DESC)
  WHERE is_active = true;

CREATE TRIGGER trg_news_posts_updated_at
BEFORE UPDATE ON news_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 18. Tin tuyển dụng nhân sự & giảng viên (Job Posts)
CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  position VARCHAR(150) NOT NULL,
  employment_type VARCHAR(40) NOT NULL
    CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'COLLABORATOR')),
  salary_label VARCHAR(150) NOT NULL DEFAULT '',
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  location_label VARCHAR(255) NOT NULL,
  deadline DATE NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  description JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_posts_status_deadline ON job_posts (status, deadline DESC)
  WHERE is_active = true;

CREATE TRIGGER trg_job_posts_updated_at
BEFORE UPDATE ON job_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 19. Lớp học mở theo đợt & Lịch khai giảng (Classes)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code VARCHAR(64) NOT NULL UNIQUE,
  class_name VARCHAR(200) NOT NULL,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  syllabus_version_id UUID REFERENCES course_syllabus_versions(id) ON DELETE RESTRICT,
  study_mode VARCHAR(20) NOT NULL DEFAULT 'OFFLINE'
    CHECK (study_mode IN ('OFFLINE', 'ONLINE')),
  class_type_label VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  study_days VARCHAR(100) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  room_label VARCHAR(100),
  max_students INTEGER NOT NULL DEFAULT 25 CHECK (max_students > 0),
  enrolled_students INTEGER NOT NULL DEFAULT 0 CHECK (enrolled_students >= 0),
  registration_deadline DATE,
  is_published_on_web BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING'
    CHECK (status IN ('UPCOMING', 'OPEN', 'FULL', 'ONGOING', 'COMPLETED', 'CANCELLED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_classes_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_classes_schedule_lookup ON classes (branch_id, course_id, status, start_date);
CREATE INDEX idx_classes_teacher ON classes (teacher_id, status);

CREATE TRIGGER trg_classes_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 20. Hồ sơ học viên (Student Profiles)
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES user_accounts(id) ON DELETE RESTRICT,
  student_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  date_of_birth DATE,
  school_or_work VARCHAR(255),
  avatar_url TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  current_course_id UUID REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  current_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  entry_lc_score INTEGER NOT NULL DEFAULT 0 CHECK (entry_lc_score >= 0),
  entry_rc_score INTEGER NOT NULL DEFAULT 0 CHECK (entry_rc_score >= 0),
  entry_total_score INTEGER NOT NULL DEFAULT 0 CHECK (entry_total_score >= 0),
  goal_lc_score INTEGER NOT NULL DEFAULT 0 CHECK (goal_lc_score >= 0),
  goal_rc_score INTEGER NOT NULL DEFAULT 0 CHECK (goal_rc_score >= 0),
  goal_total_score INTEGER NOT NULL DEFAULT 0 CHECK (goal_total_score >= 0),
  commitment_summary JSONB,
  expected_start_month VARCHAR(7),
  source_registration_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'WAITING_PLACEMENT'
    CHECK (status IN ('WAITING_PLACEMENT', 'STUDYING', 'HOLD', 'COMPLETED', 'DROPPED')),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_profiles_branch_status ON student_profiles (branch_id, status);
CREATE INDEX idx_student_profiles_phone ON student_profiles (phone);
CREATE INDEX idx_student_profiles_current_class ON student_profiles (current_class_id);

CREATE TRIGGER trg_student_profiles_updated_at
BEFORE UPDATE ON student_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 21. Bảng vàng vinh danh thành tích học viên (Student Achievements)
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  student_id UUID REFERENCES student_profiles(id) ON DELETE RESTRICT,
  display_student_name VARCHAR(150) NOT NULL,
  course_id UUID NOT NULL REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  exam_year INTEGER NOT NULL CHECK (exam_year >= 2000 AND exam_year <= 2100),
  listening_score INTEGER NOT NULL CHECK (listening_score >= 0 AND listening_score <= 495),
  reading_score INTEGER NOT NULL CHECK (reading_score >= 0 AND reading_score <= 495),
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 990),
  certificate_image_url TEXT,
  share_quote TEXT NOT NULL DEFAULT '',
  public_consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_revoked_at TIMESTAMPTZ,
  published_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED')),
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_achievement_consent_required CHECK (status <> 'PUBLISHED' OR public_consent_granted = true)
);

CREATE INDEX idx_student_achievements_public ON student_achievements (status, total_score DESC, published_date DESC)
  WHERE is_active = true AND public_consent_granted = true;

CREATE TRIGGER trg_student_achievements_updated_at
BEFORE UPDATE ON student_achievements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- =============================================================================
-- Migration 005: Learning Materials, Study Zone & TOEIC Online Exam Engine
-- =============================================================================

-- 47. Kho tài liệu học tập (Learning Materials)
CREATE TABLE learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_type VARCHAR(30) NOT NULL
    CHECK (file_type IN ('PDF', 'DOCX', 'PPTX', 'XLSX', 'AUDIO', 'VIDEO', 'IMAGE', 'ZIP', 'ARTICLE')),
  file_url TEXT NOT NULL,
  file_size_label VARCHAR(50),
  thumbnail_url TEXT,
  access_scope VARCHAR(25) NOT NULL DEFAULT 'PUBLIC'
    CHECK (access_scope IN ('PUBLIC', 'ALL_STUDENTS', 'BY_COURSE', 'BY_CLASS', 'BY_GROUP')),
  course_id UUID REFERENCES course_catalogs(id) ON DELETE RESTRICT,
  class_id UUID REFERENCES classes(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_materials_scope_status ON learning_materials (access_scope, status)
  WHERE is_active = true;

CREATE TRIGGER trg_learning_materials_updated_at
BEFORE UPDATE ON learning_materials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 48. Danh mục cố định Khu tự học Study Zone (Study Zone Categories - 3 locked slugs)
CREATE TABLE study_zone_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(30) NOT NULL UNIQUE
    CHECK (slug IN ('grammar', 'vocabulary', 'listening')),
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_study_zone_categories_updated_at
BEFORE UPDATE ON study_zone_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 49. Chủ đề tự học Study Zone (Study Zone Topics)
CREATE TABLE study_zone_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES study_zone_categories(id) ON DELETE RESTRICT,
  slug VARCHAR(150) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  level_label VARCHAR(80) NOT NULL,
  lessons_count INTEGER,
  words_count INTEGER,
  duration_label VARCHAR(80),
  listening_type VARCHAR(100),
  order_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_zone_topics_cat_order ON study_zone_topics (category_id, status, order_number);

CREATE TRIGGER trg_study_zone_topics_updated_at
BEFORE UPDATE ON study_zone_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 50. Chủ điểm con Study Zone (Study Zone Sub Topics)
CREATE TABLE study_zone_sub_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES study_zone_topics(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_zone_sub_topics_topic ON study_zone_sub_topics (topic_id, display_order);

CREATE TRIGGER trg_study_zone_sub_topics_updated_at
BEFORE UPDATE ON study_zone_sub_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 51. Bài luyện tập Study Zone (Study Zone Exercises)
CREATE TABLE study_zone_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES study_zone_topics(id) ON DELETE RESTRICT,
  sub_topic_id UUID REFERENCES study_zone_sub_topics(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  level_label VARCHAR(80) NOT NULL,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  instructions TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_zone_exercises_topic ON study_zone_exercises (topic_id, status, display_order);

CREATE TRIGGER trg_study_zone_exercises_updated_at
BEFORE UPDATE ON study_zone_exercises
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 52. Câu hỏi hiển thị Study Zone - không chứa đáp án (Study Zone Questions)
CREATE TABLE study_zone_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES study_zone_exercises(id) ON DELETE RESTRICT,
  question_text TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER CHECK (audio_duration_seconds IS NULL OR audio_duration_seconds >= 0),
  image_url TEXT,
  image_alt VARCHAR(255),
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty_label VARCHAR(80),
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_zone_questions_exercise ON study_zone_questions (exercise_id, display_order);

CREATE TRIGGER trg_study_zone_questions_updated_at
BEFORE UPDATE ON study_zone_questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 53. Đáp án & lời giải tách riêng Study Zone (Study Zone Answer Keys)
CREATE TABLE study_zone_answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL UNIQUE REFERENCES study_zone_questions(id) ON DELETE RESTRICT,
  correct_option_id VARCHAR(64) NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  audio_transcript TEXT,
  audio_translation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_study_zone_answer_keys_updated_at
BEFORE UPDATE ON study_zone_answer_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 54. Lịch sử nộp bài luyện tập Study Zone (Study Zone Attempts)
CREATE TABLE study_zone_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES study_zone_exercises(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  score_ten NUMERIC(4, 2) NOT NULL DEFAULT 0,
  accuracy_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_zone_attempts_user ON study_zone_attempts (user_id, submitted_at DESC);

CREATE TRIGGER trg_study_zone_attempts_updated_at
BEFORE UPDATE ON study_zone_attempts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 55. Đầu mục đề thi TOEIC Online (Test Definitions)
CREATE TABLE test_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  collection_group VARCHAR(120) NOT NULL DEFAULT '',
  skill_category VARCHAR(30) NOT NULL DEFAULT 'LISTENING_READING'
    CHECK (skill_category IN ('LISTENING_READING', 'SPEAKING_WRITING')),
  test_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TEST'
    CHECK (test_type IN ('FULL_TEST', 'MINI_TEST', 'PART_PRACTICE', 'PLACEMENT_TEST')),
  difficulty_label VARCHAR(80) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  standard_total_questions INTEGER NOT NULL DEFAULT 200 CHECK (standard_total_questions > 0),
  allow_part_selection BOOLEAN NOT NULL DEFAULT true,
  available_duration_options INTEGER[] NOT NULL DEFAULT '{15,30,45,60,90,120}',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  general_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_check_audio_url TEXT,
  active_version_number INTEGER NOT NULL DEFAULT 1 CHECK (active_version_number >= 1),
  score_scale_version_id UUID REFERENCES score_scale_versions(id) ON DELETE RESTRICT,
  attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_definitions_status_group ON test_definitions (status, collection_group)
  WHERE is_active = true;

CREATE TRIGGER trg_test_definitions_updated_at
BEFORE UPDATE ON test_definitions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 56. Phiên bản bất biến của đề thi (Test Versions)
CREATE TABLE test_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES test_definitions(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  version_code VARCHAR(80) NOT NULL,
  score_scale_version_id UUID REFERENCES score_scale_versions(id) ON DELETE RESTRICT,
  total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  change_note TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at TIMESTAMPTZ,
  published_by_user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_test_version_number UNIQUE (test_id, version_number)
);

CREATE INDEX idx_test_versions_test_status ON test_versions (test_id, status, version_number DESC);

CREATE TRIGGER trg_test_versions_updated_at
BEFORE UPDATE ON test_versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 57. Cấu trúc Part 1..7 trong một phiên bản đề (Test Parts)
CREATE TABLE test_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_version_id UUID NOT NULL REFERENCES test_versions(id) ON DELETE RESTRICT,
  part_number SMALLINT NOT NULL CHECK (part_number BETWEEN 1 AND 7),
  section VARCHAR(20) NOT NULL
    CHECK (section IN ('LISTENING', 'READING')),
  title VARCHAR(100) NOT NULL,
  english_title VARCHAR(150) NOT NULL,
  vietnamese_title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content_types_label VARCHAR(200) NOT NULL DEFAULT '',
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  standard_toeic_count INTEGER NOT NULL DEFAULT 0 CHECK (standard_toeic_count >= 0),
  suggested_minutes INTEGER NOT NULL DEFAULT 0 CHECK (suggested_minutes >= 0),
  grouped_mode BOOLEAN NOT NULL DEFAULT false,
  allow_standalone_selection BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_test_part_per_version UNIQUE (test_version_id, part_number)
);

CREATE TRIGGER trg_test_parts_updated_at
BEFORE UPDATE ON test_parts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 58. Cụm ngữ liệu / hội thoại / đoạn văn dùng chung (Question Groups)
CREATE TABLE question_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_version_id UUID NOT NULL REFERENCES test_versions(id) ON DELETE RESTRICT,
  test_part_id UUID NOT NULL REFERENCES test_parts(id) ON DELETE RESTRICT,
  part_number SMALLINT NOT NULL CHECK (part_number BETWEEN 1 AND 7),
  group_title VARCHAR(255),
  audio_group_key VARCHAR(100),
  passage_title VARCHAR(255),
  passage_text TEXT,
  passages JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_url TEXT,
  audio_duration_seconds INTEGER CHECK (audio_duration_seconds IS NULL OR audio_duration_seconds >= 0),
  image_url TEXT,
  image_alt VARCHAR(255),
  stimulus_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_groups_version_part ON question_groups (test_version_id, part_number, display_order);

CREATE TRIGGER trg_question_groups_updated_at
BEFORE UPDATE ON question_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 59. Câu hỏi đề thi TOEIC công khai lúc làm bài (Questions - Zero Answer Key Leak)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_version_id UUID NOT NULL REFERENCES test_versions(id) ON DELETE RESTRICT,
  question_group_id UUID NOT NULL REFERENCES question_groups(id) ON DELETE RESTRICT,
  part_number SMALLINT NOT NULL CHECK (part_number BETWEEN 1 AND 7),
  question_number INTEGER NOT NULL CHECK (question_number > 0),
  question_text TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER CHECK (audio_duration_seconds IS NULL OR audio_duration_seconds >= 0),
  image_url TEXT,
  image_alt VARCHAR(255),
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_number_per_version UNIQUE (test_version_id, question_number)
);

CREATE INDEX idx_questions_group_order ON questions (question_group_id, display_order);

CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 60. Phương án lựa chọn A/B/C/D (Question Options)
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  option_label CHAR(1) NOT NULL
    CHECK (option_label IN ('A', 'B', 'C', 'D')),
  option_text TEXT,
  image_url TEXT,
  audio_url TEXT,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_option_label UNIQUE (question_id, option_label)
);

CREATE TRIGGER trg_question_options_updated_at
BEFORE UPDATE ON question_options
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 61. Đáp án chuẩn & giải thích bảo mật phía Server (Test Question Answer Keys)
CREATE TABLE test_question_answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE RESTRICT,
  correct_option_id UUID NOT NULL REFERENCES question_options(id) ON DELETE RESTRICT,
  correct_label CHAR(1) NOT NULL
    CHECK (correct_label IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL DEFAULT '',
  transcript TEXT,
  translation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_test_question_answer_keys_updated_at
BEFORE UPDATE ON test_question_answer_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 62. Lượt làm bài thi TOEIC của thí sinh (Test Attempts)
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_accounts(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES student_profiles(id) ON DELETE RESTRICT,
  test_id UUID NOT NULL REFERENCES test_definitions(id) ON DELETE RESTRICT,
  test_version_id UUID NOT NULL REFERENCES test_versions(id) ON DELETE RESTRICT,
  practice_mode VARCHAR(20) NOT NULL DEFAULT 'FULL'
    CHECK (practice_mode IN ('FULL', 'CUSTOM_PARTS')),
  selected_parts SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  selected_duration_minutes INTEGER NOT NULL CHECK (selected_duration_minutes > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL,
  timer_paused_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'DISCARDED')),
  flagged_question_ids UUID[] NOT NULL DEFAULT '{}',
  audio_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  introduced_parts SMALLINT[] NOT NULL DEFAULT '{}',
  current_part_number SMALLINT NOT NULL DEFAULT 1 CHECK (current_part_number BETWEEN 1 AND 7),
  current_stage VARCHAR(20) NOT NULL DEFAULT 'PART_INTRO'
    CHECK (current_stage IN ('PART_INTRO', 'QUESTIONS')),
  current_question_id UUID REFERENCES questions(id) ON DELETE RESTRICT,
  listening_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_attempts_user_history ON test_attempts (user_id, status, started_at DESC);
CREATE INDEX idx_test_attempts_student_history ON test_attempts (student_id, status, started_at DESC);

CREATE TRIGGER trg_test_attempts_updated_at
BEFORE UPDATE ON test_attempts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 63. Đáp án chọn từng câu trong lượt thi (Student Answers)
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE RESTRICT,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_option_id UUID REFERENCES question_options(id) ON DELETE RESTRICT,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_answer_per_attempt UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_student_answers_attempt ON student_answers (attempt_id);

CREATE TRIGGER trg_student_answers_updated_at
BEFORE UPDATE ON student_answers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 64. Kết quả chấm điểm bất biến sau khi nộp bài (Test Results)
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES test_attempts(id) ON DELETE RESTRICT,
  test_version_id UUID NOT NULL REFERENCES test_versions(id) ON DELETE RESTRICT,
  score_scale_version_id UUID REFERENCES score_scale_versions(id) ON DELETE RESTRICT,
  is_full_test_score_eligible BOOLEAN NOT NULL DEFAULT false,
  actual_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (actual_duration_seconds >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  unanswered_count INTEGER NOT NULL DEFAULT 0 CHECK (unanswered_count >= 0),
  accuracy_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  listening_correct INTEGER NOT NULL DEFAULT 0 CHECK (listening_correct >= 0),
  listening_total INTEGER NOT NULL DEFAULT 0 CHECK (listening_total >= 0),
  reading_correct INTEGER NOT NULL DEFAULT 0 CHECK (reading_correct >= 0),
  reading_total INTEGER NOT NULL DEFAULT 0 CHECK (reading_total >= 0),
  converted_listening_score INTEGER CHECK (converted_listening_score IS NULL OR (converted_listening_score >= 0 AND converted_listening_score <= 495)),
  converted_reading_score INTEGER CHECK (converted_reading_score IS NULL OR (converted_reading_score >= 0 AND converted_reading_score <= 495)),
  converted_total_score INTEGER CHECK (converted_total_score IS NULL OR (converted_total_score >= 0 AND converted_total_score <= 990)),
  part_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  strong_parts SMALLINT[] NOT NULL DEFAULT '{}',
  improvement_parts SMALLINT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'EXPIRED')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_results_version ON test_results (test_version_id, submitted_at DESC);

CREATE TRIGGER trg_test_results_updated_at
BEFORE UPDATE ON test_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

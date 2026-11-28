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

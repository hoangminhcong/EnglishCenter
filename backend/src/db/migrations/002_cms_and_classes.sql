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

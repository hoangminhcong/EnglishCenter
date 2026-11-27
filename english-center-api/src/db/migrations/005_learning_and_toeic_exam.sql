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

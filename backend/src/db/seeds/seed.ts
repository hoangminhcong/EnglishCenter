import path from 'node:path';
import { pool, requireDatabaseUrl } from '../../config/db.js';
import { hashPassword } from '../../shared/utils/crypto.js';

export async function runSeed(): Promise<void> {
  requireDatabaseUrl();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed 6 fixed system roles
    const roles = [
      ['ADMIN', 'Quản trị hệ thống', 'STAFF'],
      ['SALES', 'Tư vấn tuyển sinh', 'STAFF'],
      ['ACCOUNTANT', 'Kế toán học phí', 'STAFF'],
      ['ACADEMIC', 'Giáo vụ đào tạo', 'STAFF'],
      ['TEACHER', 'Giảng viên', 'STAFF'],
      ['STUDENT', 'Học viên', 'CLIENT'],
    ] as const;

    const roleIdMap = new Map<string, string>();
    for (const [code, name, portalType] of roles) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO roles (code, name, portal_type, is_system, is_active)
         VALUES ($1, $2, $3, true, true)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true
         RETURNING id`,
        [code, name, portalType],
      );
      if (res.rows[0]) {
        roleIdMap.set(code, res.rows[0].id);
      }
    }

    // 2. Seed core branches & department
    const onlineBranchRes = await client.query<{ id: string }>(
      `INSERT INTO branches (code, name, short_label, address, district, city, phone, study_mode, display_order)
       VALUES ('toeic-online', 'Cơ sở Trực tuyến (TOEIC Online)', 'TOEIC Online', 'Học trực tuyến qua nền tảng số', 'Trực tuyến', 'Toàn quốc', '0981234567', 'ONLINE', 0)
       ON CONFLICT (code) DO UPDATE SET is_active = true
       RETURNING id`,
    );

    const haDongBranchRes = await client.query<{ id: string }>(
      `INSERT INTO branches (code, name, short_label, address, district, city, phone, study_mode, display_order)
       VALUES ('cs-ha-dong', 'Cơ sở 1 – Hà Đông', 'CS1 Hà Đông', 'Số 10 Trần Phú, Hà Đông, Hà Nội', 'Hà Đông', 'Hà Nội', '0981234568', 'OFFLINE', 1)
       ON CONFLICT (code) DO UPDATE SET is_active = true
       RETURNING id`,
    );

    const deptRes = await client.query<{ id: string }>(
      `INSERT INTO departments (code, name, description)
       VALUES ('dept-board', 'Ban Giám đốc & Quản trị', 'Quản trị vận hành trung tâm')
       ON CONFLICT (code) DO UPDATE SET is_active = true
       RETURNING id`,
    );

    const onlineBranchId = onlineBranchRes.rows[0]?.id;
    const haDongBranchId = haDongBranchRes.rows[0]?.id;
    const boardDeptId = deptRes.rows[0]?.id;
    const studentRoleId = roleIdMap.get('STUDENT');
    const adminRoleId = roleIdMap.get('ADMIN');

    if (!onlineBranchId || !haDongBranchId || !boardDeptId || !studentRoleId || !adminRoleId) {
      throw new Error('Missing seeded reference IDs');
    }

    // 3. Seed 2 Student accounts matching client-web fixtures (Password: Hocvien@123)
    const studentPasswordHash = await hashPassword('Hocvien@123');
    const seededStudents = [
      {
        username: 'hv.minhquan',
        email: 'minhquan@englishcenter.edu.vn',
        studentCode: 'HV-2026-0001',
        fullName: 'Đỗ Minh Quân',
        phone: '0988777666',
        branchId: haDongBranchId,
      },
      {
        username: 'hv.minhanh',
        email: 'minhanh@englishcenter.edu.vn',
        studentCode: 'HV-2026-0002',
        fullName: 'Nguyễn Minh Anh',
        phone: '0912345678',
        branchId: onlineBranchId,
      },
    ] as const;

    for (const stu of seededStudents) {
      const accRes = await client.query<{ id: string }>(
        `INSERT INTO user_accounts (username, email, password_hash, account_type, status, provisioning_method)
         VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', 'SELF_REGISTER')
         ON CONFLICT (username) DO UPDATE
           SET email = EXCLUDED.email,
               password_hash = EXCLUDED.password_hash,
               status = 'ACTIVE',
               is_active = true
         RETURNING id`,
        [stu.username, stu.email, studentPasswordHash],
      );
      const userId = accRes.rows[0]?.id;
      if (!userId) continue;

      await client.query(
        `INSERT INTO student_profiles (user_id, student_code, full_name, phone, email, branch_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'STUDYING')
         ON CONFLICT (user_id) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               phone = EXCLUDED.phone,
               email = EXCLUDED.email`,
        [userId, stu.studentCode, stu.fullName, stu.phone, stu.email, stu.branchId],
      );

      await client.query(
        `INSERT INTO user_role_assignments (user_id, role_id, scope_type)
         VALUES ($1, $2, 'OWN')
         ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true`,
        [userId, studentRoleId],
      );
    }

    // 4. Seed 1 Staff Admin account (Password: Staff@2026) to test Portal Redirect on Student Login
    const staffPasswordHash = await hashPassword('Staff@2026');
    const adminAccRes = await client.query<{ id: string }>(
      `INSERT INTO user_accounts (username, email, password_hash, account_type, status, provisioning_method)
       VALUES ('admin', 'admin@englishcenter.edu.vn', $1, 'STAFF', 'ACTIVE', 'TEMPORARY_PASSWORD')
       ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             status = 'ACTIVE',
             is_active = true
       RETURNING id`,
      [staffPasswordHash],
    );
    const adminUserId = adminAccRes.rows[0]?.id;
    if (adminUserId) {
      await client.query(
        `INSERT INTO employee_profiles (user_id, employee_code, full_name, phone, email, profile_type, branch_id, department_id, job_title, status)
         VALUES ($1, 'NV-ADM-01', 'Nguyễn Hoàng Nam', '0901234501', 'admin@englishcenter.edu.vn', 'EMPLOYEE', $2, $3, 'Quản trị viên hệ thống', 'ACTIVE')
         ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
        [adminUserId, haDongBranchId, boardDeptId],
      );

      await client.query(
        `INSERT INTO user_role_assignments (user_id, role_id, scope_type)
         VALUES ($1, $2, 'ALL')
         ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true`,
        [adminUserId, adminRoleId],
      );
    }

    await client.query('COMMIT');
    console.log('[db:seed] Seeded roles, branches, student accounts (hv.minhquan, hv.minhanh) & staff admin.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  try {
    await runSeed();
  } catch (err) {
    console.error('[db:seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

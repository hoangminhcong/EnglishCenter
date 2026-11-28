import { pool, type DbClient } from '../../config/db.js';
import { AppError } from '../../shared/errors/app-error.js';
import * as userRepository from './user.repository.js';
import type { CreateStudentInput, UserIdentityRecord } from './user.schema.js';

export async function findByIdentifier(
  identifier: string,
  db: DbClient = pool,
): Promise<UserIdentityRecord | null> {
  return userRepository.findIdentityByIdentifier(identifier, db);
}

export async function findById(
  userId: string,
  db: DbClient = pool,
): Promise<UserIdentityRecord | null> {
  return userRepository.findIdentityById(userId, db);
}

export async function createStudentAccount(
  input: CreateStudentInput,
  db: DbClient = pool,
): Promise<UserIdentityRecord> {
  if (await userRepository.existsByUsername(input.username, db)) {
    throw AppError.conflict('Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên đăng nhập khác.');
  }

  if (await userRepository.existsByEmail(input.email, db)) {
    throw AppError.conflict('Địa chỉ email này đã được đăng ký trong hệ thống.');
  }

  const prereqs = await userRepository.ensureDefaultStudentPrerequisites(db);
  const userId = await userRepository.insertStudentAccountBundle(input, prereqs, db);
  const created = await userRepository.findIdentityById(userId, db);

  if (!created) {
    throw new Error('Failed to load newly created student identity');
  }

  return created;
}

export async function recordLoginTimestamp(
  userId: string,
  db: DbClient = pool,
): Promise<string> {
  return userRepository.updateLastLoginAt(userId, db);
}

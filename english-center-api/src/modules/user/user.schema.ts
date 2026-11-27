import { z } from 'zod';
import { ACCOUNT_STATUSES, ACCOUNT_TYPES, ROLES } from '../../shared/constants/roles.js';

export const createStudentInputSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{4,28}$/),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().min(9).max(20),
  passwordHash: z.string().min(20),
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const userIdentityRecordSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  accountType: z.enum(ACCOUNT_TYPES),
  status: z.enum(ACCOUNT_STATUSES),
  mustChangePassword: z.boolean(),
  isActive: z.boolean(),
  displayName: z.string(),
  phone: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(ROLES),
  studentProfileId: z.string().uuid().nullable(),
  studentCode: z.string().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export type UserIdentityRecord = z.infer<typeof userIdentityRecordSchema>;

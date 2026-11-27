import { z } from 'zod';
import type { AccountStatus } from '../../shared/constants/roles.js';

export const loginBodySchema = z.object({
  identifier: z
    .string({ error: 'Vui lòng nhập tên đăng nhập hoặc email.' })
    .trim()
    .min(1, 'Vui lòng nhập tên đăng nhập hoặc email.')
    .max(255, 'Định danh đăng nhập quá dài.'),
  password: z
    .string({ error: 'Mật khẩu không được để trống.' })
    .min(1, 'Mật khẩu không được để trống.')
    .max(128, 'Mật khẩu vượt quá độ dài cho phép.'),
  rememberMe: z.boolean().optional().default(true),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const registerStudentBodySchema = z
  .object({
    fullName: z
      .string({ error: 'Họ và tên không được để trống.' })
      .trim()
      .min(2, 'Họ và tên cần tối thiểu 2 ký tự.')
      .max(150, 'Họ và tên tối đa 150 ký tự.'),
    username: z
      .string({ error: 'Tên đăng nhập không được để trống.' })
      .trim()
      .regex(
        /^[a-zA-Z0-9._-]{4,28}$/,
        'Tên đăng nhập 4–28 ký tự, chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.',
      ),
    email: z
      .string({ error: 'Email không được để trống.' })
      .trim()
      .toLowerCase()
      .pipe(z.email('Email chưa đúng định dạng.')),
    phone: z
      .string({ error: 'Số điện thoại không được để trống.' })
      .trim()
      .transform((val) => val.replace(/\s+/g, ''))
      .refine((val) => /^(0|\+84)[35789]\d{8}$/.test(val), {
        message: 'Số điện thoại chưa hợp lệ (VD: 0987654321).',
      }),
    password: z
      .string({ error: 'Mật khẩu không được để trống.' })
      .min(8, 'Mật khẩu tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.')
      .max(128, 'Mật khẩu tối đa 128 ký tự.')
      .refine((val) => /[a-zA-Z]/.test(val) && /\d/.test(val), {
        message: 'Mật khẩu tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.',
      }),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => data.confirmPassword === undefined || data.confirmPassword === data.password,
    {
      path: ['confirmPassword'],
      message: 'Mật khẩu xác nhận không khớp.',
    },
  );

export type RegisterStudentBody = z.infer<typeof registerStudentBodySchema>;

export type AuthenticatedClientSessionDto = {
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    phone: string;
    status: AccountStatus;
    avatarUrl?: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
  accountType: 'STUDENT';
  portal: 'CLIENT';
  role: 'STUDENT';
  permissions: readonly [];
  defaultLandingRoute: string;
};

export type ClientLoginOutcomeDto =
  | {
      outcome: 'AUTHENTICATED';
      session: AuthenticatedClientSessionDto;
      accessToken: string;
    }
  | {
      outcome: 'PORTAL_REDIRECT_REQUIRED';
      accountType: 'STAFF';
      targetPortal: 'STAFF';
      username: string;
      displayName: string;
      message: string;
    };

export type RegisteredStudentUserDto = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'student';
  accountType: 'STUDENT';
  portal: 'CLIENT';
  accountStatus: AccountStatus;
  defaultLandingRoute: string;
  avatarUrl?: string;
  createdAt: string;
};

export interface PasswordPolicyConfig {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireDigit: boolean
  requireSpecial: boolean
}

export const STAFF_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
}

export interface PasswordEvaluationResult {
  isValid: boolean
  score: number // 0..5
  strengthLabel: 'Rất yếu' | 'Yếu' | 'Trung bình' | 'Khá' | 'Mạnh'
  issues: string[]
  checks: {
    minLength: boolean
    uppercase: boolean
    lowercase: boolean
    digit: boolean
    special: boolean
  }
}

export function evaluatePasswordPolicy(
  password: string,
  policy: PasswordPolicyConfig = STAFF_PASSWORD_POLICY,
): PasswordEvaluationResult {
  const checks = {
    minLength: password.length >= policy.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const issues: string[] = []
  if (!checks.minLength) {
    issues.push(`Mật khẩu phải có tối thiểu ${policy.minLength} ký tự.`)
  }
  if (policy.requireUppercase && !checks.uppercase) {
    issues.push('Phải có ít nhất 01 chữ cái in hoa (A–Z).')
  }
  if (policy.requireLowercase && !checks.lowercase) {
    issues.push('Phải có ít nhất 01 chữ cái thường (a–z).')
  }
  if (policy.requireDigit && !checks.digit) {
    issues.push('Phải có ít nhất 01 chữ số (0–9).')
  }
  if (policy.requireSpecial && !checks.special) {
    issues.push('Phải có ít nhất 01 ký tự đặc biệt (!@#$%^&*...).')
  }

  const score = [
    checks.minLength,
    checks.uppercase,
    checks.lowercase,
    checks.digit,
    checks.special,
  ].filter(Boolean).length

  const strengthLabels: readonly PasswordEvaluationResult['strengthLabel'][] = [
    'Rất yếu',
    'Rất yếu',
    'Yếu',
    'Trung bình',
    'Khá',
    'Mạnh',
  ]

  return {
    isValid: issues.length === 0,
    score,
    strengthLabel: strengthLabels[score] ?? 'Rất yếu',
    issues,
    checks,
  }
}

/**
 * Sinh mật khẩu tạm thời ngẫu nhiên bằng CSPRNG (Web Crypto API) đáp ứng 100% Password Policy.
 */
export function generateStrongTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const specials = '!@#$%&*?'
  const all = upper + lower + digits + specials

  const randomBytes = new Uint32Array(Math.max(length, 10))
  globalThis.crypto.getRandomValues(randomBytes)

  const chars: string[] = [
    upper[randomBytes[0]! % upper.length]!,
    lower[randomBytes[1]! % lower.length]!,
    digits[randomBytes[2]! % digits.length]!,
    specials[randomBytes[3]! % specials.length]!,
  ]

  for (let i = 4; i < randomBytes.length; i++) {
    chars.push(all[randomBytes[i]! % all.length]!)
  }

  // Xáo trộn Fisher-Yates bằng CSPRNG
  const shuffleBytes = new Uint32Array(chars.length)
  globalThis.crypto.getRandomValues(shuffleBytes)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }

  return chars.join('')
}

/**
 * Băm một chiều SHA-256 phục vụ Mock Auth Verifier.
 * Tuyệt đối không lưu plaintext password vào UserAccount, SessionStorage hay LocalStorage.
 */
export async function hashMockCredential(userId: string, password: string): Promise<string> {
  const input = `ec_mock_salt_v1::${userId}::${password}`
  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input)
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Dự phòng hàm băm không đảo ngược khi môi trường test thiếu subtle
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

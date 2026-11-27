/** Số điện thoại di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (đầu số 3,5,7,8,9) */
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FACEBOOK_REGEX = /^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/.+/i

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isValidVnPhone = (value: string): boolean =>
  VN_PHONE_REGEX.test(value.replace(/\s+/g, ''))
export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim())
export const isValidFacebookUrl = (value: string): boolean => FACEBOOK_REGEX.test(value.trim())
export const isValidSlug = (value: string): boolean => SLUG_REGEX.test(value.trim())

export interface WorkingHourSlot {
  id: string
  label: string
  time: string
  note: string
}

export interface CenterSocialLinks {
  facebook: string
  zalo: string
  messenger: string
  instagram: string
  youtube: string
  tiktok: string
}

export interface CenterInfoSettings {
  name: string
  slogan: string
  intro: string
  hotline: string
  email: string
  address: string
  workingHours: WorkingHourSlot[]
  social: CenterSocialLinks
  copyrightText: string
  updatedAt: string
  updatedBy: string
}

export const INITIAL_CENTER_INFO_SETTINGS: CenterInfoSettings = {
  name: 'English Center',
  slogan: 'Chỉ cần cố gắng - Học là đỗ',
  intro:
    'English Center đồng hành cùng học viên trên hành trình chinh phục TOEIC với lộ trình rõ ràng, giáo viên tận tâm và môi trường học tập hiệu quả.',
  hotline: '0989 688 990',
  email: 'tuvan@englishcenter.edu.vn',
  address: 'Số 141, đường Chiến Thắng, Thanh Liệt, Hà Nội',
  workingHours: [
    { id: 'wh-1', label: 'Sáng', time: '08:00 – 12:00', note: 'Thứ Hai - Thứ Bảy' },
    { id: 'wh-2', label: 'Chiều', time: '13:30 – 17:30', note: 'Thứ Hai - Thứ Bảy' },
    { id: 'wh-3', label: 'Tối', time: '18:00 – 21:45', note: 'Thứ Hai - Thứ Bảy' },
  ],
  social: {
    facebook: 'https://www.facebook.com/share/1KGEuqJYcZ/',
    zalo: 'https://zalo.me/0989688990',
    messenger: 'https://m.me/englishcenter.toeic',
    instagram: 'https://instagram.com/englishcenter.toeic',
    youtube: 'https://youtube.com/@englishcenter.toeic',
    tiktok: 'https://tiktok.com/@englishcenter.toeic',
  },
  copyrightText: '© 2026 English Center. Chỉ cần cố gắng - Học là đỗ.',
  updatedAt: '2026-11-20T08:30:00.000Z',
  updatedBy: 'Nguyễn Hoàng Nam',
}

export function displayOrPlaceholder(
  value: string | null | undefined,
  fallback = 'Chưa thiết lập',
): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

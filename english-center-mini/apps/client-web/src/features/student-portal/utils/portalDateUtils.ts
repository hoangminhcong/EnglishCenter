function parseIsoDateLocal(iso: string): Date {
  // Nếu chuỗi có dạng YYYY-MM-DD, khởi tạo theo giờ địa phương để không lệch ngày
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function formatShortWeekdayDate(iso: string): string {
  const d = parseIsoDateLocal(iso);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatLongWeekdayLabel(iso: string): string {
  const d = parseIsoDateLocal(iso);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
  });
}

export function formatDayMonthShort(iso: string): string {
  const d = parseIsoDateLocal(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatFullDateVi(iso: string): string {
  const d = parseIsoDateLocal(iso);
  return d.toLocaleDateString('vi-VN');
}

export function addDaysToIsoDate(baseIso: string, offsetDays: number): string {
  const d = parseIsoDateLocal(baseIso);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekIndexFromStart(startDateIso: string, targetIso: string): number {
  const start = parseIsoDateLocal(startDateIso);
  const target = parseIsoDateLocal(targetIso);
  const diffDays = Math.floor((target.getTime() - start.getTime()) / 86_400_000);
  return Math.floor(diffDays / 7);
}

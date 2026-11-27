import type { EmployeeProfileType } from '@english-center/contracts'

export interface DepartmentCatalogItem {
  id: string
  code: string
  name: string
  applicableProfileTypes: readonly EmployeeProfileType[]
}

/**
 * Danh mục Phòng ban cấu hình tập trung dùng chung toàn Staff Web (không hardcode trong từng Form).
 */
export const DEPARTMENT_CATALOG: readonly DepartmentCatalogItem[] = [
  {
    id: 'dept-board',
    code: 'BOD',
    name: 'Ban Giám đốc & Quản trị Hệ thống',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-sales',
    code: 'SAL',
    name: 'Phòng Tư vấn Tuyển sinh',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-accounting',
    code: 'ACC',
    name: 'Phòng Kế toán – Học phí',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-academic',
    code: 'ACA',
    name: 'Phòng Giáo vụ Đào tạo',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-hr-academic',
    code: 'HRA',
    name: 'Phòng Nhân sự – Giáo vụ',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-hr',
    code: 'HRM',
    name: 'Phòng Hành chính – Nhân sự',
    applicableProfileTypes: ['EMPLOYEE'],
  },
  {
    id: 'dept-teaching',
    code: 'TEA',
    name: 'Tổ Chuyên môn TOEIC',
    applicableProfileTypes: ['TEACHER', 'EMPLOYEE'],
  },
] as const

export function findDepartmentById(departmentId: string): DepartmentCatalogItem | undefined {
  return DEPARTMENT_CATALOG.find((d) => d.id === departmentId)
}

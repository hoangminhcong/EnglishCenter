import { centerInfo } from '@/config/center-info'
import { branches } from '@/features/about/mocks/branches'
import type { JobPost } from '@/features/about/types'

function resolveBranchName(branchId?: string): string {
  if (!branchId) return `Các cơ sở ${centerInfo.name}`
  return branches.find((b) => b.id === branchId)?.name ?? `Các cơ sở ${centerInfo.name}`
}

export const jobPosts: JobPost[] = [
  {
    id: 'giao-vien-toeic',
    title: 'Giáo viên TOEIC',
    excerpt: 'Giảng dạy các lớp TOEIC Listening & Reading, xây dựng bài giảng theo giáo trình của trung tâm.',
    position: 'Giảng dạy',
    type: 'Bán thời gian',
    salary: 'Thỏa thuận',
    location: resolveBranchName(),
    deadline: '2026-12-31',
    image: '',
    description: [
      'Giảng dạy lớp TOEIC theo lộ trình của trung tâm.',
      'Theo dõi tiến độ và hỗ trợ học viên trong quá trình học.',
    ],
    requirements: [
      'Có chứng chỉ TOEIC hoặc tương đương theo yêu cầu của trung tâm.',
      'Có kinh nghiệm giảng dạy là một lợi thế.',
      'Kỹ năng truyền đạt tốt, tận tâm với học viên.',
    ],
    benefits: [
      'Môi trường làm việc chuyên nghiệp, thân thiện.',
      'Được đào tạo phương pháp giảng dạy của trung tâm.',
    ],
    status: 'published',
  },
  {
    id: 'tu-van-tuyen-sinh',
    title: 'Nhân viên tư vấn tuyển sinh',
    excerpt: 'Tư vấn lộ trình học TOEIC cho học viên qua điện thoại, tin nhắn và trực tiếp tại trung tâm.',
    position: 'Tuyển sinh',
    type: 'Toàn thời gian',
    salary: 'Thỏa thuận',
    branchId: 'cs-ha-dong',
    location: resolveBranchName('cs-ha-dong'),
    deadline: '2026-12-25',
    image: '',
    description: [
      'Tiếp nhận và tư vấn thông tin khóa học cho học viên.',
      'Chăm sóc khách hàng tiềm năng và báo cáo kết quả công việc.',
    ],
    requirements: [
      'Giao tiếp tốt, chủ động trong công việc.',
      'Ưu tiên ứng viên có kinh nghiệm tư vấn giáo dục.',
    ],
    benefits: ['Được đào tạo kỹ năng tư vấn.', 'Cơ hội thăng tiến theo năng lực.'],
    status: 'published',
  },
  {
    id: 'cham-soc-hoc-vien',
    title: 'Nhân viên chăm sóc học viên',
    excerpt: 'Hỗ trợ học viên trong quá trình học, giải đáp thắc mắc và theo dõi lịch học.',
    position: 'Chăm sóc học viên',
    type: 'Toàn thời gian',
    salary: 'Thỏa thuận',
    branchId: 'cs-hai-ba-trung',
    location: resolveBranchName('cs-hai-ba-trung'),
    deadline: '2026-12-20',
    image: '',
    description: [
      'Giải đáp thắc mắc của học viên về lịch học, tài liệu.',
      'Phối hợp với giáo viên để theo dõi tiến độ học tập.',
    ],
    requirements: ['Kỹ năng giao tiếp và xử lý tình huống tốt.', 'Cẩn thận, có trách nhiệm.'],
    benefits: [
      'Môi trường trẻ trung, năng động.',
      'Được đào tạo nghiệp vụ chăm sóc khách hàng.',
    ],
    status: 'published',
  },
  {
    id: 'content-marketing',
    title: 'Nhân viên Content Marketing',
    excerpt: 'Xây dựng nội dung truyền thông cho fanpage, website và các kênh mạng xã hội của trung tâm.',
    position: 'Marketing',
    type: 'Toàn thời gian',
    salary: 'Thỏa thuận',
    branchId: 'cs-nam-tu-liem',
    location: resolveBranchName('cs-nam-tu-liem'),
    deadline: '2026-12-31',
    image: '',
    description: [
      'Lên ý tưởng và viết nội dung cho các kênh truyền thông.',
      'Phối hợp thiết kế để hoàn thiện ấn phẩm.',
    ],
    requirements: [
      'Viết tốt, có tư duy sáng tạo.',
      'Biết sử dụng công cụ thiết kế cơ bản là một lợi thế.',
    ],
    benefits: ['Cơ hội phát triển kỹ năng marketing giáo dục.', 'Môi trường làm việc cởi mở.'],
    status: 'published',
  },
  {
    id: 'tro-giang',
    title: 'Trợ giảng TOEIC',
    excerpt: 'Hỗ trợ giáo viên trong lớp, chấm bài và giải đáp thắc mắc cho học viên.',
    position: 'Giảng dạy',
    type: 'Bán thời gian',
    salary: 'Thỏa thuận',
    branchId: 'cs-ha-dong',
    location: resolveBranchName('cs-ha-dong'),
    deadline: '2026-12-15',
    image: '',
    description: [
      'Hỗ trợ giáo viên trong giờ học và chấm bài tập.',
      'Giải đáp thắc mắc cơ bản cho học viên.',
    ],
    requirements: [
      'Có nền tảng tiếng Anh tốt, ưu tiên có điểm TOEIC.',
      'Nhiệt tình, trách nhiệm.',
    ],
    benefits: ['Cơ hội trở thành giáo viên của trung tâm.', 'Thời gian làm việc linh hoạt.'],
    status: 'published',
  },
]

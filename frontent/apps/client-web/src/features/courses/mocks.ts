import type { Course } from '@/features/courses/types'

/**
 * Dữ liệu khởi tạo cho 4 khóa học TOEIC của hệ thống.
 * Tuân thủ nghiêm ngặt yêu cầu:
 * - Khóa 1 (FOUNDATION TOEIC): Có đầy đủ dữ liệu minh họa các section (Giới thiệu, Lợi ích học viên, Đầu ra kỳ vọng & Video) bám sát thiết kế mẫu.
 * - 3 khóa còn lại (BEGINNER'S TOEIC 350+, CAMP BOMB TOEIC 450+, SUBMARINE TOEIC 700+): CHỈ khởi tạo tên khóa học, slug và mục tiêu đầu ra;
 *   KHÔNG tự ý bịa thêm nội dung mô tả, lợi ích hay cam kết đầu ra (để chứng minh cơ chế ẩn/hiện section tự động và sẵn sàng nhận dữ liệu thật từ Admin).
 */
export const initialCourses: Course[] = [
  {
    id: 'foundation-toeic',
    slug: 'foundation-toeic',
    code: 'FOUNDATION',
    name: 'FOUNDATION TOEIC (Xây nền)',
    scheduleTitle: 'FOUNDATION TOEIC',
    scheduleSubtitle: '(Xây dựng nền tảng)',
    targetScore: 'Xây dựng nền tảng',
    target: 'Xây dựng nền tảng',
    shortDescription:
      'Khóa học thiết kế dành riêng cho người mất gốc tiếng Anh lâu năm, chuẩn hóa ngữ âm, từ vựng và phản xạ nghe hiểu căn bản.',
    description:
      'TOEIC Foundation là khóa học được thiết kế dành riêng cho người mất gốc tiếng Anh lâu năm, không thể nghe audio các âm cơ bản, các từ vựng đơn lẻ và đọc hiểu từ vựng tiếng Anh ở mức độ tối thiểu.',
    highlights: [
      'Chuẩn hóa phát âm & tra phiên âm từ vựng TOEIC',
      'Xây dựng 300 từ vựng nền tảng cốt lõi',
      'Đạt tối thiểu 60/100 câu nghe đề thi TOEIC thật',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
    bannerImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400',
    tuitionFee: 0,
    duration: '2 tháng (24 buổi)',
    sessionsCount: 24,
    level: 'Mất gốc / Xây nền',
    introduction: {
      heading: 'GIỚI THIỆU KHÓA HỌC',
      paragraphs: [
        'TOEIC Foundation là khóa học được thiết kế dành riêng cho người mất gốc tiếng Anh lâu năm, không thể nghe audio các âm cơ bản, các từ vựng đơn lẻ và đọc hiểu từ vựng tiếng Anh ở mức độ tối thiểu.',
      ],
      bullets: [
        {
          id: 'intro-1',
          lead: 'Bản chất của học mọi ngôn ngữ đều bắt nguồn từ nghe trước (âm thanh)',
          text: 'chứ không phải học đọc trước, như vậy người học sẽ học nhanh hơn và yêu ngôn ngữ này hơn là áp dụng học từ đọc trước, điều đó làm cho người học sẽ đạt mục tiêu đúng dự định và không bị bỏ dở giữa chừng.',
        },
        {
          id: 'intro-2',
          lead: 'Học từ căn bản sẽ làm cho người học không áp lực',
          text: 'và xây dựng được nền tảng thật chắc cho hành trình dài hơn sau này, giống như xây dựng một ngôi nhà, nhà càng cao thì móng phải càng sâu và chắc.',
        },
      ],
      images: [
        {
          src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1000',
          alt: 'Học viên lớp Foundation TOEIC tại trung tâm',
          caption: 'Môi trường học tập thân thiện, bám sát tiến độ từng học viên',
        },
      ],
    },
    benefits: {
      heading: 'LỢI ÍCH CỦA HỌC VIÊN',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1000',
      imageAlt: 'Không khí giờ học thực tế tại lớp Foundation TOEIC',
      items: [
        {
          id: 'ben-1',
          title: 'Ngữ âm',
          description:
            'Chuẩn hóa phát âm, biết cách tra phiên âm, tự tin đọc rõ ràng bất kỳ từ vựng TOEIC nào dựa trên phiên âm của nó.',
        },
        {
          id: 'ben-2',
          title: 'Từ vựng',
          description:
            'Xây dựng nền tảng từ vựng với 300 từ, giúp người học hoàn toàn có thể nghe, nhắc lại và dịch nghĩa ngay lập tức.',
        },
        {
          id: 'ben-3',
          title: 'Nghe hiểu',
          description:
            'Nghe hiểu 50% các câu đơn độ dài 3–5 từ trong TOEIC và trong đời sống.',
        },
        {
          id: 'ben-4',
          title: 'Thói quen học tập',
          description:
            'Rèn luyện thói quen học tập tập trung và bền bỉ với 3 giờ học mỗi ngày.',
        },
      ],
    },
    expectedOutcomes: {
      heading: 'ĐẦU RA KỲ VỌNG CỦA KHÓA',
      items: [
        'Nghe hiểu sâu thành thạo câu đơn',
        'Nắm được 5 bước luyện nghe hiểu chuyên sâu',
        'Hiểu và phản xạ nhanh câu đơn dài trong Part 2',
        'Nghe hiểu 50% đoạn hội thoại tiếng Anh thương mại ngắn',
        'Đạt tối thiểu 60/100 câu nghe của đề thi TOEIC thật',
      ],
      media: {
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000',
        videoUrl: 'https://www.youtube.com/embed/ysz5S6PUM-U',
        title: 'Chia sẻ kinh nghiệm học tập & lộ trình Foundation TOEIC',
      },
    },
    status: 'active',
    isFeatured: true,
    displayOrder: 1,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'beginners-toeic',
    slug: 'beginners-toeic',
    code: 'BEGINNER',
    name: "BEGINNER'S TOEIC 350+",
    scheduleTitle: "BEGINNER'S TOEIC",
    scheduleSubtitle: '(350+ TOEIC)',
    targetScore: '350+ TOEIC',
    target: '350+ TOEIC',
    shortDescription: '',
    description: '',
    highlights: [],
    thumbnail: '',
    image: '',
    bannerImage: '',
    tuitionFee: 0,
    status: 'active',
    isFeatured: true,
    displayOrder: 2,
    createdAt: '2026-10-02T08:00:00Z',
    updatedAt: '2026-10-02T08:00:00Z',
  },
  {
    id: 'camp-bomb-toeic',
    slug: 'camp-bomb-toeic',
    code: 'CAMP BOMB',
    name: 'CAMP BOMB TOEIC 450+',
    scheduleTitle: 'CAMP BOMB TOEIC',
    scheduleSubtitle: '(450+ TOEIC)',
    targetScore: '450+ TOEIC',
    target: '450+ TOEIC',
    shortDescription: '',
    description: '',
    highlights: [],
    thumbnail: '',
    image: '',
    bannerImage: '',
    tuitionFee: 0,
    status: 'active',
    isFeatured: true,
    displayOrder: 3,
    createdAt: '2026-10-03T08:00:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
  },
  {
    id: 'submarine-toeic',
    slug: 'submarine-toeic',
    code: 'SUBMARINE',
    name: 'SUBMARINE TOEIC 700+',
    scheduleTitle: 'SUBMARINE TOEIC',
    scheduleSubtitle: '(700+ TOEIC)',
    targetScore: '700+ TOEIC',
    target: '700+ TOEIC',
    shortDescription: '',
    description: '',
    highlights: [],
    thumbnail: '',
    image: '',
    bannerImage: '',
    tuitionFee: 0,
    status: 'active',
    isFeatured: true,
    displayOrder: 4,
    createdAt: '2026-10-04T08:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z',
  },
]

export const courses = initialCourses

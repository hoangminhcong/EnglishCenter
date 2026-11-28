import type { Article } from '@/features/articles/types'

/**
 * Dữ liệu bài viết mẫu tách riêng phục vụ phát triển khi chưa nối Database.
 * Bao phủ cả 3 danh mục do Admin quản lý:
 * 1. 'student' -> Trang Học viên (/hoc-vien)
 * 2. 'listening-reading' -> Danh mục Tài liệu Listening & Reading (/tai-lieu/listening-reading)
 * 3. 'exam-review' -> Danh mục Review đề thi (/tai-lieu/review-de-thi)
 */
export const initialArticles: Article[] = [
  // ================= 1. DANH MỤC HỌC VIÊN (student) =================
  {
    id: 'art-stu-01',
    title: 'Chuẩn đầu ra TOEIC các trường đại học 2026: Mức điểm, lịch thi kịp xét tốt nghiệp [Update mới nhất]',
    slug: 'chuan-dau-ra-toeic-cac-truong-dai-hoc-2026',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900',
    shortDescription:
      'Tháng 10 cũng là lúc nhiều sinh viên năm cuối bắt đầu rà lại hồ sơ xét tốt nghiệp đợt cuối năm. Tổng hợp chi tiết chuẩn đầu ra TOEIC mới nhất của các trường đại học lớn.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Nhiều sinh viên năm cuối đã hoàn thành hết các học phần chuyên ngành nhưng vẫn chậm tiến độ nhận bằng tốt nghiệp chỉ vì chưa kịp nộp chứng chỉ tiếng Anh đúng hạn quy định của nhà trường.',
      },
      {
        id: 'b2',
        type: 'heading',
        text: '1. Mức điểm chuẩn đầu ra TOEIC phổ biến tại các trường đại học',
      },
      {
        id: 'b3',
        type: 'list',
        items: [
          'Khối ngành Kinh tế – Tài chính – Ngân hàng: Phổ biến từ 550 – 650+ TOEIC (Listening & Reading).',
          'Khối ngành Kỹ thuật – Công nghệ thông tin: Phổ biến từ 450 – 550+ TOEIC.',
          'Các chương trình Chất lượng cao / Tiên tiến: Yêu cầu từ 650 – 750+ TOEIC hoặc kèm thêm chứng chỉ Speaking & Writing.',
        ],
      },
      {
        id: 'b4',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000',
        alt: 'Sinh viên ôn luyện chuẩn đầu ra TOEIC tại English Center',
        caption: 'Học viên lập kế hoạch ôn thi sớm từ năm 3 để chủ động nộp chứng chỉ trước hạn xét tốt nghiệp',
      },
      {
        id: 'b5',
        type: 'heading',
        text: '2. Lời khuyên cho sinh viên để kịp đợt xét tốt nghiệp',
      },
      {
        id: 'b6',
        type: 'paragraph',
        text: 'Bạn nên đăng ký thi trước thời hạn nộp chứng chỉ của trường ít nhất 4–6 tuần để dự phòng thời gian chờ phiếu điểm IIG và có cơ hội cải thiện điểm số nếu cần thiết.',
      },
    ],
    category: 'student',
    subCategoryTag: 'Chuẩn đầu ra ĐH',
    author: 'Ban Học Thuật English Center',
    publishedDate: '2026-10-25',
    status: 'published',
    featured: true,
    attachments: [],
    createdAt: '2026-10-25T08:00:00Z',
    updatedAt: '2026-10-25T08:00:00Z',
  },
  {
    id: 'art-stu-02',
    title: 'Chứng chỉ ngoại ngữ xét tuyển 2027: Bỏ điểm cộng, TOEIC còn dùng được không? (Mới nhất)',
    slug: 'chung-chi-ngoai-ngu-xet-tuyen-2027-toeic-con-dung-duoc-khong',
    thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=900',
    shortDescription:
      'Phân tích chi tiết những thay đổi trong quy chế xét tuyển đại học và giá trị thực tế của chứng chỉ TOEIC đối với miễn học phần ngoại ngữ đại cương và chuẩn đầu ra.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Trước những điều chỉnh mới về quy chế tuyển sinh, nhiều học sinh và tân sinh viên thắc mắc liệu việc sở hữu chứng chỉ TOEIC sớm còn mang lại lợi thế lớn như các năm trước hay không.',
      },
      {
        id: 'b2',
        type: 'heading',
        text: 'Giá trị kép của TOEIC trong suốt 4 năm đại học',
      },
      {
        id: 'b3',
        type: 'list',
        items: [
          'Quy đổi điểm và miễn học các học phần tiếng Anh cơ bản tại trường, tiết kiệm học phí tín chỉ.',
          'Đáp ứng trực tiếp điều kiện chuẩn đầu ra ngoại ngữ để xét tốt nghiệp đúng hạn.',
          'Là tiêu chí sàng lọc CV hàng đầu tại các tập đoàn đa quốc gia, ngân hàng và doanh nghiệp lớn.',
        ],
      },
    ],
    category: 'student',
    subCategoryTag: 'Góc sinh viên',
    author: 'Ban Tư Vấn Đào Tạo',
    publishedDate: '2026-10-18',
    status: 'published',
    featured: true,
    attachments: [],
    createdAt: '2026-10-18T08:00:00Z',
    updatedAt: '2026-10-18T08:00:00Z',
  },
  {
    id: 'art-stu-03',
    title: '4 Năm Đại Học Và Bài Toán Chứng Chỉ Tiếng Anh: Nên Học, Thi Và Đạt Chuẩn Khi Nào?',
    slug: '4-nam-dai-hoc-va-bai-toan-chung-chi-tieng-anh',
    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900',
    shortDescription:
      'Lộ trình phân bổ thời gian học tiếng Anh thông minh từ năm nhất đến năm cuối giúp sinh viên vừa giữ GPA cao vừa cầm chắc tấm bằng TOEIC 700+ trước khi đi thực tập.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Thời điểm vàng để hoàn thiện nền tảng tiếng Anh là năm 1 và năm 2 đại học khi khối lượng môn chuyên ngành và đồ án chưa quá nặng.',
      },
      {
        id: 'b2',
        type: 'list',
        items: [
          'Năm 1 – Năm 2: Xây dựng vững ngữ âm, ngữ pháp cốt lõi và từ vựng giao tiếp văn phòng.',
          'Đầu Năm 3: Luyện đề chuyên sâu và đăng ký thi lấy chứng chỉ TOEIC có thời hạn 2 năm (vừa kịp dùng đi thực tập lẫn xét tốt nghiệp năm 4).',
        ],
      },
    ],
    category: 'student',
    subCategoryTag: 'Kinh nghiệm học viên',
    author: ' Nguyễn Minh Anh – 865 TOEIC',
    publishedDate: '2026-10-09',
    status: 'published',
    featured: false,
    attachments: [],
    createdAt: '2026-10-09T08:00:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
  },
  {
    id: 'art-stu-04',
    title: 'Hành trình từ mất gốc đạt 835 TOEIC sau 4 tháng của sinh viên Bách Khoa',
    slug: 'hanh-trinh-tu-mat-goc-dat-835-toeic-sinh-vien-bach-khoa',
    thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900',
    shortDescription:
      'Chia sẻ thực tế cách duy trì kỷ luật 2 giờ nghe chép chính tả và ghi chú từ vựng Part 7 mỗi ngày từ bạn Trần Quốc Huy – học viên khóa Submarine 700+.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Xuất phát điểm chỉ nghe được những từ rời rạc trong Part 1, Quốc Huy đã kiên trì đi từ lớp Foundation lên Submarine và xuất sắc cán mốc 835/990 TOEIC ngay lần thi đầu tiên.',
      },
      {
        id: 'b2',
        type: 'heading',
        text: 'Phương pháp ôn tập 3 bước mỗi tối',
      },
      {
        id: 'b3',
        type: 'list',
        items: [
          'Nghe sâu và nhại lại (Shadowing) từng đoạn hội thoại Part 3 theo đúng ngữ điệu bản xứ.',
          'Ghi chép sổ tay lỗi sai ngữ pháp Part 5 theo từng nhóm từ loại.',
          'Bấm giờ nghiêm túc 75 phút khi luyện đề Reading để rèn tâm lý phòng thi.',
        ],
      },
    ],
    category: 'student',
    subCategoryTag: 'Vinh danh học viên',
    author: 'Ban Học Thuật English Center',
    publishedDate: '2026-09-28',
    status: 'published',
    featured: true,
    attachments: [],
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T08:00:00Z',
  },

  // ================= 2. DANH MỤC LISTENING & READING (listening-reading) =================
  {
    id: 'art-lr-01',
    title: 'Tài liệu TOEIC 2 kỹ năng đạt chuẩn đầu ra dành riêng cho sinh viên khối Kinh tế & Ngân hàng',
    slug: 'tai-lieu-toeic-2-ky-nang-dat-chuan-dau-ra-khoi-kinh-te-ngan-hang',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900',
    shortDescription:
      'Trọn bộ tài liệu hệ thống từ vựng tài chính – thương mại, chiến thuật xử lý bẫy nghe Part 2–3 và bộ đề luyện tập bám sát cấu trúc đề thi mới nhất.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Bộ tài liệu được biên soạn tinh gọn tập trung vào các chủ điểm thương mại, giao dịch ngân hàng, hợp đồng và nhân sự thường xuyên xuất hiện trong đề thi TOEIC Listening & Reading.',
      },
      {
        id: 'b2',
        type: 'heading',
        text: 'Nội dung bao gồm trong bộ tài liệu',
      },
      {
        id: 'b3',
        type: 'list',
        items: [
          '15 chủ điểm ngữ pháp chắc chắn gặp trong Part 5 & Part 6 kèm bài tập có giải thích chi tiết.',
          '500 cụm từ đồng nghĩa (Paraphrasing) xuất hiện tần suất cao trong Part 3, Part 4 và Part 7.',
          'File Audio chuẩn giọng đọc ETS kèm Transcript song ngữ Anh – Việt.',
        ],
      },
      {
        id: 'b4',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1000',
        alt: 'Minh họa tài liệu tự học TOEIC Listening & Reading',
        caption: 'Kết hợp ghi chú từ khóa và phân tích transcript sau mỗi bài luyện nghe',
      },
    ],
    category: 'listening-reading',
    subCategoryTag: 'Tài liệu 2 Kỹ năng',
    author: 'Phòng Nghiên Cứu Đề Thi',
    publishedDate: '2026-10-22',
    status: 'published',
    featured: true,
    attachments: [
      {
        id: 'att-lr-01',
        name: 'Bo-Tai-Lieu-TOEIC-2-Ky-Nang-Chuan-Dau-Ra.pdf',
        url: '/files/toeic-2-ky-nang-chuan-dau-ra.pdf',
        fileType: 'PDF',
        fileSize: '5.4 MB',
      },
      {
        id: 'att-lr-02',
        name: 'Audio-Luyen-Nghe-Part-1-4-ETS.zip',
        url: '/files/audio-luyen-nghe-ets.zip',
        fileType: 'ZIP / MP3',
        fileSize: '38.0 MB',
      },
    ],
    createdAt: '2026-10-22T08:00:00Z',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'art-lr-02',
    title: 'Tài liệu tự học 0–700+ TOEIC theo lộ trình 90 ngày kèm kế hoạch học từng tuần',
    slug: 'tai-lieu-tu-hoc-0-700-toeic-theo-lo-trinh-90-ngay',
    thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900',
    shortDescription:
      'Kế hoạch tự học TOEIC chi tiết từng tuần từ giai đoạn xây nền ngữ âm – ngữ pháp đến giai đoạn tăng tốc luyện đề 700+ dành cho người bận rộn.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Rất nhiều bạn tải hàng chục bộ sách về máy nhưng không biết bắt đầu học từ quyển nào trước. Bộ tài liệu này chia nhỏ khối lượng kiến thức theo từng chặng 30 ngày rõ ràng.',
      },
      {
        id: 'b2',
        type: 'list',
        items: [
          'Chặng 1 (Ngày 1 – 30): Chuẩn hóa IPA, nghe câu đơn ngắn và nắm chắc 12 chủ điểm ngữ pháp nền.',
          'Chặng 2 (Ngày 31 – 60): Luyện kỹ thuật bắt từ khóa hội thoại Part 3–4 và đọc lướt câu hỏi Part 7.',
          'Chặng 3 (Ngày 61 – 90): Giải đề Full Test 200 câu và thống kê lỗi sai theo từng dạng câu hỏi.',
        ],
      },
    ],
    category: 'listening-reading',
    subCategoryTag: 'Lộ trình 0–700+',
    author: 'Phòng Nghiên Cứu Đề Thi',
    publishedDate: '2026-10-14',
    status: 'published',
    featured: true,
    attachments: [
      {
        id: 'att-lr-03',
        name: 'Checklist-Tu-Hoc-TOEIC-90-Ngay-0-700.pdf',
        url: '/files/checklist-tu-hoc-90-ngay.pdf',
        fileType: 'PDF',
        fileSize: '3.1 MB',
      },
    ],
    createdAt: '2026-10-14T08:00:00Z',
    updatedAt: '2026-10-14T08:00:00Z',
  },
  {
    id: 'art-lr-03',
    title: 'Tổng hợp mẹo giải nhanh Part 5 & Part 6 dưới 20 giây mỗi câu không cần dịch hết nghĩa',
    slug: 'tong-hop-meo-giai-nhanh-part-5-va-part-6-duoi-20-giay',
    thumbnail: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=900',
    shortDescription:
      'Cách nhận diện nhanh câu hỏi từ loại, chia thì động từ, đại từ phản thân và liên từ để dành trọn 55 phút còn lại cho phần đọc hiểu Part 7.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Chìa khóa để đạt điểm cao phần Reading nằm ở việc hoàn thành 46 câu Part 5 và Part 6 trong vòng tối đa 18–20 phút với độ chính xác trên 90%.',
      },
      {
        id: 'b2',
        type: 'list',
        items: [
          'Bước 1: Nhìn 4 đáp án A, B, C, D trước để phân loại câu hỏi ngữ pháp hay câu hỏi từ vựng.',
          'Bước 2: Quan sát từ đứng ngay trước và ngay sau chỗ trống để chọn nhanh dạng từ loại phù hợp.',
          'Bước 3: Chỉ dịch nghĩa câu khi cả 4 đáp án cùng thuộc một từ loại khác nhau về nghĩa.',
        ],
      },
    ],
    category: 'listening-reading',
    subCategoryTag: 'Chiến thuật Reading',
    author: 'Ban Học Thuật English Center',
    publishedDate: '2026-10-02',
    status: 'published',
    featured: false,
    attachments: [
      {
        id: 'att-lr-04',
        name: 'Chuyen-De-Tu-Loai-Va-Lien-Tu-Part-5-6.pdf',
        url: '/files/chuyen-de-part-5-6.pdf',
        fileType: 'PDF',
        fileSize: '2.8 MB',
      },
    ],
    createdAt: '2026-10-02T08:00:00Z',
    updatedAt: '2026-10-02T08:00:00Z',
  },

  // ================= 3. DANH MỤC REVIEW ĐỀ THI (exam-review) =================
  {
    id: 'art-rev-01',
    title: 'Review đề thi TOEIC Listening and Reading ngày 31/10 – Độ khó thực tế & Từ vựng xuất hiện',
    slug: 'review-de-thi-toeic-listening-and-reading-ngay-31-10',
    thumbnail: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=900',
    shortDescription:
      'Mình vừa thi TOEIC trên máy tại IIG và đạt 905 điểm, vượt mục tiêu 800+ đề ra ban đầu. Dưới đây là review chi tiết tốc độ đọc Listening và các chủ đề khó trong Part 7.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Đề thi ca sáng ngày 31/10 có tốc độ đọc phần Listening tương đương bộ ETS 2024, tuy nhiên cách diễn đạt lại (paraphrase) ở Part 3 và Part 4 đòi hỏi thí sinh phải nắm chắc ý chính thay vì chỉ bắt từ đơn lẻ.',
      },
      {
        id: 'b2',
        type: 'heading',
        text: '1. Review chi tiết phần Listening (Part 1 – Part 4)',
      },
      {
        id: 'b3',
        type: 'list',
        items: [
          'Part 1: 5 tranh tả người khá rõ ràng, 1 tranh tả vật xuất hiện cụm "be stacked on the counter" và "display case".',
          'Part 2: Khoảng 8 câu trả lời gián tiếp dạng "Tôi chưa kiểm tra lịch trình" hoặc câu hỏi ngược lại.',
          'Part 3 & Part 4: Bảng biểu dễ nhìn, nên tận dụng thời gian đọc hướng dẫn để gạch chân từ khóa của 3 câu hỏi trước khi băng chạy.',
        ],
      },
      {
        id: 'b4',
        type: 'heading',
        text: '2. Review chi tiết phần Reading (Part 5 – Part 7)',
      },
      {
        id: 'b5',
        type: 'list',
        items: [
          'Part 5: Ngữ pháp cơ bản chiếm khoảng 20 câu, có 4–5 câu từ vựng nâng cao như "stringent", "complimentary", "tentatively".',
          'Part 7: Đoạn đơn vừa sức, nhưng 3 cụm đoạn ba (Triple Passages) cuối bài khá dài về chủ đề bảo hành thiết bị và điều chỉnh hợp đồng thuê văn phòng.',
        ],
      },
    ],
    category: 'exam-review',
    subCategoryTag: 'Đề thi ngày 31/10',
    author: 'Lê Hoàng Nam – 905 TOEIC',
    publishedDate: '2026-11-02',
    status: 'published',
    featured: true,
    attachments: [
      {
        id: 'att-rev-01',
        name: 'Tong-Hop-Tu-Vung-De-Thi-That-Thang-10.pdf',
        url: '/files/tu-vung-de-thi-thang-10.pdf',
        fileType: 'PDF',
        fileSize: '1.9 MB',
      },
    ],
    createdAt: '2026-11-02T08:00:00Z',
    updatedAt: '2026-11-02T08:00:00Z',
  },
  {
    id: 'art-rev-02',
    title: 'Review đề thi TOEIC Listening and Reading ngày 15/10 – Kinh nghiệm phân bổ giờ thi trên máy',
    slug: 'review-de-thi-toeic-listening-and-reading-ngay-15-10',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900',
    shortDescription:
      'Sau khi hoàn thành kỳ thi TOEIC trên máy tính tại IIG, mình chia sẻ lại cảm nhận chi tiết về giao diện làm bài, tai nghe phòng thi và những lưu ý tránh mất điểm đáng tiếc.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Thi TOEIC trên máy tính giúp tiết kiệm đáng kể thời gian tô chì đáp án (khoảng 7–10 phút), rất có lợi cho những bạn hay thiếu giờ làm Part 7.',
      },
      {
        id: 'b2',
        type: 'list',
        items: [
          'Lưu ý không thể gạch chân trực tiếp lên đề như thi giấy, vì vậy bạn nên tập thói quen đọc trên màn hình máy tính ít nhất 2 tuần trước ngày thi.',
          'Nút "Review" cho phép đánh dấu các câu phân vân ở Part 5 để quay lại kiểm tra nhanh vào cuối giờ.',
          'Biết điểm ngay trên màn hình sau khi nhấn nộp bài giúp bạn chủ động hoàn toàn kế hoạch nộp hồ sơ tốt nghiệp.',
        ],
      },
    ],
    category: 'exam-review',
    subCategoryTag: 'Đề thi ngày 15/10',
    author: 'Phạm Thu Trang – 840 TOEIC',
    publishedDate: '2026-10-17',
    status: 'published',
    featured: true,
    attachments: [],
    createdAt: '2026-10-17T08:00:00Z',
    updatedAt: '2026-10-17T08:00:00Z',
  },
  {
    id: 'art-rev-03',
    title: 'Tổng hợp các bẫy kinh điển trong đề thi TOEIC thực tế quý IV và cách xử lý',
    slug: 'tong-hop-cac-bay-kinh-dien-trong-de-thi-toeic-thuc-te',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900',
    shortDescription:
      'Điểm mặt 5 dạng bẫy từ đồng âm ở Listening và bẫy thông tin nhiễu trong email phản hồi ở Part 7 khiến nhiều thí sinh mức 600+ vẫn mất điểm.',
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        text: 'Qua khảo sát hàng chục đề thi thật gần đây, các câu hỏi phân loại điểm 750+ thường đặt thông tin gây nhiễu ngay câu đầu tiên của đoạn hội thoại rồi đổi ý bằng các từ nối như "However", "Actually", "In fact".',
      },
      {
        id: 'b2',
        type: 'list',
        items: [
          'Bẫy thay đổi lịch hẹn / địa điểm vào phút chót trong Part 3.',
          'Bẫy điều kiện áp dụng mã giảm giá hoặc chính sách hoàn tiền trong quảng cáo Part 7.',
          'Bẫy câu hỏi suy luận yêu cầu kết hợp thông tin từ cả Email và Bảng báo giá đính kèm.',
        ],
      },
    ],
    category: 'exam-review',
    subCategoryTag: 'Phân tích đề thi',
    author: 'Ban Học Thuật English Center',
    publishedDate: '2026-10-05',
    status: 'published',
    featured: false,
    attachments: [],
    createdAt: '2026-10-05T08:00:00Z',
    updatedAt: '2026-10-05T08:00:00Z',
  },
]

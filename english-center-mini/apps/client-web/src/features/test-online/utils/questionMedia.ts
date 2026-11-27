import type {
  QuestionGroup,
  TestOption,
  TestQuestion,
} from '@/features/test-online/types/test.types'

export interface NormalizedImageItem {
  id: string
  url: string
  alt?: string
  caption?: string
}

export interface NormalizedAudioItem {
  id: string
  url: string
  title?: string
  durationSeconds?: number
}

export interface NormalizedTextItem {
  id: string
  content: string
  variant?: 'instruction' | 'passage' | 'prompt' | 'dialogue'
}

/**
 * Chuẩn hóa dữ liệu của 1 Câu hỏi (`TestQuestion`):
 * Hỗ trợ cả 3 trường phẳng đơn giản (`questionText`, `audioUrl`, `imageUrl`) lẫn mảng `content[]` mở rộng.
 * Trường nào rỗng / undefined sẽ tự động được lọc bỏ an toàn.
 */
export function normalizeQuestionMedia(question: TestQuestion): {
  texts: NormalizedTextItem[]
  images: NormalizedImageItem[]
  audios: NormalizedAudioItem[]
} {
  const texts: NormalizedTextItem[] = []
  const images: NormalizedImageItem[] = []
  const audios: NormalizedAudioItem[] = []

  if (question.questionText && question.questionText.trim().length > 0) {
    texts.push({
      id: `${question.id}-qtext`,
      content: question.questionText.trim(),
      variant: 'prompt',
    })
  }

  if (question.imageUrl && question.imageUrl.trim().length > 0) {
    images.push({
      id: `${question.id}-qimg`,
      url: question.imageUrl.trim(),
      alt: question.imageAlt ?? `Hình câu ${question.questionNumber}`,
    })
  }

  if (question.audioUrl && question.audioUrl.trim().length > 0) {
    audios.push({
      id: `${question.id}-qaud`,
      url: question.audioUrl.trim(),
      durationSeconds: question.audioDurationSeconds,
    })
  }

  for (const block of question.content ?? []) {
    if (block.type === 'text' && block.content.trim().length > 0) {
      texts.push({
        id: block.id,
        content: block.content.trim(),
        variant: block.variant,
      })
    } else if (block.type === 'image' && block.url.trim().length > 0) {
      images.push({
        id: block.id,
        url: block.url.trim(),
        alt: block.alt,
        caption: block.caption,
      })
    } else if (block.type === 'audio' && block.url.trim().length > 0) {
      audios.push({
        id: block.id,
        url: block.url.trim(),
        title: block.title,
        durationSeconds: block.durationSeconds,
      })
    }
  }

  return { texts, images, audios }
}

/**
 * Chuẩn hóa ngữ liệu dùng chung của Nhóm câu hỏi (`QuestionGroup`).
 */
export function normalizeGroupMedia(group: QuestionGroup): {
  passages: NormalizedTextItem[]
  images: NormalizedImageItem[]
  audios: NormalizedAudioItem[]
} {
  const passages: NormalizedTextItem[] = []
  const images: NormalizedImageItem[] = []
  const audios: NormalizedAudioItem[] = []

  if (group.passageText && group.passageText.trim().length > 0) {
    passages.push({
      id: `${group.id}-gtext`,
      content: group.passageText.trim(),
      variant: 'passage',
    })
  }

  for (const [idx, p] of (group.passages ?? []).entries()) {
    if (p && p.trim().length > 0) {
      passages.push({
        id: `${group.id}-gpassage-${idx}`,
        content: p.trim(),
        variant: 'passage',
      })
    }
  }

  if (group.imageUrl && group.imageUrl.trim().length > 0) {
    images.push({
      id: `${group.id}-gimg`,
      url: group.imageUrl.trim(),
      alt: group.imageAlt ?? group.groupTitle,
    })
  }

  if (group.audioUrl && group.audioUrl.trim().length > 0) {
    audios.push({
      id: `${group.id}-gaud`,
      url: group.audioUrl.trim(),
      durationSeconds: group.audioDurationSeconds,
    })
  }

  for (const block of group.stimulus ?? []) {
    if (block.type === 'text' && block.content.trim().length > 0) {
      passages.push({
        id: block.id,
        content: block.content.trim(),
        variant: block.variant,
      })
    } else if (block.type === 'image' && block.url.trim().length > 0) {
      images.push({
        id: block.id,
        url: block.url.trim(),
        alt: block.alt,
        caption: block.caption,
      })
    } else if (block.type === 'audio' && block.url.trim().length > 0) {
      audios.push({
        id: block.id,
        url: block.url.trim(),
        title: block.title,
        durationSeconds: block.durationSeconds,
      })
    }
  }

  return { passages, images, audios }
}

/**
 * Kiểm tra một nhóm câu hỏi có phải cụm nhiều câu dùng chung ngữ liệu (Part 3, 4, 6, 7) hay là từng câu đơn (Part 1, 2, 5).
 */
export function isMultiQuestionSharedGroup(group: QuestionGroup): boolean {
  if (group.questions.length <= 1) return false
  const gMedia = normalizeGroupMedia(group)
  return (
    gMedia.passages.length > 0 ||
    gMedia.images.length > 0 ||
    gMedia.audios.length > 0
  )
}

/**
 * Chuẩn hóa nội dung phương án trả lời (`TestOption`).
 */
export function normalizeOptionMedia(option: TestOption): {
  texts: string[]
  images: NormalizedImageItem[]
} {
  const texts: string[] = []
  const images: NormalizedImageItem[] = []

  const pushCleanText = (raw: string) => {
    const trimmed = raw.trim()
    if (
      !trimmed ||
      trimmed === `(${option.label})` ||
      trimmed === `(${option.label}) Mark your answer`
    ) {
      return
    }
    texts.push(trimmed)
  }

  if (option.text) {
    pushCleanText(option.text)
  }

  if (option.imageUrl && option.imageUrl.trim().length > 0) {
    images.push({
      id: `${option.id}-opt-img`,
      url: option.imageUrl.trim(),
      alt: `Phương án ${option.label}`,
    })
  }

  for (const block of option.content ?? []) {
    if (block.type === 'text') {
      pushCleanText(block.content)
    } else if (block.type === 'image' && block.url.trim().length > 0) {
      images.push({
        id: block.id,
        url: block.url.trim(),
        alt: block.alt ?? `Phương án ${option.label}`,
      })
    }
  }

  return { texts, images }
}

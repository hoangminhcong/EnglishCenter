import { Download, FileText } from 'lucide-react'
import { toSafeHttpUrl } from '@/utils/safeUrl'
import type { ArticleAttachment } from '@/features/articles/types'

export default function ArticleAttachmentsBox({ attachments }: { attachments: ArticleAttachment[] }) {
  // Chỉ hiển thị tệp có đường dẫn an toàn (http/https hoặc đường dẫn nội bộ)
  const safeItems = (attachments ?? [])
    .map((att) => ({ att, href: toSafeHttpUrl(att.url) }))
    .filter((item): item is { att: ArticleAttachment; href: string } => item.href !== null)

  if (safeItems.length === 0) return null

  return (
    <section className="mt-8 rounded-xl border border-[#A7D8F5] bg-[#EAF6FD]/70 p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#2878B8]">
        <FileText className="h-4 w-4" />
        Tài liệu đính kèm ({safeItems.length})
      </h3>

      <ul className="mt-3 divide-y divide-[#DCEAF3]">
        {safeItems.map(({ att, href }) => (
          <li
            key={att.id}
            className="flex flex-col justify-between gap-3 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#243B53]">{att.name}</p>
              {(att.fileType || att.fileSize) && (
                <p className="text-xs text-[#64748B]">
                  {[att.fileType, att.fileSize].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2878B8] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#1F6399]"
            >
              <Download className="h-3.5 w-3.5" />
              Tải tài liệu
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

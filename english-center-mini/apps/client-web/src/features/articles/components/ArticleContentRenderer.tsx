import ImageBox from '@/components/ui/ImageBox'
import type { ArticleContentBlock } from '@/features/articles/types'

export default function ArticleContentRenderer({ blocks }: { blocks: ArticleContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="ec-reading-font space-y-5 text-[16px] leading-[1.78] text-[#1E293B]">
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={block.id} className="pt-2 text-[20px] font-bold leading-snug text-[#1E293B]">
                {block.text}
              </h2>
            )

          case 'paragraph':
            return (
              <p key={block.id}>
                {block.boldPrefix && (
                  <strong className="font-semibold text-[#0F172A]">{block.boldPrefix} </strong>
                )}
                {block.text}
              </p>
            )

          case 'list':
            return (
              <ul key={block.id} className="list-disc space-y-2 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )

          case 'image':
            return (
              <figure key={block.id} className="my-6 overflow-hidden rounded-xl border border-[#DCEAF3] bg-[#F8FAFC]">
                <ImageBox
                  src={block.src}
                  alt={block.alt}
                  label="English Center"
                  className="aspect-[16/9] w-full"
                />
                {block.caption && (
                  <figcaption className="px-4 py-2.5 text-center text-xs italic text-[#718096]">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
        }
      })}
    </div>
  )
}

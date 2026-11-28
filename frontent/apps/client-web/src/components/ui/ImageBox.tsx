import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface Props {
  src: string
  alt: string
  label?: string
  className?: string
}

export default function ImageBox({ src, alt, label, className = '' }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = !src || failedSrc === src

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#A7D8F5] to-[#75BDEB] ${className}`}>
      {!failed ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-white">
          <ImageIcon className="h-8 w-8" />
          {label && <span className="text-xs font-bold uppercase tracking-wide">{label}</span>}
        </div>
      )}
    </div>
  )
}

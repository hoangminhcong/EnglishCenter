import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <main className="ec-font flex min-h-[60vh] flex-col items-center justify-center bg-[#F5FAFE] px-4 py-16 text-center">
      <span className="rounded-full bg-[#EAF6FD] px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#2878B8]">
        Lỗi 404
      </span>
      <h1 className="mt-4 text-3xl font-extrabold text-[#243B53] sm:text-4xl">
        Không tìm thấy trang bạn yêu cầu
      </h1>
      <p className="mt-3 max-w-md text-sm text-[#718096] sm:text-base">
        Đường dẫn có thể đã thay đổi hoặc tính năng đang được cập nhật. Hãy quay về trang chủ để tiếp tục khám phá nhé!
      </p>
      <Link
        to="/"
        className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#2878B8] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow transition hover:bg-[#1f5f94]"
      >
        <Home className="h-4 w-4" /> Về trang chủ
      </Link>
    </main>
  )
}

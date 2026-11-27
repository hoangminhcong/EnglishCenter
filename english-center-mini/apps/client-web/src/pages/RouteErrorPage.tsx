import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'

/** Hiển thị khi một trang gặp lỗi không lường trước, thay vì trắng màn hình */
export default function RouteErrorPage() {
  return (
    <main className="ec-font flex min-h-[60vh] flex-col items-center justify-center bg-[#F5FAFE] px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#F26522]">
        <TriangleAlert className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-[#243B53]">Đã xảy ra lỗi khi hiển thị trang</h1>
      <p className="mt-2 max-w-md text-sm text-[#718096]">
        Vui lòng tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy liên hệ trung tâm để được hỗ trợ.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f5f94]"
        >
          Tải lại trang
        </button>
        <Link
          to="/"
          className="rounded-lg border border-[#2878B8] bg-white px-5 py-2.5 text-sm font-bold text-[#2878B8] transition hover:bg-[#EAF6FD]"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}

import { Outlet } from 'react-router-dom'
import Header from '@/layouts/components/Header'
import Footer from '@/layouts/components/Footer'
import ScrollToTop from '@/layouts/components/ScrollToTop'
//
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

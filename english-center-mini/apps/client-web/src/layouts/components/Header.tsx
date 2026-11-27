import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, Phone, Search, X } from 'lucide-react'
import { centerInfo, navItems } from '@/config/center-info'
import UserAccountDropdown from '@/features/auth/components/UserAccountDropdown'

const navBase =
  'flex items-center gap-1 whitespace-nowrap text-xs 2xl:text-[13px] font-bold uppercase ec-shadow-text transition hover:text-[#F26522]'
const colorOf = (active: boolean) => (active ? 'text-[#F26522]' : 'text-white')

export default function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <>
      <div className="ec-font relative z-[60] w-full border-b border-[var(--ec-border)] bg-white px-4 py-1.5 text-sm text-[var(--ec-text)] lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a
            href={centerInfo.hotlineHref}
            className="flex items-center gap-2 font-medium transition hover:text-[var(--ec-accent)]"
          >
            <Phone className="h-4 w-4 text-[var(--ec-muted)]" />
            <span>{centerInfo.hotline}</span>
          </a>

          <div className="hidden text-center text-sm font-medium tracking-wide sm:block md:text-sm">
            {centerInfo.name} – {centerInfo.slogan}
          </div>

          <UserAccountDropdown />
        </div>
      </div>

      <header className="ec-font sticky top-0 z-40 w-full bg-[var(--ec-main)] shadow-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6 xl:gap-6">
          <Link to="/" className="flex shrink-0 select-none flex-col pr-1">
            <span className="whitespace-nowrap text-xl font-extrabold uppercase tracking-tight text-white ec-shadow-text sm:text-2xl">
              <span className="font-black text-[var(--ec-orange)]">E</span>NGLISH CENTER
            </span>
            <span className="-mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-white">
              {centerInfo.slogan}
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-3.5 xl:flex 2xl:gap-6">
            {navItems.map((item) => {
              if (item.children) {
                const isDropdownActive = item.children.some(
                  (child) => pathname === child.to || pathname.startsWith(`${child.to}/`),
                )

                return (
                  <div key={item.label} className="group relative flex h-20 items-center">
                    <button type="button" className={`${navBase} ${colorOf(isDropdownActive)}`}>
                      {item.label}
                      <ChevronDown className="h-3 w-3 transition group-hover:rotate-180" />
                    </button>
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-1 rounded-t-sm bg-[#F26522] ${
                        isDropdownActive ? 'block' : 'hidden'
                      }`}
                    />
                    <div className="invisible absolute left-0 top-full z-50 w-56 pt-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <div className="overflow-hidden rounded-xl border border-[#DCEAF3] bg-white py-2 shadow-2xl">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `block px-5 py-2.5 text-sm font-semibold normal-case transition hover:bg-[#EAF6FD] hover:text-[#2878B8] ${
                                isActive ? 'bg-[#EAF6FD] text-[#2878B8]' : 'text-[#243B53]'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              const content = (
                <>
                  {item.label}
                  {item.dropdown && <ChevronDown className="h-3 w-3 opacity-80" />}
                </>
              )
              return item.to ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => `${navBase} ${colorOf(isActive)}`}
                >
                  {content}
                </NavLink>
              ) : (
                <span
                  key={item.label}
                  title="Sắp ra mắt"
                  className={`${navBase} cursor-default text-white/80 hover:text-white/80`}
                >
                  {content}
                </span>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <Link
              to="/courses"
              aria-label="Tìm kiếm khóa học"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-white/90 text-white transition hover:bg-white/20"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              to="/test-online"
              className="shrink-0 whitespace-nowrap rounded bg-[var(--ec-orange)] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#d95314] sm:px-5 sm:text-sm"
            >
              Test online
            </Link>
            <button
              type="button"
              aria-label="Mở menu"
              onClick={() => setOpen((v) => !v)}
              className="p-1 text-white xl:hidden"
            >
              {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-white/40 bg-[var(--ec-main)] px-4 py-3 xl:hidden">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} className="py-1">
                  <span className={`${navBase} py-2 text-white`}>{item.label}</span>
                  <div className="ml-3 flex flex-col border-l-2 border-white/60 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) => `${navBase} py-2 ${colorOf(isActive)}`}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : item.to ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `${navBase} py-2 ${colorOf(isActive)}`}
                >
                  {item.label}
                </NavLink>
              ) : null,
            )}
          </nav>
        )}
      </header>
    </>
  )
}

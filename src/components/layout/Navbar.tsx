import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, Compass, LayoutGrid, List, Search, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import Avatar from '../ui/Avatar'
import LanguageSwitch from '../ui/LanguageSwitch'
import { cn } from '../../lib/cn'

export default function Navbar({
  onMenu,
  unread,
}: {
  onMenu: () => void
  unread: number
}) {
  const { profile, user } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          className="rounded-lg p-2 text-ink md:hidden"
          onClick={onMenu}
          aria-label={t('nav.menu')}
        >
          <LayoutGrid size={18} />
        </button>
        <NavLink to={user ? '/dashboard' : '/'} className="font-serif text-xl tracking-tight">
          Chroniqe
        </NavLink>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="hidden rounded-xl px-3 py-1.5 text-sm text-muted hover:bg-ink/5 sm:inline-flex"
            onClick={() => navigate('/lists')}
          >
            <Search size={16} className="mr-2" />
            {t('nav.lists')}
          </button>
          <LanguageSwitch compact />
          {user ? (
            <>
              <NavLink
                to="/notifications"
                className="relative rounded-xl p-2 text-ink hover:bg-ink/5"
                aria-label={t('nav.notifications')}
              >
                <Bell size={18} />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
                ) : null}
              </NavLink>
              <NavLink to="/profile" className="rounded-full p-0.5">
                <Avatar name={profile?.display_name || profile?.username || 'U'} url={profile?.avatar_url} />
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className="rounded-xl bg-ink px-3 py-1.5 text-sm text-paper">
              {t('nav.login')}
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}

export function Sidebar() {
  const { t } = usePrefs()
  const links = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutGrid },
    { to: '/lists', label: t('nav.lists'), icon: List },
    { to: '/explore', label: t('nav.explore'), icon: Compass },
    { to: '/friends', label: t('nav.people'), icon: UserRound },
  ]
  return (
    <aside className="hidden w-52 shrink-0 border-r border-line bg-paper/50 p-3 md:block">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-ink/5 hover:text-ink',
              )
            }
          >
            <link.icon size={16} />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export function BottomNav({ unread }: { unread: number }) {
  const { t } = usePrefs()
  const items = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutGrid },
    { to: '/lists', label: t('nav.lists'), icon: List },
    { to: '/explore', label: t('nav.explore'), icon: Compass },
    { to: '/notifications', label: t('nav.events'), icon: Bell, badge: unread },
    { to: '/profile', label: t('nav.profile'), icon: UserRound },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-0.5 py-2 text-[11px]',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
            {item.badge ? (
              <span className="absolute right-4 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

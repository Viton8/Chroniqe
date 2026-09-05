import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { fetchNotifications } from '../../services/api'
import { supabase } from '../../services/supabase'
import NotificationsModal from '../notifications/NotificationsModal'
import Navbar, { BottomNav, Sidebar } from './Navbar'

export default function AppLayout() {
  const { user, isAdmin } = useAuth()
  const { t } = usePrefs()
  const [menu, setMenu] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesAnchor, setNotesAnchor] = useState<HTMLElement | null>(null)
  const [unread, setUnread] = useState(0)

  const openNotes = (el: HTMLElement) => {
    setNotesAnchor(el)
    setNotesOpen((open) => (open && notesAnchor === el ? false : true))
  }

  useEffect(() => {
    if (!user) return
    let active = true
    const load = async () => {
      const rows = await fetchNotifications(user.id)
      if (active) setUnread(rows.filter((n) => !n.read_at).length)
    }
    void load()
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        onMenu={() => setMenu((v) => !v)}
        onNotifications={openNotes}
        notesOpen={notesOpen}
        unread={unread}
      />
      {menu ? (
        <div className="border-b border-line bg-paper px-4 py-3 md:hidden">
          {[
            ['/dashboard', t('nav.overview')],
            ['/lists', t('nav.lists')],
            ['/explore', t('nav.explore')],
            ['/friends', t('nav.people')],
            ...(isAdmin ? [['/admin', t('nav.admin')]] : []),
            ['/settings', t('nav.settings')],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-ink/5'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-6 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav
        unread={unread}
        notesOpen={notesOpen}
        onNotifications={openNotes}
      />
      <NotificationsModal
        open={notesOpen}
        anchorEl={notesAnchor}
        onClose={() => {
          setNotesOpen(false)
          setNotesAnchor(null)
        }}
      />
    </div>
  )
}

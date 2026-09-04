import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { fetchNotifications } from '../../services/api'
import { supabase } from '../../services/supabase'
import Navbar, { BottomNav, Sidebar } from './Navbar'

export default function AppLayout() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const [menu, setMenu] = useState(false)
  const [unread, setUnread] = useState(0)

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
      <Navbar onMenu={() => setMenu((v) => !v)} unread={unread} />
      {menu ? (
        <div className="border-b border-line bg-paper px-4 py-3 md:hidden">
          {[
            ['/dashboard', t('nav.overview')],
            ['/lists', t('nav.lists')],
            ['/explore', t('nav.explore')],
            ['/friends', t('nav.people')],
            ['/settings', t('nav.settings')],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenu(false)}
              className="block rounded-xl px-3 py-2 text-sm hover:bg-ink/5"
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
      <BottomNav unread={unread} />
    </div>
  )
}

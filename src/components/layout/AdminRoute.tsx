import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/EmptyState'

export default function AdminRoute() {
  const { profile, isAdmin, loading } = useAuth()

  if (loading) return <Spinner />
  if (!profile || !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/layout/AdminRoute'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import ExplorePage from './pages/ExplorePage'
import ForgotPage from './pages/ForgotPage'
import FriendsPage from './pages/FriendsPage'
import LandingPage from './pages/LandingPage'
import ListDetailPage from './pages/ListDetailPage'
import ListsPage from './pages/ListsPage'
import LoginPage from './pages/LoginPage'
import NewCustomListPage from './pages/NewCustomListPage'
import NewListPage from './pages/NewListPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import PublicUserPage from './pages/PublicUserPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<AppLayout />}>
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/u/:username" element={<PublicUserPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/new" element={<NewListPage />} />
          <Route path="/lists/new/custom" element={<NewCustomListPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="/lists/:id" element={<ListDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

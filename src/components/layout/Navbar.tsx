import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="text-lg font-semibold">
          Chroniqe
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link to="/lists" className="text-gray-600 hover:text-gray-900">
            Lists
          </Link>
          <Link to="/profile" className="text-gray-600 hover:text-gray-900">
            Profile
          </Link>
        </nav>
      </div>
    </header>
  )
}

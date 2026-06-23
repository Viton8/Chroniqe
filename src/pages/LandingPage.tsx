import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold tracking-tight">Chroniqe</h1>
      <p className="mt-4 max-w-md text-center text-gray-600">
        Track movies, series, games, books, and custom lists in your personal
        chronology.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to="/login"
          className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
        >
          Register
        </Link>
      </div>
    </div>
  )
}

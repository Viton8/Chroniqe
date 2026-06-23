import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="mt-2 text-sm text-gray-600">
          Registration will be implemented in Phase 4.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-gray-500 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  )
}

import { createContext, useContext, type ReactNode } from 'react'

interface AuthContextValue {
  user: null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

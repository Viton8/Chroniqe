import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface CommandWorkspace {
  listId: string
  items: Array<{ id: string; title: string }>
  openItem: (id: string) => void
  createItem: () => void
}

interface CommandContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  workspace: CommandWorkspace | null
  setWorkspace: (workspace: CommandWorkspace | null) => void
}

const CommandContext = createContext<CommandContextValue | null>(null)

export function CommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [workspace, setWorkspace] = useState<CommandWorkspace | null>(null)
  const value = useMemo(
    () => ({ open, setOpen, workspace, setWorkspace }),
    [open, workspace],
  )
  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommand(): CommandContextValue {
  const ctx = useContext(CommandContext)
  if (!ctx) throw new Error('useCommand must be used within CommandProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalCommand(): CommandContextValue | null {
  return useContext(CommandContext)
}

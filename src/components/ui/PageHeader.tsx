import type { ReactNode } from 'react'

export default function PageHeader({
  kicker,
  title,
  lead,
  action,
}: {
  kicker?: string
  title: string
  lead?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-sm text-muted">{kicker}</p> : null}
        <h1 className="break-words font-serif text-3xl">{title}</h1>
        {lead ? <p className="mt-1 max-w-xl text-sm text-muted">{lead}</p> : null}
      </div>
      {action}
    </div>
  )
}

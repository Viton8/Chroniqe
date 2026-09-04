import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface FieldWrapProps {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FieldWrap({ label, hint, error, children }: FieldWrapProps) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium">{label}</span> : null}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}

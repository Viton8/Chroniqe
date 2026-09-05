import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:ring-2 focus:ring-accent/20',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'max-w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function SearchField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative w-full max-w-xl', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Input className="h-10 pl-9" {...props} />
    </div>
  )
}

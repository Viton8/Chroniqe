import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-5 py-2.5 text-base',
        variant === 'primary' && 'bg-accent text-white hover:bg-violet-800',
        variant === 'ghost' && 'text-ink hover:bg-black/5',
        variant === 'soft' && 'bg-white/80 text-ink ring-1 ring-line hover:bg-white',
        variant === 'danger' && 'bg-rose-700 text-white hover:bg-rose-800',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

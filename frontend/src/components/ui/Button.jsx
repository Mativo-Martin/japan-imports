import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const Button = forwardRef(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    default: 'bg-teal-500 text-white hover:bg-teal-600',
    primary: 'bg-navy text-white hover:bg-opacity-90',
    outline: 'border border-navy text-navy hover:bg-navy hover:bg-opacity-5',
    ghost: 'text-navy hover:bg-navy hover:bg-opacity-5',
    orange: 'bg-orange-500 text-white hover:bg-orange-600',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    />
  )
})

Button.displayName = 'Button'

export { Button }

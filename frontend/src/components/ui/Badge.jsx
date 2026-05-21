import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const Badge = forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-teal-100 text-teal-800',
    secondary: 'bg-orange-100 text-orange-800',
    success: 'bg-green-100 text-green-800',
    destructive: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    outline: 'border border-navy border-opacity-20 text-navy',
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})

Badge.displayName = 'Badge'

export { Badge }

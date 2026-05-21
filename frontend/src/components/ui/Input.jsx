import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex w-full px-3 py-2 text-sm border border-navy border-opacity-10 rounded-md',
      'bg-white placeholder:text-gray-400 transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
))

Input.displayName = 'Input'

export { Input }

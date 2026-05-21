import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('bg-white rounded-lg border border-opacity-10 border-navy shadow-md p-6', className)}
    {...props}
  />
))

Card.displayName = 'Card'

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mb-4', className)} {...props} />
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-xl font-semibold text-navy', className)} {...props} />
))

CardTitle.displayName = 'CardTitle'

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))

CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardContent }

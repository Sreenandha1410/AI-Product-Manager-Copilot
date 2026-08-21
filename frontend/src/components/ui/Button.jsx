import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', asChild = false, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        {
          'bg-primary text-white hover:bg-primary-hover shadow-sm': variant === 'primary',
          'bg-surface text-text-primary border border-border hover:bg-surface-hover shadow-sm': variant === 'outline',
          'bg-transparent hover:bg-surface-hover text-text-primary': variant === 'ghost',
          'bg-danger text-white hover:bg-danger/90 shadow-sm': variant === 'danger',
          'h-10 py-2 px-4': size === 'default',
          'h-9 px-3 rounded-md': size === 'sm',
          'h-11 px-8 rounded-lg': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

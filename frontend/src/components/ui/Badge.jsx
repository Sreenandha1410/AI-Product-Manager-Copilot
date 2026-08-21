import React from 'react';
import { cn } from '../../utils/cn';

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        {
          'border-transparent bg-surface-hover text-text-primary': variant === 'default',
          'border-transparent bg-primary text-white': variant === 'primary',
          'border-transparent bg-success/10 text-success': variant === 'success',
          'border-transparent bg-warning/10 text-warning': variant === 'warning',
          'border-transparent bg-danger/10 text-danger': variant === 'danger',
          'border-border text-text-primary': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

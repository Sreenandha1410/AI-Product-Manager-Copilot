import React from 'react';
import { cn } from '../../utils/cn';

export function Avatar({ className, src, alt, fallback, size = 'default' }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-surface-hover",
        {
          'h-10 w-10': size === 'default',
          'h-8 w-8': size === 'sm',
          'h-12 w-12': size === 'lg',
        },
        className
      )}
    >
      {src ? (
        <img className="aspect-square h-full w-full object-cover" src={src} alt={alt} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium text-text-secondary">
          {fallback}
        </span>
      )}
    </div>
  );
}

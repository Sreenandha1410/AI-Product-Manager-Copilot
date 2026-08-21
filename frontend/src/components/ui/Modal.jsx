import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export function Modal({ isOpen, onClose, title, children, className }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div 
        className={cn("w-full max-w-md rounded-xl bg-surface border border-border p-6 shadow-xl", className)}
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2">
            <X className="h-5 w-5 text-text-secondary" />
          </Button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

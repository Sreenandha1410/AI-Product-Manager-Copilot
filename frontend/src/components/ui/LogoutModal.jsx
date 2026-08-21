import React from 'react';
import { Button } from './Button';

export function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-2">Confirm Logout</h3>
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to log out? You will need to sign in again to access your projects.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-border text-text-primary hover:bg-background">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-danger text-white hover:bg-danger/90">
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}

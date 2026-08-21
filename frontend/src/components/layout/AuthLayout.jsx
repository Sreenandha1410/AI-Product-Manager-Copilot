import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bot } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white mb-4 shadow-sm">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">AI Product Manager Copilot</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Transform customer feedback into actionable product decisions using AI.
          </p>
        </div>
        
        <Outlet />
      </div>
    </div>
  );
}

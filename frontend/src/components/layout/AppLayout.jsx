// src/components/layout/AppLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FloatingChat } from "../common/FloatingChat";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — unchanged */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — unchanged */}
        <Topbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating AI Chat — rendered once, visible on every page */}
      <FloatingChat />
    </div>
  );
}

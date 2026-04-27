import React, { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const AppLayout = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main content — pushed right on desktop, full-width on mobile */}
      <div className="md:mr-64 flex flex-col min-h-screen">
        <Header title={title} subtitle={subtitle} onMenuClick={toggleSidebar} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

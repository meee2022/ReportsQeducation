import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const AppLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="mr-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

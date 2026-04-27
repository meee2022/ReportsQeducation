import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Activity,
  BarChart3,
  Upload,
  GraduationCap,
  FileSpreadsheet,
  Settings,
  ClipboardList,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "نظرة عامة",        href: "/",                     icon: LayoutDashboard },
  { title: "أداء المعلمين",    href: "/teachers-performance",  icon: Users },
  { title: "التقارير",         href: "/reports",               icon: ClipboardList },
  { title: "الطلاب",           href: "/students",              icon: GraduationCap },
  { title: "لوحات الصدارة",   href: "/leaderboards",          icon: Trophy },
  { title: "نشاط المستخدمين", href: "/user-activity",         icon: Activity },
  { title: "التقييمات",        href: "/assessments",           icon: FileSpreadsheet },
  { title: "المقارنات",        href: "/comparisons",           icon: BarChart3 },
  { title: "إعدادات الفصل",   href: "/term-settings",         icon: Settings },
  { title: "رفع الملفات",      href: "/upload",                icon: Upload },
];

export const Sidebar = ({ open, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 h-screen w-64 border-l bg-card flex flex-col transition-transform duration-300",
          /* mobile: slide in/out | desktop: always visible */
          "translate-x-0",
          !open && "max-md:translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://customer-assets.emergentagent.com/job_school-rtl-metrics/artifacts/2g24g7mf_image.png"
              alt="شعار"
              className="h-10 w-10 flex-shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary leading-tight truncate">قطر للتعليم</h1>
              <p className="text-xs text-muted-foreground truncate">لوحة المتابعة الذكية</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-3 flex-shrink-0">
          <div className="rounded-lg bg-accent/60 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 flex-shrink-0" />
              <span className="font-medium text-primary truncate">النظام يعمل</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

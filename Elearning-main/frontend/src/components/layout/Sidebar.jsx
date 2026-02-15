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
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "نظرة عامة",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "أداء المعلمين",
    href: "/teachers-performance",
    icon: Users,
  },
  {
    title: "الطلاب",
    href: "/students",
    icon: GraduationCap,
  },
  {
    title: "لوحات الصدارة",
    href: "/leaderboards",
    icon: Trophy,
  },
  {
    title: "نشاط المستخدمين",
    href: "/user-activity",
    icon: Activity,
  },
  {
    title: "التقييمات",
    href: "/assessments",
    icon: FileSpreadsheet,
  },
  {
    title: "المقارنات",
    href: "/comparisons",
    icon: BarChart3,
  },
  {
    title: "رفع الملفات",
    href: "/upload",
    icon: Upload,
  },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-64 border-l bg-card">
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-center border-b px-6">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_school-rtl-metrics/artifacts/2g24g7mf_image.png" 
            alt="شعار قطر للتعليم" 
            className="h-12 w-12 object-contain"
          />
          <div className="text-start">
            <h1 className="text-lg font-bold text-primary">قطر للتعليم</h1>
            <p className="text-xs text-muted-foreground">لوحة متابعة التعليم الذكية</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="custom-scrollbar h-[calc(100vh-5rem)] overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-accent/50 p-4">
        <div className="rounded-lg bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="font-medium text-primary">معلومات النظام</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            آخر تحديث للبيانات:
          </p>
          <p className="text-xs font-medium text-primary">منذ 5 دقائق</p>
        </div>
      </div>
    </aside>
  );
};

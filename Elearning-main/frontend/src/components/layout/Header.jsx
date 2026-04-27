import React from "react";
import { Upload, Calendar, School, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCurrentSchool } from "@/utils/useCurrentSchool";

export const Header = ({ title, subtitle, onMenuClick }) => {
  const navigate = useNavigate();
  const { schoolName } = useCurrentSchool();

  const currentDate = new Date().toLocaleDateString("ar-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5">

        {/* Right side: hamburger (mobile) + school name */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>

          {schoolName && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 max-w-[180px] sm:max-w-none">
              <School className="h-3.5 w-3.5 text-red-800 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-red-900 truncate">{schoolName}</span>
            </div>
          )}
        </div>

        {/* Left side: date + upload button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{currentDate}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/upload")}
            className="gap-1.5 text-xs h-8 px-2.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">رفع الملفات</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

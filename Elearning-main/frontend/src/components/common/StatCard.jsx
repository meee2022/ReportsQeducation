import React from "react";
import { cn } from "@/lib/utils";

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  className,
}) => {
  const variantColors = {
    default: "#64748b",
    primary: "#1d4ed8",
    success: "#16a34a",
    warning: "#ca8a04",
    info: "#0284c7",
  };
  const accent = variantColors[variant] || variantColors.default;

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3", className)}
      style={{ borderRight: `4px solid ${accent}` }}>
      {Icon && (
        <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: `${accent}18` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      )}
      <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden">
        <p className="text-xs text-slate-500 font-medium truncate">{title}</p>
        <p className="text-xl font-extrabold text-slate-800">{value}</p>
        {trend && (
          <div className={cn(
            "mt-1 text-xs truncate font-medium",
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-400"
          )}>
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};

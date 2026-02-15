import React from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export const RankBadge = ({ rank, className }) => {
  const getRankConfig = (rank) => {
    switch (rank) {
      case 1:
        return {
          icon: Trophy,
          color: "text-warning",
          bgColor: "bg-warning/10",
          label: "الأول"
        };
      case 2:
        return {
          icon: Medal,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          label: "الثاني"
        };
      case 3:
        return {
          icon: Award,
          color: "text-primary",
          bgColor: "bg-primary/10",
          label: "الثالث"
        };
      default:
        return {
          icon: null,
          color: "text-muted-foreground",
          bgColor: "",
          label: `#${rank}`
        };
    }
  };

  const config = getRankConfig(rank);
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon ? (
        <div className={cn("rounded-full p-1.5", config.bgColor)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
};

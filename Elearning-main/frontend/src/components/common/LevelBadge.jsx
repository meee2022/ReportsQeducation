import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const LevelBadge = ({ level, className }) => {
  const getLevelConfig = (level) => {
    const levelNum = parseInt(level) || 0;
    if (levelNum === 0) {
      return { label: "المستوى صفر", variant: "secondary" };
    }
    if (levelNum === 1) {
      return { label: "المستوى الأول", variant: "default" };
    }
    if (levelNum === 2) {
      return { label: "المستوى الثاني", variant: "outline" };
    }
    return { label: `المستوى ${levelNum}`, variant: "outline" };
  };

  const config = getLevelConfig(level);

  return (
    <Badge variant={config.variant} className={cn("font-normal", className)}>
      {config.label}
    </Badge>
  );
};

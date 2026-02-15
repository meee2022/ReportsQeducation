import React from "react";
import { Star } from "lucide-react";

export const StarRating = ({ rating, maxRating = 5, showCount = false, count = 0 }) => {
  const stars = [];
  
  for (let i = 1; i <= maxRating; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${i <= rating ? "fill-warning text-warning" : "fill-muted text-muted"}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">{stars}</div>
      {showCount && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
};

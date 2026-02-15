import React from "react";
import { FileX } from "lucide-react";

export const EmptyState = ({ 
  title = "لا توجد بيانات", 
  description = "لم يتم العثور على أي بيانات للعرض",
  icon: Icon = FileX,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

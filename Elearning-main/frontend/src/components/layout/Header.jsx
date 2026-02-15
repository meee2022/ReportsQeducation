import React from "react";
import { Upload, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const Header = ({ title, subtitle }) => {
  const navigate = useNavigate();
  
  // Get current date in Arabic format
  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/upload')}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            رفع الملفات
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>الأسبوع الحالي: {currentDate}</span>
        </div>
      </div>
    </header>
  );
};

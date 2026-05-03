import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Supreme Grade Page Container Component
 * Enforces consistent page layout, animation, and spacing across the application.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div 
      className={cn(
        "w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10", 
        className
      )}
    >
      {children}
    </div>
  );
}

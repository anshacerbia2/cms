import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Supreme Grade Page Header Component
 * Enforces a consistent layout for all module entry points.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6", className)}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl sm:text-4xl font-black tracking-tighter text-primary flex items-center gap-3 sm:gap-4">
            <div className="bg-secondary/10 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-secondary/20 shadow-premium shrink-0">
              <Icon className="text-secondary w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </div>
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-[13px] font-medium">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

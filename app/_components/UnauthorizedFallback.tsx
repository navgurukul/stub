"use client";

import { ReactNode } from "react";
import { ShieldOff } from "lucide-react";

interface UnauthorizedFallbackProps {
  /**
   * Custom message to display
   */
  message?: string;
  /**
   * Show icon
   */
  showIcon?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
}

/**
 * UnauthorizedFallback Component
 * Inline unauthorized message for UI elements
 */
export function UnauthorizedFallback({
  message = "You don't have permission to access this feature.",
  showIcon = true,
  size = "md",
}: UnauthorizedFallbackProps) {
  const sizeClasses = {
    sm: "text-xs p-2",
    md: "text-sm p-3",
    lg: "text-base p-4",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-base bg-muted/50 text-muted-foreground border border-border ${sizeClasses[size]}`}
    >
      {showIcon && <ShieldOff className={iconSizes[size]} />}
      <p>{message}</p>
    </div>
  );
}

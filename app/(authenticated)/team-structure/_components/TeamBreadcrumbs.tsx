"use client";

import React from "react";
import { TeamBreadcrumbsProps } from "@/lib/team-structure-type";
import { cn } from "@/lib/utils";
import { displayName, findPathToNode } from "@/lib/team-structure-utils";

export function TeamBreadcrumbs({
  focusedEmail,
  setFocusedEmail,
  data,
}: TeamBreadcrumbsProps) {
  const breadcrumbPath = focusedEmail ? findPathToNode(data, focusedEmail) : null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 select-none">
      <button
        onClick={() => setFocusedEmail(null)}
        className={cn(
          "hover:text-foreground transition-colors cursor-pointer",
          !focusedEmail && "text-foreground font-semibold"
        )}
      >
        Full chart
      </button>
      {breadcrumbPath &&
        breadcrumbPath.map((node) => (
          <React.Fragment key={node.email}>
            <span className="text-zinc-300 dark:text-zinc-700">&gt;</span>
            <button
              onClick={() => setFocusedEmail(node.email)}
              className={cn(
                "hover:text-foreground transition-colors cursor-pointer",
                node.email === focusedEmail && "text-foreground font-semibold"
              )}
            >
              {displayName(node.name || node.manager, node.email)}
            </button>
          </React.Fragment>
        ))}
    </div>
  );
}

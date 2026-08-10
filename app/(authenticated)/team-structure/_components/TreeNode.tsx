"use client";

import React from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { TreeNodeProps } from "@/lib/team-structure-type";
import { cn } from "@/lib/utils";
import { getDeptStyles, getInitials } from "@/lib/team-structure-utils";

export function TreeNode({
  node,
  expandedKeys,
  onToggle,
  searchQuery,
  matchedEmails,
  focusedEmail,
  onSelectNode,
}: TreeNodeProps) {
  const isExpanded = expandedKeys.has(node.email);
  const hasChildren = node.reportees && node.reportees.length > 0;

  const isMatched = matchedEmails.has(node.email);
  const isFocused = focusedEmail === node.email;

  const deptStyles = getDeptStyles(node.department);
  const initials = getInitials(node.name || node.manager || node.email);

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelectNode(node.email)}
        className={cn(
          "relative flex items-center gap-4 p-4 min-w-[240px] max-w-[280px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none",
          isFocused && "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-primary",
          isMatched && "ring-2 ring-primary/60 border-primary/60"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold select-none shadow-sm",
            deptStyles.avatar
          )}
        >
          {initials}
        </div>

        <div className="flex flex-col min-w-0 flex-1 text-left">
          <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-snug truncate" title={node.name || node.email || "-"}>
            {node.name || node.email || "-"}
          </span>
          <span
            className={cn(
              "text-xs font-semibold mt-1.5 leading-none",
              deptStyles.text
            )}
          >
            {node.department || "-"}
          </span>

          <div className="mt-2.5 flex items-center gap-2.5 text-[11px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                {node.reporteesCount !== undefined && node.reporteesCount !== null
                  ? `${node.reporteesCount} ${node.reporteesCount === 1 ? "reportee" : "reportees"}`
                  : "-"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Expand / Collapse Button & Connector below Card */}
      {hasChildren && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.email);
            }}
            className="flex items-center justify-center w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-1 focus:ring-primary z-10 cursor-pointer"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Child Nodes (Recursion) */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center">
          <div className="w-[2px] h-6 bg-zinc-300 dark:bg-zinc-700" />

          <div className="flex flex-row justify-center relative">
            {node.reportees!.map((child, index) => {
              const totalChildren = node.reportees!.length;
              const isOnlyChild = totalChildren === 1;
              const isFirst = index === 0;
              const isLast = index === totalChildren - 1;

              return (
                <div
                  key={child.email}
                  className={cn(
                    "relative px-4 pt-6",
                    !isOnlyChild && "before:content-[''] before:absolute before:top-0 before:h-[2px] before:bg-zinc-300 dark:before:bg-zinc-700",
                    isFirst && !isOnlyChild && "before:left-1/2 before:right-0",
                    isLast && !isOnlyChild && "before:left-0 before:right-1/2",
                    !isFirst && !isLast && !isOnlyChild && "before:left-0 before:right-0"
                  )}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-zinc-300 dark:bg-zinc-700" />

                  <TreeNode
                    node={child}
                    expandedKeys={expandedKeys}
                    onToggle={onToggle}
                    searchQuery={searchQuery}
                    matchedEmails={matchedEmails}
                    focusedEmail={focusedEmail}
                    onSelectNode={onSelectNode}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


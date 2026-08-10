"use client";

import React, { useState, useMemo } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { EmployeeReportee, FlatEmployee, TeamSearchProps } from "@/lib/team-structure-type";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { getDeptStyles, getInitials, findPathToNode } from "@/lib/team-structure-utils";

export function TeamSearch({
  data,
  flatEmployees,
  searchQuery,
  setSearchQuery,
  focusedEmail,
  setFocusedEmail,
  setExpandedKeys,
  handleResetView,
}: TeamSearchProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const matchingEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return flatEmployees
      .filter((emp) => {
        return (
          (emp.name || "").toLowerCase().includes(query) ||
          (emp.email || "").toLowerCase().includes(query) ||
          (emp.department || "").toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }, [searchQuery, flatEmployees]);

  return (
    <div className="flex items-center gap-3">
      {/* Search bar with combobox dropdown */}
      <Popover open={searchOpen && searchQuery.trim().length > 0} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="pl-9 pr-8 h-9 w-full rounded-lg bg-background border-border"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                  handleResetView();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-80 sm:w-96 overflow-hidden pointer-events-auto bg-background border-2 border-border shadow-md rounded-lg"
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false} className="bg-background text-foreground border-none">
            <CommandList className="max-h-[360px] overflow-y-auto">
              {matchingEmployees.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground bg-background text-foreground">
                  No matching employees
                </div>
              ) : (
                <CommandGroup
                  heading="Matching Employees"
                  className="text-foreground bg-background [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {matchingEmployees.map((emp) => {
                    const deptStyles = getDeptStyles(emp.department);
                    const initials = getInitials(emp.name || emp.email);

                    return (
                      <CommandItem
                        key={emp.email}
                        value={emp.email}
                        onSelect={() => {
                          setSearchQuery(emp.name);
                          setFocusedEmail(emp.email);
                          setSearchOpen(false);

                          const path = findPathToNode(data, emp.email);
                          if (path) {
                            const pathEmails = path.map(n => n.email);
                            setExpandedKeys(prev => {
                              const next = new Set(prev);
                              pathEmails.forEach(email => next.add(email));
                              return next;
                            });
                          }
                        }}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-secondary-background hover:text-foreground text-foreground aria-selected:bg-secondary-background aria-selected:text-foreground border-none outline-none select-none rounded-lg"
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm select-none",
                          deptStyles.avatar
                        )}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {emp.name || emp.email || "-"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/85 truncate leading-normal mt-0.5">
                            {emp.department ? emp.department : "-"}
                            {emp.managerName && ` · Reports to ${emp.managerName}`}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Action buttons */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleResetView}
        className="h-9 gap-1.5 text-xs rounded-lg font-medium border-border"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset view
      </Button>
    </div>
  );
}

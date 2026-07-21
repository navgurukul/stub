"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LeaveBalanceItem, LeaveBalanceTableProps } from "@/lib/leave-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatLeaveDaysValue,
  isCompOffLeaveType,
  getDisplayLeaveTypeName,
  getLeaveCategory,
} from "@/lib/leave-helpers";

export function LeaveBalanceTable({ balances, isLoading }: LeaveBalanceTableProps) {
  const sortedBalances = useMemo(() => {
    const priority = ["casual leave", "wellness leave"];
    const visibleBalances = balances.filter((balance) => {
      const leaveName = String(balance.leaveType?.name ?? "").trim().toLowerCase();
      const leaveCode = String(balance.leaveType?.code ?? "").trim().toLowerCase();

      const isCompensatoryLeave =
        leaveName === "compensatory leave" ||
        leaveCode === "compensatory_leave" ||
        leaveCode === "compensatory-leave" ||
        leaveCode === "compensatory";

      return !isCompensatoryLeave;
    });

    return [...visibleBalances].sort((a, b) => {
      const aKey = (a.leaveType?.name || "").toLowerCase();
      const bKey = (b.leaveType?.name || "").toLowerCase();
      const ai = priority.findIndex((p) => aKey.includes(p));
      const bi = priority.findIndex((p) => bKey.includes(p));
      return (
        (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
        aKey.localeCompare(bKey)
      );
    });
  }, [balances]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <div className="px-4 py-3 border-b border-border bg-secondary-background flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Leave Balance</span>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {sortedBalances.length} {sortedBalances.length === 1 ? "record" : "records"}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="p-5 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-secondary-background rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full text-sm min-w-[640px]">
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary-background">
                <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</TableHead>
                <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated</TableHead>
                <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</TableHead>
                <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</TableHead>
                <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No leave balance found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedBalances.map((balance) => {
                  const allocated = balance.allocatedHours / 8;
                  const pending = balance.pendingHours / 8;
                  const approved = balance.bookedHours / 8;
                  const remaining = balance.balanceHours / 8;
                  const isCompOffLeave = isCompOffLeaveType(balance.leaveType);
                  const remainingTone =
                    remaining <= 0
                      ? "bg-red-50 text-red-700 border-red-200"
                      : remaining <= 2
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <TableRow key={balance.id} className="border-b border-border last:border-0 hover:bg-secondary-background/50 transition-colors">
                      <TableCell className="px-4 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{getDisplayLeaveTypeName(balance.leaveType.name)}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              getLeaveCategory(balance.leaveType.code, balance.leaveType.name).className
                            )}
                          >
                            {getLeaveCategory(balance.leaveType.code, balance.leaveType.name).label}
                          </span>
                          {isCompOffLeave && (
                            <Link href="/compoff" className="text-xs font-medium text-primary underline-offset-2 hover:underline ml-2">
                              View details
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                        {formatLeaveDaysValue(allocated)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                        {formatLeaveDaysValue(pending)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                        {formatLeaveDaysValue(approved)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center tabular-nums font-semibold">
                        <span className={cn("inline-flex min-w-[3rem] items-center justify-center rounded-md border px-2 py-1", remainingTone)}>
                          {formatLeaveDaysValue(remaining)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

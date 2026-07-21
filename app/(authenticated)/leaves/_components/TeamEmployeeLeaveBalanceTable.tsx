"use client";

import { CheckCircle2, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaveBalanceItem, TeamEmployeeLeaveBalanceTableProps } from "@/lib/leave-types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  formatLeaveDaysValue,
  getDisplayLeaveTypeName,
  getLeaveCategory,
  isCompOffLeaveType,
} from "@/lib/leave-helpers";

export function TeamEmployeeLeaveBalanceTable({
  sortedTeamEmployeeBalances,
  editingAllocatedBalance,
  editingAllocatedHours,
  isUpdatingAllocated,
  canEditTeamPendingRequests,
  setEditingAllocatedHours,
  setEditingAllocatedBalance,
  handleUpdateAllocatedBalance,
}: TeamEmployeeLeaveBalanceTableProps) {
  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <Table className="w-full text-sm min-w-[640px]">
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary-background">
            <TableHead className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Leave Type
            </TableHead>
            <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Allocated
            </TableHead>
            <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available
            </TableHead>
            <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending
            </TableHead>
            <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approved
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeamEmployeeBalances.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-4 py-6 text-center text-sm text-muted-foreground"
              >
                No leave balance found for this employee.
              </TableCell>
            </TableRow>
          ) : (
            sortedTeamEmployeeBalances.map((balance) => (
              <TableRow
                key={balance.id}
                className="border-b border-border last:border-0"
              >
                <TableCell className="px-4 py-3 font-medium text-foreground">
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
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-center tabular-nums">
                  {editingAllocatedBalance?.id === balance.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        value={editingAllocatedHours}
                        onChange={(e) => setEditingAllocatedHours(e.target.value)}
                        className="h-7 w-16 text-center text-sm"
                        disabled={isUpdatingAllocated}
                      />
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleUpdateAllocatedBalance();
                        }}
                        disabled={isUpdatingAllocated}
                        variant="ghost"
                        size="icon"
                        title="Confirm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAllocatedBalance(null);
                          setEditingAllocatedHours("");
                        }}
                        disabled={isUpdatingAllocated}
                        variant="ghost"
                        size="icon"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatLeaveDaysValue(balance.allocatedHours / 8)}</span>
                      {canEditTeamPendingRequests &&
                        !isCompOffLeaveType(balance.leaveType) && (
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAllocatedBalance(balance);
                              setEditingAllocatedHours(
                                String(balance.allocatedHours / 8)
                              );
                            }}
                            variant="ghost"
                            size="icon"
                            title="Edit allocated balance"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-center tabular-nums">
                  {formatLeaveDaysValue(balance.balanceHours / 8)}
                </TableCell>
                <TableCell className="px-4 py-3 text-center tabular-nums">
                  {formatLeaveDaysValue(balance.pendingHours / 8)}
                </TableCell>
                <TableCell className="px-4 py-3 text-center tabular-nums">
                  {formatLeaveDaysValue(balance.bookedHours / 8)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

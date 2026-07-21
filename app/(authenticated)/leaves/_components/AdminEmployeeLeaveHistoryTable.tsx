"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
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
  getDisplayLeaveTypeName,
} from "@/lib/leave-helpers";
import type { LeaveRequest as TeamLeaveRequest, AdminEmployeeLeaveHistoryTableProps } from "@/lib/leave-types";

export function AdminEmployeeLeaveHistoryTable({
  adminEmployeeHistory,
}: AdminEmployeeLeaveHistoryTableProps) {
  const formatTeamLeaveDuration = (leave: TeamLeaveRequest) => {
    if (leave.durationType === "half_day") {
      const segment =
        leave.halfDaySegment === "first_half" ? "First Half" : "Second Half";
      return `Half Day (${segment})`;
    }

    const days = leave.hours / 8;
    return `${formatLeaveDaysValue(days)} ${days === 1 ? "day" : "days"}`;
  };

  const getStatusBadge = (state: string) => {
    const configs = {
      pending: {
        dot: "bg-amber-400",
        text: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
        label: "Pending",
      },
      approved: {
        dot: "bg-emerald-400",
        text: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        label: "Approved",
      },
      rejected: {
        dot: "bg-red-400",
        text: "text-red-700",
        bg: "bg-red-50 border-red-200",
        label: "Declined",
      },
    };
    const c = configs[state as keyof typeof configs] ?? configs.rejected;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
          c.bg,
          c.text
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
        {c.label}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-secondary-background">
        <span className="text-sm font-medium text-foreground">Leave History</span>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[420px] text-sm">
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary-background">
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Period
              </TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminEmployeeHistory.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-3 py-4 text-center text-sm text-muted-foreground"
                >
                  No leave history found for this employee.
                </TableCell>
              </TableRow>
            ) : (
              adminEmployeeHistory.map((leave) => {
                const start = parseISO(leave.startDate);
                const end = parseISO(leave.endDate);
                const period =
                  leave.startDate === leave.endDate
                    ? format(start, "d MMM")
                    : `${format(start, "d MMM")} - ${format(end, "d MMM")}`;

                return (
                  <TableRow
                    key={leave.id}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell className="px-3 py-2.5 font-medium text-foreground">
                      {getDisplayLeaveTypeName(leave.leaveType?.name ?? "-")}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-muted-foreground">
                      {period}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-foreground">
                      {formatTeamLeaveDuration(leave)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {getStatusBadge(leave.state)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

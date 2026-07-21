"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, X, TreePalm } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaveRequest, LeaveBalanceItem, LeaveHistoryTableProps } from "@/lib/leave-types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function LeaveHistoryTable({
  leaveHistory,
  isLoading,
  balances,
}: LeaveHistoryTableProps) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [historyFromDate, setHistoryFromDate] = useState<Date | undefined>();
  const [historyToDate, setHistoryToDate] = useState<Date | undefined>();
  const [leavesPage, setLeavesPage] = useState(1);
  const leavesPageSize = 10;

  const leaveTypeOptions = useMemo(() => {
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

    const sortedBalances = [...visibleBalances].sort((a, b) => {
      const aKey = (a.leaveType?.name || "").toLowerCase();
      const bKey = (b.leaveType?.name || "").toLowerCase();
      const ai = priority.findIndex((p) => aKey.includes(p));
      const bi = priority.findIndex((p) => bKey.includes(p));
      return (
        (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
        aKey.localeCompare(bKey)
      );
    });

    const seen = new Set<string>();
    return sortedBalances
      .map((balance) => {
        const value = String(balance.leaveType?.name ?? "").trim();
        return {
          value,
          label: getDisplayLeaveTypeName(value),
        };
      })
      .filter((option) => {
        if (!option.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
  }, [balances]);

  const hasFilters =
    statusFilter !== "all" ||
    leaveTypeFilter !== "all" ||
    historyFromDate !== undefined ||
    historyToDate !== undefined;

  const clearFilters = () => {
    setStatusFilter("all");
    setLeaveTypeFilter("all");
    setHistoryFromDate(undefined);
    setHistoryToDate(undefined);
  };

  // Filtered leave requests
  const filteredLeaves = useMemo(() => {
    const effectiveFromDate =
      historyFromDate && historyToDate
        ? historyFromDate <= historyToDate
          ? historyFromDate
          : historyToDate
        : historyFromDate;
    const effectiveToDate =
      historyFromDate && historyToDate
        ? historyFromDate <= historyToDate
          ? historyToDate
          : historyFromDate
        : historyToDate;

    const fromStr = effectiveFromDate ? format(effectiveFromDate, "yyyy-MM-dd") : "";
    const toStr = effectiveToDate ? format(effectiveToDate, "yyyy-MM-dd") : "";

    return leaveHistory.filter((leave) => {
      const matchesLeaveType =
        leaveTypeFilter === "all" ||
        (leaveTypeFilter.toLowerCase() === "comp off"
          ? leave.leaveType?.name?.toLowerCase() === "comp off" ||
            leave.leaveType?.name?.toLowerCase() === "compensatory leave"
          : String(leave.leaveType?.name ?? "").trim().toLowerCase() ===
            leaveTypeFilter.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || leave.state === statusFilter;
      const matchesFrom = !fromStr || leave.endDate >= fromStr;
      const matchesTo = !toStr || leave.startDate <= toStr;
      return matchesLeaveType && matchesStatus && matchesFrom && matchesTo;
    });
  }, [leaveHistory, statusFilter, leaveTypeFilter, historyFromDate, historyToDate]);

  const leavesTotal = filteredLeaves.length;
  const leavesTotalPages = Math.max(1, Math.ceil(leavesTotal / leavesPageSize));
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const currentFilterKey = `${statusFilter}-${leaveTypeFilter}-${historyFromDate ? historyFromDate.getTime() : ""}-${historyToDate ? historyToDate.getTime() : ""}`;

  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setLeavesPage(1);
  }

  if (leavesPage > leavesTotalPages) {
    setLeavesPage(leavesTotalPages);
  }

  const paginatedLeaves = useMemo(() => {
    const start = (leavesPage - 1) * leavesPageSize;
    return filteredLeaves.slice(start, start + leavesPageSize);
  }, [filteredLeaves, leavesPage, leavesPageSize]);

  const formatDays = (leave: LeaveRequest) => {
    const days = leave.hours / 8;
    return `${formatLeaveDaysValue(days)}d`;
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
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <div className="px-4 py-3 border-b border-border bg-secondary-background flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Leave History</span>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {filteredLeaves.length}{" "}
            {filteredLeaves.length === 1 ? "record" : "records"}
          </span>
        )}
      </div>

      <div className="px-4 py-4 border-b border-border flex flex-wrap items-center gap-2">
        <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
          <SelectTrigger className="h-9 w-[170px] bg-background text-foreground border-border text-sm font-base">
            <SelectValue placeholder="All Leave Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leave Types</SelectItem>
            {leaveTypeOptions.map((leaveType) => (
              <SelectItem key={leaveType.value} value={leaveType.value}>
                {leaveType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 min-w-[170px] justify-start text-sm font-base",
                  !historyFromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                {historyFromDate
                  ? `From: ${format(historyFromDate, "d MMM yyyy")}`
                  : "From"}
                {historyFromDate && (
                  <span
                    role="button"
                    className="ml-auto h-4 w-4 rounded-full flex items-center justify-center hover:bg-secondary-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistoryFromDate(undefined);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0" align="start">
              <Calendar
                mode="single"
                selected={historyFromDate}
                onSelect={setHistoryFromDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 min-w-[170px] justify-start text-sm font-base",
                  !historyToDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                {historyToDate
                  ? `To: ${format(historyToDate, "d MMM yyyy")}`
                  : "To"}
                {historyToDate && (
                  <span
                    role="button"
                    className="ml-auto h-4 w-4 rounded-full flex items-center justify-center hover:bg-secondary-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistoryToDate(undefined);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0" align="start">
              <Calendar
                mode="single"
                selected={historyToDate}
                onSelect={setHistoryToDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] bg-background text-foreground border-border text-sm font-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full text-sm min-w-[600px]">
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                #
              </TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </TableHead>
              <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Period
              </TableHead>
              <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </TableHead>
              <TableHead className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow
                  key={i}
                  className="border-b border-border last:border-0"
                >
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j} className="px-4 py-3.5">
                      <div
                        className="h-4 bg-secondary-background rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <TreePalm className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No leave records found
                    </p>
                    {hasFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-0 text-xs font-normal text-foreground underline underline-offset-2 hover:bg-transparent"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeaves.map((leave, idx) => (
                <TableRow
                  key={leave.id}
                  className="border-b border-border last:border-0 hover:bg-secondary-background/60 transition-colors"
                >
                  <TableCell className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums">
                    {(leavesPage - 1) * leavesPageSize + idx + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className="font-medium text-foreground">
                      {getDisplayLeaveTypeName(leave.leaveType.name)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-foreground">
                    <span>{format(parseISO(leave.startDate), "d MMM yyyy")}</span>
                    {leave.startDate !== leave.endDate && (
                      <>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span>{format(parseISO(leave.endDate), "d MMM yyyy")}</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-md bg-secondary-background border border-border px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                      {formatDays(leave)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    {getStatusBadge(leave.state)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!isLoading && filteredLeaves.length > 0 && leavesTotalPages > 1 && (
        <div className="px-4 py-3 border-t border-border bg-secondary-background flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Showing {(leavesPage - 1) * leavesPageSize + 1}-
            {Math.min(leavesPage * leavesPageSize, leavesTotal)} of {leavesTotal}
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLeavesPage((p) => Math.max(1, p - 1))}
              disabled={leavesPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setLeavesPage((p) => Math.min(leavesTotalPages, p + 1))
              }
              disabled={leavesPage === leavesTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { isValid, parse, startOfDay } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CreditStatusMeta,
  CreditState,
  OffDayWorkTableProps,
  StatusOption,
  StatusFilter,
} from "@/lib/compofftype";
import { cn } from "@/lib/utils";

const todayStart = startOfDay(new Date()).getTime();
const june1stStart = startOfDay(new Date(2026, 5, 1)).getTime();
const getWorkDateStart = (workDate: string, workDateTs: number | null) => {
  if (workDateTs !== null) return workDateTs;
  const parsed = parse(workDate, "dd MMM yyyy", new Date());
  return isValid(parsed) ? startOfDay(parsed).getTime() : null;
};

const statusMeta: Record<CreditState, CreditStatusMeta> = {
  pending: { label: "Pending", className: "dashboard-status-pill dashboard-status-pill--yellow" },
  granted: { label: "Granted", className: "dashboard-status-pill dashboard-status-pill--green" },
  availed: { label: "Availed", className: "dashboard-status-pill dashboard-status-pill--khaki" },
  expired: { label: "Expired", className: "dashboard-status-pill dashboard-status-pill--red" },
  partial_availed: { label: "Partially Availed", className: "dashboard-status-pill dashboard-status-pill--orange" },
  warning: { label: "Warning", className: "dashboard-status-pill dashboard-status-pill--warning" },
};

const statusOptions: StatusOption[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "granted", label: "Granted" },
  { value: "availed", label: "Availed" },
  { value: "expired", label: "Expired" },
  { value: "partial_availed", label: "Partially Availed" },
  { value: "warning", label: "Warning" },
];

export function OffDayWorkTable({
  rows,
  showEmployee,
  searchValue,
  onSearchValueChange,
  statusFilter,
  onStatusFilterChange,
  searchPlaceholder,
  loading,
  error,
}: OffDayWorkTableProps) {
  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return [...rows]
      .filter((row) => {
        const matchesStatus = statusFilter === "all" || row.state === statusFilter;
        const workDateStart = getWorkDateStart(row.workDate, row.workDateTs);
        const isAfterJune1st = workDateStart !== null && workDateStart >= june1stStart;
        if (!query) return matchesStatus && isAfterJune1st;

        const haystack = [
          row.employeeName,
          row.employeeEmail,
          row.workDate,
          row.holidayType,
          row.rmRequest,
          row.timesheet,
          row.credited,
          row.availedOn,
          statusMeta[row.state].label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesStatus && isAfterJune1st && haystack.includes(query);
      })
      .sort((a, b) => {
        const aTs = getWorkDateStart(a.workDate, a.workDateTs) ?? 0;
        const bTs = getWorkDateStart(b.workDate, b.workDateTs) ?? 0;
        return bTs - aTs;
      });
  }, [rows, searchValue, statusFilter]);

  const expiringTodayCount = filteredRows.filter((row) => row.state === "granted" && row.expiresOnTs === todayStart).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchValueChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
            <SelectTrigger className="h-9 w-[160px] bg-background text-foreground border-border text-sm font-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {expiringTodayCount > 0 && (
          <p className="offday-dashboard-note mt-3 text-xs">
            {expiringTodayCount} comp-off leave {expiringTodayCount === 1 ? "expires" : "expire"}.
          </p>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="offday-dashboard-note text-xs p-3 bg-secondary-background/50 rounded-lg border border-border">
        Your comp-off will expire within one month from your work date.
      </div>

      <div className="offday-table-shell overflow-x-auto rounded-lg">
        <Table className="min-w-[920px] text-sm">
          <TableHeader>
            <TableRow className="offday-table-head">
              {showEmployee && <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Employee</TableHead>}
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Work Date</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Holiday</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Duration</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Timesheet</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Credited</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Availed On</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-inherit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-b border-border last:border-0">
                  {Array.from({ length: showEmployee ? 8 : 7 }).map((__, cellIndex) => (
                    <TableCell key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-secondary-background" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEmployee ? 8 : 7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No off-day work credits found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const meta = statusMeta[row.state];
                const isExpired = row.state === "expired";
                const expiresToday = row.state === "granted" && row.expiresOnTs === todayStart;

                return (
                  <TableRow key={row.id} className="border-b border-border last:border-0 hover:bg-secondary-background/40">
                    {showEmployee && (
                      <TableCell className="px-4 py-3.5 align-top">
                        <div className="font-medium text-foreground">{row.employeeName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeEmail || ""}</div>
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3.5 whitespace-nowrap text-foreground">{row.workDate}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{row.holidayType}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{row.rmRequest}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{row.timesheet}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{row.credited}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{row.availedOn ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className={meta.className}>{meta.label}</span>
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
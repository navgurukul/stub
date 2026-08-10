"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RefreshCw, AlertTriangle, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, addMonths } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoadingState } from "@/components/ui/table-loading-state";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { SalarySummaryRow } from "@/lib/config";
import { exportSalarySummaryCsv } from "@/lib/csv-helper";
import { AppPagination } from "@/components/ui/app-pagination";

export function AttendanceTab() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    const cycleStartsOn = 26;
    const cycleStart = new Date(today);
    if (today.getDate() < cycleStartsOn) {
      cycleStart.setMonth(today.getMonth() - 1);
    }
    cycleStart.setDate(cycleStartsOn);
    cycleStart.setHours(0, 0, 0, 0);
    return cycleStart;
  });

  const cycleDates = useMemo(() => {
    const start = currentMonth;
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setDate(25);
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
      displayStart: format(start, "dd/MM/yyyy"),
      displayEnd: format(end, "dd/MM/yyyy"),
    };
  }, [currentMonth]);

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const [rows, setRows] = useState<SalarySummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [emailSearch, setEmailSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Client-side Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const fetchSalarySummary = useCallback(async () => {
    const { start, end } = cycleDates;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(API_PATHS.SALARY_SUMMARY, {
        params: {
          startDate: start,
          endDate: end,
        },
      });

      if (response.data) {
        const list = Array.isArray(response.data.rows)
          ? response.data.rows
          : Array.isArray(response.data)
            ? response.data
            : [];
        setRows(list);
        setPage(1);
      }
    } catch (err: unknown) {
      console.error("Error fetching salary summary:", err);
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosError.response?.data?.message || axiosError.message || "Failed to fetch salary summary.";
      setError(msg);
      toast.error("Failed to load attendance", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [cycleDates]);

  useEffect(() => {
    fetchSalarySummary();
  }, [fetchSalarySummary]);

  const filteredRows = useMemo(() => {
    if (!emailSearch.trim()) return rows;
    const search = emailSearch.toLowerCase().trim();
    return rows.filter((row) => row.email.toLowerCase().includes(search));
  }, [rows, emailSearch]);

  const paginatedRows = useMemo(() => {
    return filteredRows.slice((page - 1) * limit, page * limit);
  }, [filteredRows, page, limit]);

  const total = filteredRows.length;
  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  const handleExportCsv = async () => {
    const { start, end } = cycleDates;
    setIsExporting(true);
    try {
      const response = await apiClient.get(API_PATHS.SALARY_SUMMARY, {
        params: {
          startDate: start,
          endDate: end,
        },
      });

      const list = Array.isArray(response.data.rows)
        ? response.data.rows
        : Array.isArray(response.data)
          ? response.data
          : [];

      if (!list.length) {
        toast.error("No data available to export");
        return;
      }
      exportSalarySummaryCsv(list, `salary-summary-${start}-to-${end}.csv`);

      toast.success("Salary summary exported successfully");
    } catch (err: unknown) {
      console.error("Error exporting salary summary:", err);
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || "Failed to export salary summary";
      toast.error("Export failed", {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };




  const getStatusBadgeStyle = (status?: string) => {
    const norm = (status || "").toLowerCase();
    if (norm === "active") {
      return "bg-[var(--color-green-bg)] text-[var(--color-green-text)] border-[var(--color-green-text)]/30 hover:bg-[var(--color-green-bg)]";
    }
    return "bg-[var(--color-red-bg)] text-[var(--color-red-text)] border-[var(--color-red-text)]/30 hover:bg-[var(--color-red-bg)]";
  };

  const getEmploymentBadgeStyle = (type?: string | null) => {
    if (!type) return "bg-[var(--color-gray-bg)] text-[var(--color-gray-text)] border-[var(--color-gray-text)]/30 hover:bg-[var(--color-gray-bg)]";
    return "bg-[var(--color-blue-bg)] text-[var(--color-blue-text)] border-[var(--color-blue-text)]/30 hover:bg-[var(--color-blue-bg)]";
  };

  const formatDateString = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="w-full border-2 border-border rounded-base bg-background shadow-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Attendance & Salary Summary</CardTitle>
        <CardDescription>
          Track working hours, attendance cycles, leaves (Earned, Special, Comp-off, LWP), and payable days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Panel */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search by Employee Email..."
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-9 rounded-lg border border-[#e4e4e7] bg-[#f9f9fb] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#a1a1aa] h-10 w-full"
              />
              {emailSearch && (
                <button
                  onClick={() => {
                    setEmailSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Period navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePreviousMonth}
                disabled={loading}
                className="h-10 w-10 rounded-lg border border-[#e4e4e7] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <div className="px-4 py-1.5 h-10 flex items-center justify-center rounded-lg border border-[#e4e4e7] bg-white text-xs font-medium text-neutral-800 whitespace-nowrap tabular-nums min-w-[180px] text-center">
                {cycleDates.displayStart} — {cycleDates.displayEnd}
              </div>
              <button
                onClick={handleNextMonth}
                disabled={loading}
                className="h-10 w-10 rounded-lg border border-[#e4e4e7] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSalarySummary}
              disabled={loading}
              className="h-10 border border-[#e4e4e7] rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExporting || loading || rows.length === 0}
              className="flex-shrink-0 h-10 border border-[#e4e4e7] rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            >
              {isExporting ? <Spinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <TableLoadingState
              columns={[
                { header: "User ID", skeletonWidth: "w-16" },
                { header: "Employee Email", skeletonWidth: "w-44" },
                { header: "Employment Type", skeletonWidth: "w-24" },
                { header: "Joining Date", skeletonWidth: "w-24" },
                { header: "Exit Date", skeletonWidth: "w-24" },
                { header: "Status", skeletonWidth: "w-16" },
                { header: "Expected Attendance", skeletonWidth: "w-24" },
                { header: "Cycle", skeletonWidth: "w-24" },
                { header: "Total Hours", skeletonWidth: "w-20" },
                { header: "Total Working Days", skeletonWidth: "w-24" },
                { header: "Earned Leave", skeletonWidth: "w-16" },
                { header: "Special Leave", skeletonWidth: "w-16" },
                { header: "Comp-off Leaves", skeletonWidth: "w-16" },
                { header: "Week Off", skeletonWidth: "w-16" },
                { header: "Total Payable Days", skeletonWidth: "w-24" },
                { header: "LWP", skeletonWidth: "w-16" },
              ]}
              rowCount={8}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-200 rounded-base bg-red-50 text-red-700">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-bold">Error Loading Attendance</p>
            <p className="text-sm mt-1 text-center max-w-md">{error}</p>
            <Button size="sm" className="mt-4" onClick={fetchSalarySummary}>
              Retry
            </Button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-base bg-background/50 text-center">
            <AlertTriangle className="h-10 w-10 text-muted mb-2" />
            <h3 className="text-lg font-bold">No Records Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              No attendance summary data is available for the selected parameters.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[1500px]">
                <TableHeader className="bg-secondary-background">
                  <TableRow>
                    <TableHead className="font-bold text-foreground text-center">User ID</TableHead>
                    <TableHead className="font-bold text-foreground min-w-[240px]">Employee Email</TableHead>
                    <TableHead className="font-bold text-foreground">Employment Type</TableHead>
                    <TableHead className="font-bold text-foreground">Joining Date</TableHead>
                    <TableHead className="font-bold text-foreground">Exit Date</TableHead>
                    <TableHead className="font-bold text-foreground">Status</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Expected Attendance</TableHead>
                    <TableHead className="font-bold text-foreground">Cycle</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Total Hours</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Working Days</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Earned Leave</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Special Leave</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Comp-off Leaves</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Week Off</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Payable Days</TableHead>
                    <TableHead className="font-bold text-foreground text-center">LWP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow key={row.userId} className="hover:bg-secondary-background/50">
                      <TableCell className="text-center font-medium tabular-nums">{row.userId}</TableCell>
                      <TableCell className="font-medium min-w-[240px] truncate" title={row.email}>
                        {row.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEmploymentBadgeStyle(row.employmentType)}>
                          {row.employmentType || "Not Specified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateString(row.joiningDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateString(row.exitDate)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeStyle(row.status)}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold tabular-nums">{row.expectedAttendance}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateString(row.cycle)}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.totalHours}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.totalWorkingDays}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 font-semibold">{row.earnLeave}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 font-semibold">{row.specialLeave}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 font-semibold">{row.compOffLeaves}</TableCell>
                      <TableCell className="text-center tabular-nums text-neutral-600">{row.weekOff}</TableCell>
                      <TableCell className="text-center font-bold text-neutral-900 tabular-nums">{row.totalPayableDays}</TableCell>
                      <TableCell className="text-center tabular-nums text-red-600 font-semibold">{row.lwp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <AppPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          loading={loading}
          itemLabel="employee"
          itemLabelPlural="employees"
        />
      </CardContent>
    </Card>
  );
}

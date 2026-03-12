"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
} from "lucide-react";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

// TypeScript interfaces for API response
interface TimesheetEntry {
  departmentName: string;
  projectName?: string;
  taskDescription: string;
  hours: number;
}

interface LeaveEntry {
  leaveType: {
    name: string;
    code?: string;
  };
  hours: number;
  state?: string;
}

interface DayData {
  date: string;
  isWorkingDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  timesheet: {
    id: number;
    state: string;
    totalHours: number;
    notes: string;
    entries: TimesheetEntry[];
  } | null;
  leaves: {
    totalHours: number;
    entries: LeaveEntry[];
  } | null;
}

interface MonthlyTimesheetResponse {
  user: {
    id: number;
    name: string;
    departmentId: number;
  };
  period: {
    year: number;
    month: number;
    start: string;
    end: string;
  };
  totals: {
    timesheetHours: number;
    leaveHours: number;
    totalPayableDays: number;
  };
  days: DayData[];
}

// Flattened row for table display
interface TimesheetRow {
  sno: number;
  project: string;
  activities: string;
  date: string;
  day: string;
  hours: number;
  isLeave: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  leaveStatus?: "approved" | "pending" | "rejected";
  timesheetState?: string;
}

/**
 * Minimal in-file TimesheetTable component to satisfy imports and typing.
 * This keeps the DashboardPage working when the external module is missing.
 */
type TimesheetTableProps = {
  user: any;
  monthlyData: MonthlyTimesheetResponse | null;
  timesheetRows: TimesheetRow[];
  isLoading: boolean;
  error: string | null;
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRetry: () => void;
};

export const TimesheetTable: React.FC<TimesheetTableProps> = ({
  user,
  monthlyData,
  timesheetRows,
  isLoading,
  error,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div>Loading timesheet...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-red-600">Error: {error}</div>
          <button onClick={onRetry} className="mt-2 underline cursor-pointer">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onPreviousMonth} className="mr-2 cursor-pointer">
              Previous
            </button>
            <button onClick={onNextMonth} className="cursor-pointer">
              Next
            </button>
          </div>
          <div className="text-sm">{format(currentMonth, "MMMM yyyy")}</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Date</th>
                <th className="text-left">Day</th>
                <th className="text-left">Project</th>
                <th className="text-left">Activity</th>
                <th className="text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {timesheetRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No records for this month.
                  </td>
                </tr>
              ) : (
                timesheetRows.map((r) => (
                  <tr key={r.sno}>
                    <td>{r.sno}</td>
                    <td>{r.date}</td>
                    <td>{r.day}</td>
                    <td>{r.project}</td>
                    <td>{r.activities}</td>
                    <td className="text-right">{r.hours}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { isLoading: authLoading, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [monthlyData, setMonthlyData] =
    useState<MonthlyTimesheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("timesheet-view-mode");
      if (saved === "table" || saved === "grid") return saved;
    }
    return "table";
  });

  // Check if user is admin or super admin
  const isAdminOrSuperAdmin = useMemo(() => {
    const roles = (user as any)?.roles;
    if (Array.isArray(roles)) {
      return roles.includes("admin") || roles.includes("super_admin");
    }
    if (typeof roles === "string") {
      return roles === "admin" || roles === "super_admin";
    }
    return false;
  }, [user]);

  // Fetch timesheet data
  useEffect(() => {
    if (authLoading) return;

    const fetchMonthlyData = async () => {
      const id = ++fetchIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

        const response = await apiClient.get<MonthlyTimesheetResponse>(
          API_PATHS.MONTHLY_TIMESHEET,
          {
            params: { year, month },
          }
        );

        if (id !== fetchIdRef.current) return;
        setMonthlyData(response.data);
      } catch (err: unknown) {
        if (id !== fetchIdRef.current) return;
        console.error("Error fetching monthly data:", err);
        const error = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to load monthly data";
        setError(errorMessage);
        toast.error("Failed to load activities", {
          description: errorMessage,
        });
      } finally {
        if (id !== fetchIdRef.current) return;
        setIsLoading(false);
      }
    };

    fetchMonthlyData();
  }, [currentMonth, authLoading]);

  // Flatten data into table rows
  const timesheetRows = useMemo((): TimesheetRow[] => {
    if (!monthlyData) return [];

    const rows: TimesheetRow[] = [];
    let sno = 1;
    const sortedDays = [...monthlyData.days].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedDays.forEach((day) => {
      const parsedDate = parseISO(day.date);
      const dayOfWeek = format(parsedDate, "EEEE");
      const dayOfMonth = parsedDate.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      const isSaturday = dayOfWeek === "Saturday";
      const is2ndOr4thSaturday =
        isSaturday && (weekOfMonth === 2 || weekOfMonth === 4);
      const isSunday = dayOfWeek === "Sunday";
      const isWeekendOff = is2ndOr4thSaturday || isSunday;

      // Add timesheet entries
      if (day.timesheet?.entries && day.timesheet.entries.length > 0) {
        day.timesheet.entries.forEach((entry) => {
          rows.push({
            sno: sno++,
            project: entry.projectName || "-",
            activities: entry.taskDescription || "-",
            date: format(parsedDate, "dd/MM/yyyy"),
            day: dayOfWeek,
            hours: entry.hours,
            isLeave: false,
            isWeekend: isWeekendOff,
            isHoliday: day.isHoliday,
            timesheetState: day.timesheet?.state,
          });
        });
      }

      // Add leave entries
      if (day.leaves?.entries && day.leaves.entries.length > 0) {
        day.leaves.entries.forEach((entry) => {
          const leaveStatus =
            (entry as any).state === "rejected"
              ? "rejected"
              : (entry as any).state === "pending"
              ? "pending"
              : "approved";

          rows.push({
            sno: sno++,
            project: "-",
            activities: `Leave - ${entry.leaveType.name}`,
            date: format(parsedDate, "dd/MM/yyyy"),
            day: dayOfWeek,
            hours: entry.hours,
            isLeave: true,
            isWeekend: isWeekendOff,
            isHoliday: day.isHoliday,
            leaveStatus: leaveStatus,
          });
        });
      }

      // Add weekend/holiday rows if no entries exist
      if (
        (isWeekendOff || day.isHoliday) &&
        (!day.timesheet?.entries || day.timesheet.entries.length === 0) &&
        (!day.leaves?.entries || day.leaves.entries.length === 0)
      ) {
        let offType = "";
        if (day.isHoliday) {
          offType = day.holidayName
            ? `Holiday (${day.holidayName})`
            : "Holiday";
        } else if (isSunday) {
          offType = "Sunday";
        } else if (is2ndOr4thSaturday) {
          offType = "Saturday (Off)";
        }

        rows.push({
          sno: sno++,
          project: "-",
          activities: offType,
          date: format(parsedDate, "dd/MM/yyyy"),
          day: dayOfWeek,
          hours: 0,
          isLeave: false,
          isWeekend: isWeekendOff,
          isHoliday: day.isHoliday,
          holidayName: day.holidayName,
        });
      }
    });

    return rows;
  }, [monthlyData]);

  const leaveDaysDisplay = useMemo(() => {
    if (!monthlyData) return 0;
    const days = monthlyData.totals.leaveHours / 8;
    return Number.isInteger(days) ? days : Number(days.toFixed(1));
  }, [monthlyData]);

  // Add new useMemo for total cycle days
  const totalCycleDays = useMemo(() => {
    if (!monthlyData) return 0;
    const start = parseISO(monthlyData.period.start);
    const end = parseISO(monthlyData.period.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [monthlyData]);

  const payableDays = useMemo(() => {
    if (!monthlyData) return 0;
    return monthlyData.totals.totalPayableDays || 0;
  }, [monthlyData]);

  const handleSalarySummaryExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiClient.get(API_PATHS.SALARY_SUMMARY, {
        params: {
          startDate,
          endDate,
        },
        responseType: "blob",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `salary-summary-${startDate}-to-${endDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Salary summary exported successfully");
    } catch (err: unknown) {
      console.error("Error exporting salary summary:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to export salary summary";
      toast.error("Export failed", {
        description: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  return (
    <>
      <AppHeader crumbs={[{ label: "Dashboard" }]} />
      <PageWrapper>
        <div className="flex w-full justify-center p-4">
          <div className="w-full max-w-7xl space-y-6">
            {/* Header for Statistics - Data cycle info */}
            <div className="mb-3">
              <p className="text-sm text-muted-foreground">
                Data shown is according to cycle: 26th to 25th of the month
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-border">
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Hours Logged
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {monthlyData?.totals.timesheetHours || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Leave Days
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {leaveDaysDisplay}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Lifelines Remaining
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {user?.backfill?.remaining ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      out of {user?.backfill?.limit ?? 0} available
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Payable Days
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {payableDays}/{totalCycleDays}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timesheet Table View */}
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 sm:p-6">
                {/* Header Section */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="space-y-0.5">
                      <h2 className="text-xl font-semibold text-foreground">
                        Timesheet
                      </h2>
                      <p className="text-sm text-muted-foreground break-all">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                      {/* View toggle */}
                      <div className="flex items-center border border-border rounded-[4px] overflow-hidden">
                        <button
                          onClick={() => {
                            setViewMode("table");
                            localStorage.setItem(
                              "timesheet-view-mode",
                              "table"
                            );
                          }}
                          title="Table view"
                          className={`h-7 w-7 flex items-center justify-center transition-colors cursor-pointer ${
                            viewMode === "table"
                              ? "bg-foreground text-background"
                              : "bg-transparent hover:bg-secondary-background text-foreground"
                          }`}
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setViewMode("grid");
                            localStorage.setItem("timesheet-view-mode", "grid");
                          }}
                          title="Grid view"
                          className={`h-7 w-7 flex items-center justify-center transition-colors cursor-pointer ${
                            viewMode === "grid"
                              ? "bg-foreground text-background"
                              : "bg-transparent hover:bg-secondary-background text-foreground"
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={handlePreviousMonth}
                        disabled={isLoading}
                        className="h-7 w-7 bg-transparent hover:bg-secondary-background border border-border rounded-[4px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                      </button>
                      <div className="text-center px-3 py-1.5 rounded-[4px] border border-border bg-background">
                        {monthlyData?.period && (
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(
                              parseISO(monthlyData.period.start),
                              "dd/MM/yyyy"
                            )}{" "}
                            -{" "}
                            {format(
                              parseISO(monthlyData.period.end),
                              "dd/MM/yyyy"
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleNextMonth}
                        disabled={isLoading}
                        className="h-7 w-7 bg-transparent hover:bg-secondary-background border border-border rounded-[4px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Section */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 bg-background rounded-[4px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-foreground"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-16 bg-background rounded-[4px]">
                    <p className="text-accent mb-4 text-sm">{error}</p>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentMonth(new Date(currentMonth))}
                    >
                      Retry
                    </Button>
                  </div>
                ) : timesheetRows.length === 0 && viewMode === "table" ? (
                  <div className="text-center py-16 bg-background rounded-[4px] border border-border">
                    <p className="text-muted-foreground text-sm">
                      No records found for this month
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  /* Grid View — built from raw monthlyData.days so unfilled days appear too */
                  (() => {
                    const sortedGridDays = [...(monthlyData?.days ?? [])].sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );

                    const todayMidnight = new Date();
                    todayMidnight.setHours(0, 0, 0, 0);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sortedGridDays.map((day) => {
                          const parsedDate = parseISO(day.date);
                          const dayOfWeek = format(parsedDate, "EEEE");
                          const displayDate = format(parsedDate, "dd/MM/yyyy");
                          const dayOfMonth = parsedDate.getDate();
                          const weekOfMonth = Math.ceil(dayOfMonth / 7);
                          const isSaturday = dayOfWeek === "Saturday";
                          const is2ndOr4thSaturday =
                            isSaturday &&
                            (weekOfMonth === 2 || weekOfMonth === 4);
                          const isSunday = dayOfWeek === "Sunday";
                          const isWeekendOff = is2ndOr4thSaturday || isSunday;

                          const hasTimesheet =
                            (day.timesheet?.entries?.length ?? 0) > 0;
                          const hasLeave =
                            (day.leaves?.entries?.length ?? 0) > 0;
                          const isOff = isWeekendOff || day.isHoliday;
                          const isUnfilled =
                            !hasTimesheet && !hasLeave && !isOff;

                          const isToday =
                            parsedDate.getFullYear() ===
                              todayMidnight.getFullYear() &&
                            parsedDate.getMonth() ===
                              todayMidnight.getMonth() &&
                            parsedDate.getDate() === todayMidnight.getDate();

                          // Card background
                          let cardBg = "var(--background)";
                          if (isUnfilled)
                            cardBg = "var(--secondary-background)";
                          else if (day.timesheet?.state === "rejected")
                            cardBg = "var(--color-red-bg)";
                          else if (isOff) cardBg = "var(--color-green-bg)";

                          const timesheetEntries = day.timesheet?.entries ?? [];
                          const leaveEntries = day.leaves?.entries ?? [];
                          const totalHours =
                            timesheetEntries.reduce((s, e) => s + e.hours, 0) +
                            leaveEntries.reduce((s, e) => s + e.hours, 0);

                          let offLabel = "";
                          if (day.isHoliday)
                            offLabel = day.holidayName
                              ? `Holiday — ${day.holidayName}`
                              : "Holiday";
                          else if (isSunday) offLabel = "Sunday";
                          else if (is2ndOr4thSaturday)
                            offLabel = "Saturday (Off)";

                          return (
                            <div
                              key={day.date}
                              className="rounded-[6px] overflow-hidden"
                              style={{
                                backgroundColor: cardBg,
                                border: isToday
                                  ? "1.5px solid var(--muted)"
                                  : "1px solid var(--border)",
                              }}
                            >
                              {/* Card header */}
                              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-foreground">
                                    {displayDate}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {dayOfWeek}
                                  </p>
                                </div>
                                {totalHours > 0 && (
                                  <span className="text-xs font-bold text-foreground">
                                    {totalHours}h
                                  </span>
                                )}
                              </div>

                              {/* Body */}
                              <div className="divide-y divide-border">
                                {isOff && !hasTimesheet && !hasLeave && (
                                  <div className="px-3 py-2">
                                    <p className="text-xs text-muted-foreground">
                                      {offLabel}
                                    </p>
                                  </div>
                                )}
                                {isUnfilled && (
                                  <div className="px-3 py-2">
                                    <p className="text-xs text-muted-foreground italic">
                                      No entry
                                    </p>
                                  </div>
                                )}
                                {timesheetEntries.map((entry, i) => (
                                  <div
                                    key={`ts-${i}`}
                                    className="px-3 py-2 space-y-0.5"
                                  >
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {entry.projectName || "-"}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {entry.taskDescription || "-"}
                                    </p>
                                    <div className="flex items-center justify-between pt-0.5">
                                      <span className="text-xs text-muted-foreground">
                                        {entry.hours}h
                                      </span>
                                      {day.timesheet?.state === "rejected" && (
                                        <span className="text-xs text-accent font-medium">
                                          Rejected
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {leaveEntries.map((entry, i) => {
                                  const leaveStatus =
                                    (entry as any).state === "rejected"
                                      ? "rejected"
                                      : (entry as any).state === "pending"
                                      ? "pending"
                                      : "approved";
                                  const leaveBg =
                                    leaveStatus === "rejected"
                                      ? "var(--color-red-bg)"
                                      : leaveStatus === "pending"
                                      ? "var(--color-yellow-bg)"
                                      : undefined;
                                  return (
                                    <div
                                      key={`lv-${i}`}
                                      className="px-3 py-2 space-y-0.5"
                                      style={
                                        leaveBg
                                          ? { backgroundColor: leaveBg }
                                          : undefined
                                      }
                                    >
                                      <p className="text-xs font-medium text-foreground truncate">
                                        Leave — {entry.leaveType.name}
                                      </p>
                                      <div className="flex items-center justify-between pt-0.5">
                                        <span className="text-xs text-muted-foreground">
                                          {entry.hours}h
                                        </span>
                                        {leaveStatus === "pending" && (
                                          <span className="text-xs text-yellow-text font-medium">
                                            Pending
                                          </span>
                                        )}
                                        {leaveStatus === "rejected" && (
                                          <span className="text-xs text-accent font-medium">
                                            Rejected
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap w-16">
                              Sr
                            </TableHead>
                            <TableHead className="whitespace-nowrap w-28">
                              Date
                            </TableHead>
                            <TableHead className="whitespace-nowrap w-28">
                              Day
                            </TableHead>
                            <TableHead className="whitespace-nowrap w-32">
                              Project
                            </TableHead>
                            <TableHead className="whitespace-nowrap w-20 text-center">
                              Hours
                            </TableHead>
                            <TableHead>Activities</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timesheetRows.map((row, index) => {
                            // Check if this row has the same date as the previous/next row
                            const prevRow =
                              index > 0 ? timesheetRows[index - 1] : null;
                            const nextRow =
                              index < timesheetRows.length - 1
                                ? timesheetRows[index + 1]
                                : null;
                            const isSameDateAsPrev =
                              prevRow && prevRow.date === row.date;
                            const isSameDateAsNext =
                              nextRow && nextRow.date === row.date;

                            let bgColor: string | undefined;
                            let isColored = false;

                            if (
                              (row.isLeave && row.leaveStatus === "rejected") ||
                              row.timesheetState === "rejected"
                            ) {
                              isColored = true;
                            } else if (
                              row.isLeave &&
                              row.leaveStatus === "pending"
                            ) {
                              isColored = true;
                            } else if (
                              row.isHoliday ||
                              row.isWeekend ||
                              (row.isLeave && row.leaveStatus === "approved")
                            ) {
                              bgColor = "var(--color-green-bg)";
                              isColored = true;
                            } else {
                              bgColor = "var(--background)";
                            }

                            return (
                              <TableRow
                                key={`${row.date}-${index}`}
                                style={{
                                  backgroundColor: bgColor,
                                  borderBottom: isSameDateAsNext
                                    ? "none"
                                    : undefined,
                                }}
                                className={isColored ? "hover:opacity-95" : ""}
                              >
                                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                                  {row.sno}
                                </TableCell>

                                <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                                  {!isSameDateAsPrev ? row.date : ""}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                                  {!isSameDateAsPrev ? row.day : ""}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                                  {row.project}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-sm text-foreground text-center font-medium whitespace-nowrap">
                                  {row.hours}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-sm text-foreground">
                                  {row.activities}
                                  {row.leaveStatus === "pending" && (
                                    <span className=" font-bold">
                                      (Pending)
                                    </span>
                                  )}
                                  {row.leaveStatus === "rejected" && (
                                    <span className="font-bold">
                                      (Rejected)
                                    </span>
                                  )}
                                  {row.leaveStatus === "approved" && (
                                    <span className="font-bold">
                                      (Approved)
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-2 max-h-[60vh] overflow-y-auto">
                      {timesheetRows.map((row, index) => {
                        // Check if this row has the same date as the previous row
                        const prevRow =
                          index > 0 ? timesheetRows[index - 1] : null;
                        const isSameDateAsPrev =
                          prevRow && prevRow.date === row.date;

                        let bgColor = undefined;

                        if (
                          (row.isLeave && row.leaveStatus === "rejected") ||
                          row.timesheetState === "rejected"
                        ) {
                          bgColor = "var(--color-red-bg)";
                        } else if (
                          row.isLeave &&
                          row.leaveStatus === "pending"
                        ) {
                          bgColor = "var(--color-yellow-bg)";
                        } else if (
                          row.isHoliday ||
                          row.isWeekend ||
                          (row.isLeave && row.leaveStatus === "approved")
                        ) {
                          bgColor = "var(--color-green-bg)";
                        } else {
                          bgColor = "var(--background)";
                        }

                        return (
                          <div
                            key={`${row.date}-${index}`}
                            className="border border-border rounded-[4px] p-4 space-y-2"
                            style={{ backgroundColor: bgColor }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5 flex-1">
                                <p className="text-xs text-muted-foreground">
                                  #{row.sno}
                                </p>
                                {!isSameDateAsPrev && (
                                  <p className="text-sm font-medium text-foreground">
                                    {row.date} - {row.day}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-foreground">
                                  {row.hours}h
                                </p>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs text-muted-foreground">
                                Project
                              </p>
                              <p className="text-sm text-foreground">
                                {row.project}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs text-muted-foreground">
                                Activities
                              </p>
                              <p className="text-sm text-foreground">
                                {row.activities}
                                {row.leaveStatus === "pending" && (
                                  <span>(Pending)</span>
                                )}
                                {row.leaveStatus === "rejected" && (
                                  <span>(Rejected)</span>
                                )}
                                {row.leaveStatus === "approved" && (
                                  <span>(Approved)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

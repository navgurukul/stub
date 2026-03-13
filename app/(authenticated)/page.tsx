"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Briefcase,
  Calendar,
  Clock,
  AlertCircle,
  TreePalm,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);

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
        <div className="p-4 md:p-6 space-y-5">
          {/* Cycle chip */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary-background border border-border px-3 py-1.5 rounded-full">
              <Clock className="h-3 w-3 flex-shrink-0" />
              Billing cycle: 26th to 25th of the month
            </span>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Hours Logged",
                display: String(monthlyData?.totals.timesheetHours || 0),
                unit: "hrs",
                sub: "this cycle",
                icon: Clock,
                accent: "border-l-[#74808e]",
                iconBg: "bg-[#e5edf5]",
                iconColor: "text-[#74808e]",
              },
              {
                label: "Leave Days",
                display: String(leaveDaysDisplay),
                unit: "days",
                sub: "this cycle",
                icon: TreePalm,
                accent: "border-l-amber-400",
                iconBg: "bg-amber-50",
                iconColor: "text-amber-600",
              },
              {
                label: "Lifelines",
                display: String(user?.backfill?.remaining ?? 0),
                unit: "",
                sub: `of ${user?.backfill?.limit ?? 0} available`,
                icon: AlertCircle,
                accent: (user?.backfill?.remaining ?? 0) > 0 ? "border-l-emerald-400" : "border-l-amber-400",
                iconBg: (user?.backfill?.remaining ?? 0) > 0 ? "bg-emerald-50" : "bg-amber-50",
                iconColor: (user?.backfill?.remaining ?? 0) > 0 ? "text-emerald-600" : "text-amber-600",
              },
              {
                label: "Payable Days",
                display: `${payableDays}/${totalCycleDays}`,
                unit: "",
                sub: "this cycle",
                icon: Briefcase,
                accent: "border-l-[#8a6f5e]",
                iconBg: "bg-[#f0ebe3]",
                iconColor: "text-[#8a6f5e]",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={cn(
                    "bg-background border border-border border-l-4 rounded-lg p-4 transition-shadow hover:shadow-sm",
                    card.accent
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                      {card.label}
                    </span>
                    <span className={cn("p-1.5 rounded-md flex-shrink-0", card.iconBg)}>
                      <Icon className={cn("h-3.5 w-3.5", card.iconColor)} />
                    </span>
                  </div>
                  {isLoading ? (
                    <div className="h-8 w-16 bg-secondary-background rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                      {card.display}
                      {card.unit && (
                        <span className="text-sm font-normal text-muted-foreground ml-1">{card.unit}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Timesheet */}
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            {/* Timesheet header */}
            <div className="px-5 py-4 border-b border-border bg-secondary-background">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Timesheet</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* View toggle */}
                  <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => {
                        setViewMode("table");
                        localStorage.setItem("timesheet-view-mode", "table");
                      }}
                      title="List view"
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                        viewMode === "table"
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("grid");
                        localStorage.setItem("timesheet-view-mode", "grid");
                      }}
                      title="Grid view"
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                        viewMode === "grid"
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Period navigation */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePreviousMonth}
                      disabled={isLoading}
                      className="h-7 w-7 rounded-md border border-border bg-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-background transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 text-foreground" />
                    </button>
                    <div className="px-3 py-1 rounded-md border border-border bg-background text-xs text-foreground whitespace-nowrap tabular-nums min-w-[160px] text-center">
                      {monthlyData?.period ? (
                        <>
                          {format(parseISO(monthlyData.period.start), "dd/MM/yyyy")}
                          {" — "}
                          {format(parseISO(monthlyData.period.end), "dd/MM/yyyy")}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <button
                      onClick={handleNextMonth}
                      disabled={isLoading}
                      className="h-7 w-7 rounded-md border border-border bg-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-background transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timesheet content */}
            <div className="p-4 sm:p-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth))}>
                    Retry
                  </Button>
                </div>
              ) : timesheetRows.length === 0 && viewMode === "table" ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">No records found for this period</p>
                </div>
              ) : viewMode === "grid" ? (
                  /* Calendar Week View — organized by weeks with day cards */
                  (() => {
                    const sortedGridDays = [...(monthlyData?.days ?? [])].sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );

                    const todayMidnight = new Date();
                    todayMidnight.setHours(0, 0, 0, 0);

                    // Group days by week
                    const weeks: (typeof sortedGridDays)[] = [];
                    let currentWeek: typeof sortedGridDays = [];
                    let currentWeekNum = 0;

                    sortedGridDays.forEach((day) => {
                      const parsedDate = parseISO(day.date);
                      const dayOfMonth = parsedDate.getDate();
                      const weekNum = Math.ceil(dayOfMonth / 7);

                      if (
                        weekNum !== currentWeekNum &&
                        currentWeek.length > 0
                      ) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                      }
                      currentWeekNum = weekNum;
                      currentWeek.push(day);
                    });
                    if (currentWeek.length > 0) {
                      weeks.push(currentWeek);
                    }

                    // Helper to get day card data
                    const getDayCardData = (
                      day: (typeof sortedGridDays)[0]
                    ) => {
                      const parsedDate = parseISO(day.date);
                      const dayOfWeek = format(parsedDate, "EEEE");
                      const dayShort = format(parsedDate, "EEE");
                      const displayDate = format(parsedDate, "dd");
                      const dayOfMonth = parsedDate.getDate();
                      const weekOfMonth = Math.ceil(dayOfMonth / 7);
                      const isSaturday = dayOfWeek === "Saturday";
                      const is2ndOr4thSaturday =
                        isSaturday && (weekOfMonth === 2 || weekOfMonth === 4);
                      const isSunday = dayOfWeek === "Sunday";
                      const isWeekendOff = is2ndOr4thSaturday || isSunday;

                      const hasTimesheet =
                        (day.timesheet?.entries?.length ?? 0) > 0;
                      const hasLeave = (day.leaves?.entries?.length ?? 0) > 0;
                      const isOff = isWeekendOff || day.isHoliday;
                      const isUnfilled = !hasTimesheet && !hasLeave && !isOff;

                      const isToday =
                        parsedDate.getFullYear() ===
                          todayMidnight.getFullYear() &&
                        parsedDate.getMonth() === todayMidnight.getMonth() &&
                        parsedDate.getDate() === todayMidnight.getDate();

                      const timesheetEntries = day.timesheet?.entries ?? [];
                      const leaveEntries = day.leaves?.entries ?? [];
                      const totalHours =
                        timesheetEntries.reduce((s, e) => s + e.hours, 0) +
                        leaveEntries.reduce((s, e) => s + e.hours, 0);

                      let status:
                        | "off"
                        | "unfilled"
                        | "filled"
                        | "rejected"
                        | "pending" = "filled";
                      if (isOff) status = "off";
                      else if (isUnfilled) status = "unfilled";
                      else if (day.timesheet?.state === "rejected")
                        status = "rejected";
                      else if (
                        leaveEntries.some((e: any) => e.state === "rejected")
                      )
                        status = "rejected";
                      else if (
                        leaveEntries.some((e: any) => e.state === "pending")
                      )
                        status = "pending";

                      return {
                        day,
                        parsedDate,
                        dayOfWeek,
                        dayShort,
                        displayDate,
                        isOff,
                        isUnfilled,
                        isToday,
                        totalHours,
                        status,
                        timesheetEntries,
                        leaveEntries,
                        isHoliday: day.isHoliday,
                        holidayName: day.holidayName,
                        is2ndOr4thSaturday,
                        isSunday,
                      };
                    };

                    return (
                      <div className="space-y-4">
                        {weeks.map((weekDays, weekIndex) => {
                          const weekData = weekDays.map(getDayCardData);
                          const weekTotalHours = weekData.reduce(
                            (sum, d) => sum + d.totalHours,
                            0
                          );
                          const unfilledCount = weekData.filter(
                            (d) => d.isUnfilled
                          ).length;

                          return (
                            <div
                              key={weekIndex}
                              className="rounded-[4px] border border-border overflow-hidden"
                              style={{ backgroundColor: "var(--background)" }}
                            >
                              {/* Week Header */}
                              <div
                                className="px-3 py-2 border-b border-border flex items-center justify-between"
                                style={{
                                  backgroundColor:
                                    "var(--secondary-background)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs font-semibold uppercase tracking-wide"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    Week {weekIndex + 1}
                                  </span>
                                  <span
                                    className="text-xs"
                                    style={{ color: "var(--muted)" }}
                                  >
                                    {format(weekData[0].parsedDate, "MMM dd")} —{" "}
                                    {format(
                                      weekData[weekData.length - 1].parsedDate,
                                      "MMM dd"
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  {weekTotalHours > 0 && (
                                    <span style={{ color: "var(--muted)" }}>
                                      {weekTotalHours}h
                                    </span>
                                  )}
                                  {unfilledCount > 0 && (
                                    <span
                                      className="font-medium"
                                      style={{
                                        color: "var(--color-orange-text)",
                                      }}
                                    >
                                      {unfilledCount} pending
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Week Days Grid */}
                              <div
                                className="grid grid-cols-7 divide-x divide-border"
                                style={{ borderColor: "var(--border)" }}
                              >
                                {weekData.map((dayData) => {
                                  // Determine cell background
                                  let cellBg = "var(--background)";
                                  if (dayData.isOff)
                                    cellBg = "var(--secondary-background)";
                                  else if (dayData.isUnfilled)
                                    cellBg = "var(--secondary-background)";
                                  else if (dayData.status === "rejected")
                                    cellBg = "var(--color-red-bg)";
                                  else if (dayData.status === "pending")
                                    cellBg = "var(--color-yellow-bg)";

                                  return (
                                    <div
                                      key={dayData.day.date}
                                      className="min-h-[100px] p-2 relative cursor-pointer hover:brightness-[0.98] transition-all rounded-[4px]"
                                      style={{
                                        backgroundColor: cellBg,
                                        borderColor: "var(--border)",
                                        boxShadow: dayData.isToday
                                          ? "inset 0 0 0 1.5px var(--foreground)"
                                          : undefined,
                                      }}
                                      onClick={() => {
                                        setSelectedDay(dayData.day);
                                        setIsDaySheetOpen(true);
                                      }}
                                    >
                                      {/* Day Header */}
                                      <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex flex-col">
                                          <span
                                            className="text-base font-semibold leading-none"
                                            style={{
                                              color: "var(--foreground)",
                                            }}
                                          >
                                            {dayData.displayDate}
                                          </span>
                                          <span
                                            className="text-[10px] uppercase mt-0.5"
                                            style={{ color: "var(--muted)" }}
                                          >
                                            {dayData.dayShort}
                                          </span>
                                        </div>
                                        {dayData.totalHours > 0 && (
                                          <span
                                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px]"
                                            style={{
                                              backgroundColor:
                                                "var(--secondary-background)",
                                              color: "var(--foreground)",
                                            }}
                                          >
                                            {dayData.totalHours}h
                                          </span>
                                        )}
                                      </div>

                                      {/* Day Content */}
                                      <div className="space-y-0.5">
                                        {/* Off day indicator */}
                                        {dayData.isOff && (
                                          <div
                                            className="text-[10px] font-medium"
                                            style={{
                                              color: "var(--color-green-text)",
                                            }}
                                          >
                                            {dayData.isHoliday
                                              ? "Holiday"
                                              : dayData.isSunday
                                              ? "Sunday"
                                              : "Off"}
                                          </div>
                                        )}

                                        {/* Holiday name */}
                                        {dayData.isHoliday &&
                                          dayData.holidayName && (
                                            <div
                                              className="text-[10px] truncate"
                                              style={{
                                                color:
                                                  "var(--color-green-text)",
                                              }}
                                            >
                                              {dayData.holidayName}
                                            </div>
                                          )}

                                        {/* Timesheet entries */}
                                        {dayData.timesheetEntries.length >
                                          0 && (
                                          <div className="space-y-0.5">
                                            {dayData.timesheetEntries.map(
                                              (entry, i) => (
                                                <div
                                                  key={i}
                                                  className="text-[10px] truncate flex items-center gap-1"
                                                >
                                                  <span
                                                    className="font-medium truncate"
                                                    style={{
                                                      color:
                                                        "var(--foreground)",
                                                    }}
                                                  >
                                                    {entry.projectName ||
                                                      "Project"}
                                                  </span>
                                                  <span
                                                    style={{
                                                      color: "var(--muted)",
                                                    }}
                                                  >
                                                    {entry.hours}h
                                                  </span>
                                                  {dayData.day.timesheet
                                                    ?.state === "rejected" && (
                                                    <span
                                                      style={{
                                                        color:
                                                          "var(--color-red-text)",
                                                      }}
                                                    >
                                                      ×
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}

                                        {/* Leave entries */}
                                        {dayData.leaveEntries.length > 0 && (
                                          <div className="space-y-0.5">
                                            {dayData.leaveEntries.map(
                                              (entry: any, i) => (
                                                <div
                                                  key={i}
                                                  className="text-[10px] truncate flex items-center gap-1"
                                                >
                                                  <span
                                                    className="font-medium truncate"
                                                    style={{
                                                      color:
                                                        "var(--foreground)",
                                                    }}
                                                  >
                                                    {entry.leaveType.name}
                                                  </span>
                                                  <span
                                                    style={{
                                                      color: "var(--muted)",
                                                    }}
                                                  >
                                                    {entry.hours}h
                                                  </span>
                                                  {entry.state ===
                                                    "pending" && (
                                                    <span
                                                      style={{
                                                        color:
                                                          "var(--color-yellow-text)",
                                                      }}
                                                    >
                                                      ○
                                                    </span>
                                                  )}
                                                  {entry.state ===
                                                    "rejected" && (
                                                    <span
                                                      style={{
                                                        color:
                                                          "var(--color-red-text)",
                                                      }}
                                                    >
                                                      ×
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}

                                        {/* Unfilled indicator */}
                                        {dayData.isUnfilled && (
                                          <div
                                            className="text-[10px] italic"
                                            style={{ color: "var(--muted)" }}
                                          >
                                            —
                                          </div>
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
                              bgColor = "var(--secondary-background)";
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
            </div>
          </div>
        </div>

        {/* Day Detail Sheet */}
        <Sheet open={isDaySheetOpen} onOpenChange={setIsDaySheetOpen}>
          <SheetContent side="right" className="w-full md:w-[400px] p-0">
            <SheetTitle className="sr-only">
              {selectedDay
                ? format(parseISO(selectedDay.date), "EEEE, MMM d")
                : "Day Details"}
            </SheetTitle>
            {selectedDay && (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div
                  className="px-5 py-4 border-b border-border"
                  style={{ backgroundColor: "var(--secondary-background)" }}
                >
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="h-4 w-4"
                      style={{ color: "var(--foreground)" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {format(parseISO(selectedDay.date), "EEEE, MMM d")}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {selectedDay.isHoliday
                      ? selectedDay.holidayName
                      : selectedDay.isWeekend
                      ? "Weekend"
                      : selectedDay.isWorkingDay
                      ? "Working Day"
                      : "Non-working Day"}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Hours Summary */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p
                        className="text-[10px] uppercase tracking-wide mb-1"
                        style={{ color: "var(--muted)" }}
                      >
                        Timesheet
                      </p>
                      <p
                        className="text-xl font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {selectedDay.timesheet?.totalHours || 0}h
                      </p>
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-[10px] uppercase tracking-wide mb-1"
                        style={{ color: "var(--muted)" }}
                      >
                        Leave
                      </p>
                      <p
                        className="text-xl font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {selectedDay.leaves?.totalHours || 0}h
                      </p>
                    </div>
                  </div>

                  {/* Timesheet Entries */}
                  {selectedDay.timesheet &&
                    selectedDay.timesheet.entries.length > 0 && (
                      <div className="space-y-2">
                        <p
                          className="text-xs font-medium"
                          style={{ color: "var(--foreground)" }}
                        >
                          Timesheet
                        </p>
                        <div className="space-y-2">
                          {selectedDay.timesheet.entries.map((entry, index) => (
                            <div
                              key={index}
                              className="py-2 border-b border-border last:border-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  {entry.projectName || "—"}
                                </p>
                                <span
                                  className="text-xs shrink-0"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {entry.hours}h
                                </span>
                              </div>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--muted)" }}
                              >
                                {entry.departmentName}
                              </p>
                              {entry.taskDescription && (
                                <p
                                  className="text-xs mt-1.5"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {entry.taskDescription}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {selectedDay.timesheet.notes && (
                          <p
                            className="text-xs pt-2"
                            style={{ color: "var(--color-yellow-text)" }}
                          >
                            Note: {selectedDay.timesheet.notes}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Leave Entries */}
                  {selectedDay.leaves &&
                    selectedDay.leaves.entries.length > 0 && (
                      <div className="space-y-2">
                        <p
                          className="text-xs font-medium"
                          style={{ color: "var(--foreground)" }}
                        >
                          Leave
                        </p>
                        <div className="space-y-2">
                          {selectedDay.leaves.entries.map(
                            (entry: any, index) => {
                              const status = entry.state || "approved";
                              const statusColors: Record<string, string> = {
                                approved: "var(--color-green-text)",
                                pending: "var(--color-yellow-text)",
                                rejected: "var(--color-red-text)",
                              };
                              const color =
                                statusColors[status] || statusColors.approved;

                              return (
                                <div
                                  key={index}
                                  className="py-2 border-b border-border last:border-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-sm"
                                      style={{ color: "var(--foreground)" }}
                                    >
                                      {entry.leaveType.name}
                                    </span>
                                    <span
                                      className="text-xs capitalize"
                                      style={{ color }}
                                    >
                                      {status}
                                    </span>
                                  </div>
                                  <p
                                    className="text-xs mt-0.5"
                                    style={{ color: "var(--muted)" }}
                                  >
                                    {entry.hours} hours
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                  {/* Empty State */}
                  {(!selectedDay.timesheet ||
                    selectedDay.timesheet.entries.length === 0) &&
                    (!selectedDay.leaves ||
                      selectedDay.leaves.entries.length === 0) &&
                    !selectedDay.isHoliday &&
                    !selectedDay.isWeekend && (
                      <p
                        className="text-sm text-center py-4"
                        style={{ color: "var(--muted)" }}
                      >
                        No entries
                      </p>
                    )}

                  {/* Off Day */}
                  {(selectedDay.isHoliday || selectedDay.isWeekend) && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-green-text)" }}
                    >
                      No timesheet required
                    </p>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </PageWrapper>
    </>
  );
}

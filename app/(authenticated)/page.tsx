"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    totalPayableDays: number; // Add this line
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
  leaveStatus?: 'approved' | 'pending' | 'rejected';
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
          <button onClick={onRetry} className="mt-2 underline">
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
            <button onClick={onPreviousMonth} className="mr-2">
              Previous
            </button>
            <button onClick={onNextMonth}>Next</button>
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
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyTimesheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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
      const is2ndOr4thSaturday = isSaturday && (weekOfMonth === 2 || weekOfMonth === 4);
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
          const leaveStatus = (entry as any).state === 'rejected' ? 'rejected' :
            (entry as any).state === 'pending' ? 'pending' :
              'approved';

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
        let offType = '';
        if (day.isHoliday) {
          offType = day.holidayName ? `Holiday (${day.holidayName})` : 'Holiday';
        } else if (isSunday) {
          offType = 'Sunday';
        } else if (is2ndOr4thSaturday) {
          offType = 'Saturday (Off)';
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
              <p className="text-base font-bold text-gray-900">
                Data shown is according to cycle: 26th to 25th of the month
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-2 border-black">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Hours Logged
                    </p>
                    <p className="text-3xl font-bold">
                      {monthlyData?.totals.timesheetHours || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-black">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Leave Days
                    </p>
                    <p className="text-3xl font-bold">{leaveDaysDisplay}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-black">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Lifelines Remaining
                    </p>
                    <p className="text-3xl font-bold">
                      {user?.backfill?.remaining ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      out of {user?.backfill?.limit ?? 0} available
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-black">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Payable Days
                    </p>
                    <p className="text-3xl font-bold">{payableDays}/{totalCycleDays}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timesheet Table View */}
            <Card className="border-2 border-black shadow-lg">
              <CardContent className="p-4 sm:p-6">
                {/* Header Section */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-gray-900">
                         Timesheet 
                      </h2>
                      <p className="text-sm font-medium text-gray-800 break-all">
                        {user?.name || "User Name"} · {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                      <button
                        onClick={handlePreviousMonth}
                        disabled={isLoading}
                        className="h-10 w-10 bg-transparent hover:bg-black/5 border-2 border-black rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-black" />
                      </button>
                      <div className="text-center px-2 sm:px-6 py-2">
                        {monthlyData?.period && (
                          <p className="text-xs text-black whitespace-nowrap">
                            {format(parseISO(monthlyData.period.start), "dd/MM/yyyy")} -{" "}
                            {format(parseISO(monthlyData.period.end), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleNextMonth}
                        disabled={isLoading}
                        className="h-10 w-10 bg-transparent hover:bg-black/5 border-2 border-black rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-black" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Section */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 bg-white rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-16 bg-white rounded-lg">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button
                      onClick={() => setCurrentMonth(new Date(currentMonth))}
                    >
                      Retry
                    </Button>
                  </div>
                ) : timesheetRows.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-lg border-2 border-gray-900">
                    <p className="text-gray-500 text-lg">
                      No records found for this month
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block border-2 border-gray-900 rounded-lg overflow-hidden bg-white shadow-lg">
                      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 500px)" }}>
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-gray-200 z-10 border-b-2 border-gray-900">
                            <tr>
                              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 whitespace-nowrap w-16">
                                Sr
                              </th>
                              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 whitespace-nowrap w-32">
                                Project
                              </th>
                              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 whitespace-nowrap w-28">
                                Date
                              </th>
                              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 whitespace-nowrap w-28">
                                Day
                              </th>
                              <th className="px-3 py-3 text-center text-sm font-bold text-gray-900 whitespace-nowrap w-20">
                                Hours
                              </th>
                              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900">
                                Activities
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {timesheetRows.map((row, index) => {
                              let bgColor = undefined;
                              
                              if (
                                (row.isLeave && row.leaveStatus === 'rejected') ||
                                (row.timesheetState === 'rejected')
                              ) {
                                bgColor = '#F5B5B5';
                              } else if (row.isLeave && row.leaveStatus === 'pending') {
                                bgColor = '#FFF3B0';
                              } else if (
                                row.isHoliday ||
                                row.isWeekend ||
                                (row.isLeave && row.leaveStatus === 'approved')
                              ) {
                                bgColor = '#B7E4C7';
                              } else {
                                bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
                              }

                              return (
                                <tr
                                  key={`${row.date}-${index}`}
                                  className="hover:bg-blue-50 transition-colors border-b border-gray-300"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {row.sno}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {row.project}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {row.date}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
                                    {row.day}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900 text-center font-medium whitespace-nowrap">
                                    {row.hours}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900">
                                    {row.activities}
                                    {row.leaveStatus === 'pending' && (
                                      <span className="ml-2 text-xs text-amber-700 font-medium">(Pending)</span>
                                    )}
                                    {row.leaveStatus === 'rejected' && (
                                      <span className="ml-2 text-xs text-red-700 font-medium">(Rejected)</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 max-h-[60vh] overflow-y-auto">
                      {timesheetRows.map((row, index) => {
                        let bgColor = undefined;
                        
                        if (
                          (row.isLeave && row.leaveStatus === 'rejected') ||
                          (row.timesheetState === 'rejected')
                        ) {
                          bgColor = '#F5B5B5';
                        } else if (row.isLeave && row.leaveStatus === 'pending') {
                          bgColor = '#FFF3B0';
                        } else if (
                          row.isHoliday ||
                          row.isWeekend ||
                          (row.isLeave && row.leaveStatus === 'approved')
                        ) {
                          bgColor = '#B7E4C7';
                        } else {
                          bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
                        }

                        return (
                          <div
                            key={`${row.date}-${index}`}
                            className="border-2 border-gray-900 rounded-lg p-4 space-y-2"
                            style={{ backgroundColor: bgColor }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 flex-1">
                                <p className="text-xs text-gray-500 font-medium">#{row.sno}</p>
                                <p className="text-sm font-bold text-gray-900">{row.date} - {row.day}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{row.hours}h</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Project</p>
                              <p className="text-sm font-medium text-gray-900">{row.project}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Activities</p>
                              <p className="text-sm text-gray-900">
                                {row.activities}
                                {row.leaveStatus === 'pending' && (
                                  <span className="ml-2 text-xs text-amber-700 font-medium">(Pending)</span>
                                )}
                                {row.leaveStatus === 'rejected' && (
                                  <span className="ml-2 text-xs text-red-700 font-medium">(Rejected)</span>
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
  );}
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO, getYear, getMonth } from "date-fns";
import { toast } from "sonner";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityEntryCard, EmptyActivityState } from "./_components";
import type { TimesheetEntry, LeaveEntry } from "./_components";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS, DAY_INDICATOR_BASE } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";


// TypeScript interfaces for API response
interface DayData {
  date: string;
  isWorkingDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
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
  };
  days: DayData[];
}

export default function DashboardPage() {
  const { isLoading: authLoading, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthlyData, setMonthlyData] =
    useState<MonthlyTimesheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // Fetch monthly timesheet data
  useEffect(() => {
    if (authLoading) return;

    const fetchMonthlyData = async () => {
      const id = ++fetchIdRef.current; // unique id for this run
      setIsLoading(true);
      setError(null);

      try {
           const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const visibleStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const visibleEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

      const getPeriodKey = (d: Date) => {
        const dt = new Date(d);
        let year = dt.getFullYear();
        let monthIndex = dt.getMonth();
        if (dt.getDate() < 26) {
          monthIndex -= 1;
          if (monthIndex < 0) {
            monthIndex = 11;
            year -= 1;
          }
        }
        const month = monthIndex + 1;
        return `${year}-${String(month).padStart(2, "0")}`;
      };

      // parse "YYYY-MM" period key back into numeric year & month (month is 1-based)
      const parsePeriodKey = (key: string) => {
        const [y, m] = key.split("-").map((v) => Number(v));
        return { year: y, month: m };
      };

      const monthsNeeded = new Set<string>();
      monthsNeeded.add(getPeriodKey(currentMonth));
      // prune any empty values safely (avoid mutating while iterating the Set)
      for (const m of Array.from(monthsNeeded)) {
        if (!m) monthsNeeded.delete(m);
      }
 
     
       const allDays: DayData[] = [];
       let mainMonthTotals = { timesheetHours: 0, leaveHours: 0 };
      let serverPeriod: MonthlyTimesheetResponse["period"] | null = null;
 
        // iterate unique months only once
        const periodKeys = Array.from(monthsNeeded);
        for (const key of periodKeys) {
          // if another fetch started, abort this one
          if (id !== fetchIdRef.current) return;

          const { year, month } = parsePeriodKey(key);
          await apiClient.get(API_PATHS.MONTHLY_TIMESHEET, {
            params: { year, month },
          }).then((res) => {
            allDays.push(...res.data.days);
            if (key === getPeriodKey(currentMonth)) {
              mainMonthTotals = res.data.totals;
              serverPeriod = res.data.period ?? serverPeriod;
            }
          });
        }
 
        if (id !== fetchIdRef.current) return;
        // Build the combined MonthlyTimesheetResponse from fetched period data
        const finalDays = Array.from(
          new Map(allDays.map((d) => [d.date, d])).values()
        );
        const visibleDays = finalDays.filter((d) => {
          const dt = parseISO(d.date);
          return dt >= visibleStart && dt <= visibleEnd;
        });
        const { year: periodYear, month: periodMonth } = parsePeriodKey(
          getPeriodKey(currentMonth)
        );
        const combined: MonthlyTimesheetResponse = {
           user:
             monthlyData?.user || {
               id: 0,
               name: "",
               departmentId: 0,
             },
          period: serverPeriod ?? {
            year: periodYear,
            month: periodMonth,
            start: format(visibleStart, DATE_FORMATS.API),
            end: format(visibleEnd, DATE_FORMATS.API),
          },
           totals: mainMonthTotals,
           days: visibleDays,
         };
 
         setMonthlyData(combined);

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

  // Get days with activities/leaves for calendar highlighting
  const daysWithData = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.days
      .filter((day) => day.timesheet !== null || day.leaves !== null)
      .map((day) => parseISO(day.date));
  }, [monthlyData]);

  // Get days with only leave entries (no timesheet entries)
  const daysWithOnlyLeave = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.days
      .filter((day) => day.leaves !== null && day.timesheet === null)
      .map((day) => parseISO(day.date));
  }, [monthlyData]);

  // Get data for selected date
  const selectedDayData = useMemo(() => {
    if (!monthlyData) return null;
    const dateKey = format(selectedDate, DATE_FORMATS.API);
    return monthlyData.days.find((day) => day.date === dateKey) || null;
  }, [selectedDate, monthlyData]);

  // Calculate total hours and entries for selected day
  const selectedDayStats = useMemo(() => {
    if (!selectedDayData) return { totalHours: 0, totalEntries: 0 };

    const timesheetHours = selectedDayData.timesheet?.totalHours || 0;
    const timesheetEntries = selectedDayData.timesheet?.entries.length || 0;

    return {
      totalHours: timesheetHours,
      totalEntries: timesheetEntries,
    };
  }, [selectedDayData]);

  // Custom modifiers for calendar
  const modifiers = useMemo(
    () => ({
      hasData: daysWithData,
      hasOnlyLeave: daysWithOnlyLeave,
      weekend:
        monthlyData?.days
          .filter((d) => d.isWeekend)
          .map((d) => parseISO(d.date)) || [],
      holiday:
        monthlyData?.days
          .filter((d) => d.isHoliday)
          .map((d) => parseISO(d.date)) || [],
    }),
    [daysWithData, daysWithOnlyLeave, monthlyData]
  );

  // Calculate if selected date is in the future
  const isFutureDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected > today;
  }, [selectedDate]);

  // Check if activity can be added (not future, and within last 3 days)
  const canAddActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = today.getTime() - selected.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Can add if: not future AND within last 3 days (0-3 days ago)
    return !isFutureDate && diffDays <= 3;
  }, [selectedDate, isFutureDate]);

  // Check if selected date is a non-working day (Sunday or 2nd/4th Saturday)
  // Leaves cannot be added for non-working days
  const isNonWorkingDay = useMemo(() => {
    const day = selectedDate.getDay();

    // Sunday
    if (day === 0) return true;

    // Check for 2nd or 4th Saturday
    if (day === 6) {
      const date = selectedDate.getDate();
      const weekOfMonth = Math.ceil(date / 7);
      // 2nd Saturday (week 2) or 4th Saturday (week 4)
      if (weekOfMonth === 2 || weekOfMonth === 4) {
        return true;
      }
    }

    return false;
  }, [selectedDate]);

  // Simplified and centralized modifier class names
  const modifiersClassNames = {
    hasData: `font-semibold text-foreground bg-main hover:bg-main/30 ${DAY_INDICATOR_BASE} after:bg-background`,
    hasOnlyLeave: `font-semibold text-foreground bg-main/20 hover:bg-main/30 ${DAY_INDICATOR_BASE} after:bg-subtle-background`,
    weekend: "text-muted-foreground",
    holiday: "bg-subtle-background dark:bg-red-950/20",
  };
 const leaveDaysDisplay = (() => {
   if (!monthlyData) return 0;
   const days = monthlyData.totals.leaveHours / 8;
   return Number.isInteger(days) ? days : Number(days.toFixed(1));
 })();

const payableDays = useMemo(() => {
  if (!monthlyData) return 0;

  const startStr = monthlyData.period?.start || monthlyData.days[0]?.date;
  const endStr =
    monthlyData.period?.end || monthlyData.days[monthlyData.days.length - 1]?.date;
  if (!startStr || !endStr) return 0;

  const start = parseISO(startStr);
  const end = parseISO(endStr);

  const dayMap = new Map(monthlyData.days.map((d) => [d.date, d]));

  let totalDayCount = 0;
  let lwpHours = 0;

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    totalDayCount += 1;
    const key = format(dt, DATE_FORMATS.API);
    const day = dayMap.get(key);
    if (day?.leaves?.entries && Array.isArray(day.leaves.entries)) {
      for (const le of day.leaves.entries) {
        const lt = le.leaveType;
        const isLWP =
          lt &&
          ((lt.code && lt.code.toLowerCase() === "lwp") ||
            (lt.name && lt.name.toLowerCase().includes("leave without pay")));
        if (isLWP) lwpHours += le.hours ?? 0;
      }
    }
  }

  const lwpDays = lwpHours / 8;
  const payable = totalDayCount - lwpDays;
  return Number.isInteger(payable) ? payable : Number(payable.toFixed(1));
}, [monthlyData]);

  return (
    <>
      <AppHeader crumbs={[{ label: "Dashboard" }]} />
      <PageWrapper>
        <div className="flex w-full justify-center p-4">
          <div className="w-full max-w-7xl space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Hours Logged
                    </p>
                    <p className="text-3xl font-bold">
                      {monthlyData?.totals.timesheetHours || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(currentMonth, "MMMM yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Leave Days
                    </p>
                    <p className="text-3xl font-bold">
                       {leaveDaysDisplay}
                    </p>
                      
                    <p className="text-xs text-muted-foreground">
                      {format(currentMonth, "MMMM yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Hours
                    </p>
                    <p className="text-3xl font-bold">
                      {(monthlyData?.totals.timesheetHours || 0) +
                        (monthlyData?.totals.leaveHours || 0)}
                    </p>
                    {/* <p className="text-xs text-muted-foreground">Combined</p> */}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
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
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Payable Days
                    </p>

                    <p className="text-3xl font-bold">
                      {payableDays}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {format(currentMonth, "MMMM yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Main Content: Details (Left) and Calendar (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Details Section - Left */}
              <Card className="lg:order-1">
                <CardHeader>
                  <CardTitle className="text-xl">Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="text-center py-8">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button
                        onClick={() => setCurrentMonth(new Date(currentMonth))}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        disabled={isLoading}
                        modifiers={modifiers}
                        modifiersClassNames={modifiersClassNames}
                        className="rounded-base border-2 border-border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Calendar Section - Right */}
              <Card className="lg:order-2">
                <CardHeader>
                  <div>
                    <CardTitle className="text-xl">
                      Activities for{" "}
                      {format(selectedDate, DATE_FORMATS.DISPLAY)}
                    </CardTitle>
                    {selectedDayStats.totalEntries > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedDayStats.totalHours} hours across{" "}
                        {selectedDayStats.totalEntries}{" "}
                        {selectedDayStats.totalEntries === 1
                          ? "entry"
                          : "entries"}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto pb-2">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-32 bg-muted animate-pulse rounded-base"
                        />
                      ))}
                    </div>
                  ) : !selectedDayData ||
                    (selectedDayData.timesheet === null &&
                      selectedDayData.leaves === null) ? (
                    <EmptyActivityState
                      variant="date"
                      canAddActivity={canAddActivity}
                      canAddLeave={!isNonWorkingDay}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Timesheet Entries */}
                      {selectedDayData.timesheet?.entries.map((entry) => (
                        <ActivityEntryCard
                          key={entry.id}
                          type="timesheet"
                          entry={entry}
                        />
                      ))}

                      {/* Leave Entries */}
                      {selectedDayData.leaves?.entries.map((entry, idx) => (
                        <ActivityEntryCard
                          key={`leave-${entry.requestId}-${idx}`}
                          type="leave"
                          entry={entry}
                        />
                      ))}
                     
                    </div>
                  )}
                </CardContent>

              </Card>
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

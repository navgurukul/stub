"use client";

import { format, parseISO, isValid, endOfMonth, addDays, differenceInCalendarDays } from "date-fns";
import {
  AlertTriangle,
} from "lucide-react";
import { cn, getLeaveDurationLabel, getMondayOfWeek, getDayOfWeekIndex } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TimesheetEntry,
  LeaveEntry,
  DayData,
  MonthlyTimesheetResponse,
  TimesheetRow,
  ProjectPillTone,
} from "@/lib/dashboard-type";

interface CalendarViewComponentProps {
  monthlyData: MonthlyTimesheetResponse | null;
  timesheetRows: TimesheetRow[];
  activeCalendarCreatedAtKey: string | null;
  setActiveCalendarCreatedAtKey: (key: string | null | ((prev: string | null) => string | null)) => void;
  setSelectedDay: (day: DayData) => void;
  setIsDaySheetOpen: (open: boolean) => void;
  renderEmptyDayActions: (options: {
    dateApi?: string;
    layout?: "inline" | "stack";
    stopPropagation?: boolean;
    showLabel?: boolean;
  }) => React.ReactNode;
  getProjectPill: (row: TimesheetRow) => { label: string; tone: ProjectPillTone } | null;
  getProjectPillClassName: (tone: ProjectPillTone) => string;
}

export const CalendarViewComponent: React.FC<CalendarViewComponentProps> = ({
  monthlyData,
  timesheetRows,
  activeCalendarCreatedAtKey,
  setActiveCalendarCreatedAtKey,
  setSelectedDay,
  setIsDaySheetOpen,
  renderEmptyDayActions,
  getProjectPill,
  getProjectPillClassName,
}) => {
  const getLeaveStatusLabel = (state?: string) => {
    if (!state) return "Approved";
    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  };

  return (() => {
    const sortedGridDays = [...(monthlyData?.days ?? [])].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const cycleStart = parseISO(
      monthlyData?.period?.start ?? sortedGridDays[0]?.date ?? ""
    );
    const cycleEnd = parseISO(
      monthlyData?.period?.end ?? sortedGridDays[sortedGridDays.length - 1]?.date ?? ""
    );
    const daysByDate = new Map(sortedGridDays.map((day) => [day.date, day]));

    const weekStartMonday = getMondayOfWeek(cycleStart);
    const cycleSortedEnd = new Date(cycleEnd);
    cycleSortedEnd.setHours(23, 59, 59, 999);
    const fullWeeks: (typeof sortedGridDays[0] | null)[][] = [];
    let currentMonday = new Date(weekStartMonday);

    while (currentMonday.getTime() <= cycleSortedEnd.getTime()) {
      const fullWeek: (typeof sortedGridDays[0] | null)[] = Array(7).fill(null);
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(currentMonday);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        if (currentDate.getTime() >= cycleStart.getTime() && currentDate.getTime() <= cycleSortedEnd.getTime()) {
          const dateStr = format(currentDate, "yyyy-MM-dd");
          const dayData = daysByDate.get(dateStr);
          if (dayData) {
            fullWeek[dayOffset] = dayData;
          }
        }
      }
      const hasAnyDay = fullWeek.some((day) => day !== null);
      if (hasAnyDay) {
        fullWeeks.push(fullWeek);
      }
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    const weeks = fullWeeks.map((fullWeek) =>
      fullWeek.filter((day) => day !== null)
    );

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
      const hasLeave =
        (day.leaves?.entries ?? []).some(
          (entry: any) => entry.state !== "rejected"
        );
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
        timesheetEntries.reduce((s, e) => s + e.hours, 0);
      const lifelineUsed = Boolean(day.isLifeline);

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
        lifelineUsed,
        leaveEntries,
        isHoliday: day.isHoliday,
        holidayName: day.holidayName,
        is2ndOr4thSaturday,
        isSunday,
      };
    };

    return (
      <div className="space-y-4">
        {fullWeeks.map((fullWeek, weekIndex) => {
          const weekDays = fullWeek.filter((day) => day !== null);
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
              <div className="px-2 py-2">
                <div className="grid grid-cols-7 gap-2">
                  {fullWeek.map((day, dayIndex) => {
                    if (day === null) {
                      const cellDate = new Date(weekStartMonday);
                      cellDate.setDate(cellDate.getDate() + weekIndex * 7 + dayIndex);

                      return (
                        <div
                          key={`blank-${weekIndex}-${dayIndex}`}
                          className="min-h-[110px] p-2.5 rounded-[4px]"
                          style={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderWidth: "1px",
                            borderStyle: "solid",
                          }}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex flex-col">
                              <span
                                className="text-lg font-semibold leading-none"
                                style={{ color: "var(--muted)" }}
                              >
                                {format(cellDate, "dd")}
                              </span>
                              <span
                                className="text-xs uppercase mt-0.5"
                                style={{ color: "var(--muted)" }}
                              >
                                {format(cellDate, "EEE")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const dayData = getDayCardData(day);
                    // Determine cell background
                    let cellBg = "var(--background)";
                    if (dayData.isHoliday)
                      cellBg = "#ddeee6";
                    else if (dayData.isSunday || dayData.is2ndOr4thSaturday)
                      cellBg = "var(--secondary-background)";
                    else if (dayData.isUnfilled)
                      cellBg = "#ede4c8";
                    else if (dayData.status === "rejected")
                      cellBg = "#eddcdc";
                    else if (dayData.status === "pending")
                      cellBg = "#ece6cc";

                    let accentShadow = "";
                    if (dayData.isHoliday)
                      accentShadow = "inset 3px 0 0 #5a8a6a";
                    else if (dayData.isUnfilled)
                      accentShadow = "inset 3px 0 0 #b89848";
                    else if (dayData.status === "rejected")
                      accentShadow = "inset 3px 0 0 #a05858";
                    else if (dayData.status === "pending")
                      accentShadow = "inset 3px 0 0 #8a7838";

                    const boxShadow = accentShadow || undefined;

                    return (
                      <div
                        key={dayData.day.date}
                        className={`min-h-[110px] p-2.5 relative cursor-pointer hover:brightness-[0.97] transition-all rounded-[4px]${dayData.isToday ? " today-cell" : ""}`}
                        style={{
                          backgroundColor: cellBg,
                          borderColor: "var(--border)",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          boxShadow,
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
                              className="text-lg font-semibold leading-none"
                              style={{
                                color: "var(--foreground)",
                              }}
                            >
                              {dayData.displayDate}
                            </span>
                            <span
                              className="text-xs uppercase mt-0.5"
                              style={{ color: "var(--muted)" }}
                            >
                              {dayData.dayShort}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {dayData.lifelineUsed && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-4 w-4 items-center justify-center text-amber-600 hover:text-amber-700"
                                      aria-label="Lifeline used"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                      }}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <div className="text-xs whitespace-nowrap">
                                      Lifeline used
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {dayData.totalHours > 0 && (
                              <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded-[3px]"
                                style={{
                                  backgroundColor:
                                    dayData.status === "rejected"
                                      ? "#ecdcdc"
                                      : dayData.status === "pending"
                                        ? "#ece6cc"
                                        : dayData.status === "filled"
                                          ? "#daeae2"
                                          : "var(--secondary-background)",
                                  color:
                                    dayData.status === "rejected"
                                      ? "#803838"
                                      : dayData.status === "pending"
                                        ? "#786020"
                                        : dayData.status === "filled"
                                          ? "#386050"
                                          : "var(--foreground)",
                                }}
                              >
                                {dayData.totalHours}h
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Day Content */}
                        <div className="space-y-0.5">
                          {/* Off day indicator */}
                          {dayData.isOff && (
                            <div
                              className="text-xs font-medium"
                              style={{
                                color: dayData.isHoliday
                                  ? "#3a6a4a"
                                  : "var(--muted)",
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
                                className="text-xs truncate"
                                style={{ color: "#3a6a4a" }}
                              >
                                {dayData.holidayName}
                              </div>
                            )}

                          {/* Timesheet entries */}
                          {dayData.timesheetEntries.length >
                            0 && (
                              <div className="space-y-1">
                                {dayData.timesheetEntries.map(
                                  (entry, i) => (
                                    <div
                                      key={i}
                                      className="text-xs truncate flex items-center gap-1"
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
                                        className="font-medium flex-shrink-0"
                                        style={{
                                          color: "var(--muted)",
                                        }}
                                      >
                                        {entry.hours}h
                                      </span>
                                      {dayData.day.timesheet
                                        ?.state === "rejected" && (
                                          <span
                                            className="flex-shrink-0"
                                            style={{
                                              color: "#903030",
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
                            <div className="space-y-1">
                              {dayData.leaveEntries.map(
                                (entry: any, i) => (
                                  <div
                                    key={i}
                                    className="text-xs truncate flex items-center gap-1"
                                  >
                                    <span
                                      className="font-medium truncate"
                                      style={{
                                        color:
                                          "var(--foreground)",
                                      }}
                                    >
                                      {`${entry.leaveType.name} - ${getLeaveDurationLabel(entry)} (${getLeaveStatusLabel(entry.state)})`}
                                    </span>
                                    {entry.state ===
                                      "pending" && (
                                        <span
                                          className="flex-shrink-0"
                                          style={{
                                            color: "#806020",
                                          }}
                                        >
                                          ○
                                        </span>
                                      )}
                                    {entry.state ===
                                      "rejected" && (
                                        <span
                                          className="flex-shrink-0"
                                          style={{
                                            color: "#903030",
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

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  })();
};

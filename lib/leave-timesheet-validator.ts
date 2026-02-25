/**
 * Leave and Timesheet Conflict Validator
 * Handles validation logic for conflicts between leave applications and timesheet entries
 * Uses monthly timesheet endpoint to derive per-date totals with caching
 */

import { format } from "date-fns";
import apiClient from "./api-client";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "./constants";

// TypeScript interfaces for API responses
interface LeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  durationType: "full_day" | "half_day";
  halfDaySegment?: "first_half" | "second_half";
  hours: number;
  // State can be either a string or an object depending on the endpoint
  state: string | { code: string; name: string };
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?:
    | "full_day_leave"
    | "half_day_leave_hours_exceeded"
    | "timesheet_exists"
    | "non_working_day"
    | "holiday"
    | "overlapping_leave";
  message?: string;
  existingHours?: number;
  maxAllowedHours?: number;
}

// Monthly timesheet data cache to minimize redundant API calls
interface MonthlyTimesheetData {
  days: Array<{
    date: string;
    isWorkingDay?: boolean;
    isWeekend?: boolean;
    isHoliday?: boolean;
    timesheet: { totalHours: number } | null;
  }>;
}

const monthlyTimesheetCache = new Map<string, MonthlyTimesheetData>();

/**
 * Fetch monthly timesheet data with caching
 * param year - Year to fetch
 * param month - Month to fetch (1-12)
 * returns Monthly timesheet data
 */
async function getMonthlyTimesheetData(
  year: number,
  month: number
): Promise<MonthlyTimesheetData> {
  const cacheKey = `${year}-${month}`;

  // Return cached data if available
  if (monthlyTimesheetCache.has(cacheKey)) {
    return monthlyTimesheetCache.get(cacheKey)!;
  }

  try {
    const response = await apiClient.get(API_PATHS.MONTHLY_TIMESHEET, {
      params: { year, month },
    });

    // Handle both direct and wrapped response formats
    const data: MonthlyTimesheetData = response.data?.days
      ? response.data
      : response.data?.data || { days: [] };

    // Cache the result
    monthlyTimesheetCache.set(cacheKey, data);

    return data;
  } catch (error) {
    console.error("Error fetching monthly timesheet:", error);
    // Return empty data on error
    return { days: [] };
  }
}

/**
 * Check if a date is a non-working day (Sunday or 2nd/4th Saturday)
 * param date - Date to check
 * returns true if it's a non-working day
 */
export function isNonWorkingDay(date: Date): boolean {
  const day = date.getDay();

  // Sunday
  if (day === 0) return true;

  // Check for 2nd or 4th Saturday
  if (day === 6) {
    const dateNum = date.getDate();
    const weekOfMonth = Math.ceil(dateNum / 7);
    // 2nd Saturday (week 2) or 4th Saturday (week 4)
    if (weekOfMonth === 2 || weekOfMonth === 4) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a date is a holiday using monthly timesheet data
 * param date - Date to check
 * returns true if it's a holiday
 */
export async function isHoliday(date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dateKey = format(date, DATE_FORMATS.API);

  const monthlyData = await getMonthlyTimesheetData(year, month);
  const dayData = monthlyData.days.find((d) => d.date === dateKey);

  return dayData?.isHoliday === true;
}

/**
 * Get total timesheet hours for a specific date
 * @param date - Date to check
 * @returns Total hours logged for that date
 */
async function getTimesheetTotalHoursForDate(date: Date): Promise<number> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth is 0-indexed
  const dateKey = format(date, DATE_FORMATS.API);

  const monthlyData = await getMonthlyTimesheetData(year, month);

  const dayData = monthlyData.days.find((d) => d.date === dateKey);
  const totalHours = dayData?.timesheet?.totalHours ?? 0;

  return typeof totalHours === "number" && Number.isFinite(totalHours)
    ? totalHours
    : 0;
}

/**
 * Invalidate cache for a specific month
 * Call this after successful timesheet or leave submissions
 * @param year - Year to invalidate
 * @param month - Month to invalidate (1-12)
 */
export function invalidateMonthlyTimesheetCache(
  year: number,
  month: number
): void {
  const cacheKey = `${year}-${month}`;
  monthlyTimesheetCache.delete(cacheKey);
}

/**
 * Clear all cached monthly timesheet data
 */
export function clearTimesheetCache(): void {
  monthlyTimesheetCache.clear();
}

/**
 * Check if a new leave request overlaps with existing approved or pending leaves
 * @param startDate - Start date of the new leave request
 * @param endDate - End date of the new leave request
 * @param durationType - Type of leave (full_day or half_day)
 * @returns Conflict check result
 */
export async function checkOverlappingLeaves(
  startDate: Date,
  endDate: Date,
  durationType: "full_day" | "half_day"
): Promise<ConflictCheckResult> {
  try {
    const startDateStr = format(startDate, DATE_FORMATS.API);
    const endDateStr = format(endDate, DATE_FORMATS.API);

    // Fetch ALL existing leave requests (backend may not support date filtering)
    // We'll filter client-side for overlaps
    const response = await apiClient.get(API_PATHS.LEAVES_REQUESTS_GET);

    // Handle wrapped or direct array response
    const leaves: LeaveRequest[] = Array.isArray(response.data)
      ? response.data
      : Array.isArray((response.data as { data?: LeaveRequest[] })?.data)
      ? (response.data as { data: LeaveRequest[] }).data
      : [];

    // Filter for approved or pending leaves that overlap with requested range
    const overlappingLeaves = leaves.filter((leave: LeaveRequest) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const requestStart = new Date(startDateStr);
      const requestEnd = new Date(endDateStr);

      // Only consider approved or pending leaves
      // Handle both string format and object format for state
      const stateValue =
        typeof leave.state === "string" ? leave.state : leave.state.code;

      const isRelevantState =
        stateValue === "approved" || stateValue === "pending";

      if (!isRelevantState) return false;

      // Check for any overlap between date ranges
      // Overlap exists if: (StartA <= EndB) AND (EndA >= StartB)
      const hasOverlap = requestStart <= leaveEnd && requestEnd >= leaveStart;

      // Allow two half-day leaves on the same date (one first_half + one second_half).
      if (durationType === "half_day" && leave.durationType === "half_day") {
        const reqStartStr = format(requestStart, DATE_FORMATS.API);
        const reqEndStr = format(requestEnd, DATE_FORMATS.API);
        const leaveStartStr = format(leaveStart, DATE_FORMATS.API);
        const leaveEndStr = format(leaveEnd, DATE_FORMATS.API);

        const requestIsSingleDay = reqStartStr === reqEndStr;
        const leaveIsSingleDay = leaveStartStr === leaveEndStr;

        if (requestIsSingleDay && leaveIsSingleDay && reqStartStr === leaveStartStr) {
          return false;
        }
      }

      return hasOverlap;
    });

    if (overlappingLeaves.length > 0) {
      const existingLeave = overlappingLeaves[0];
      const stateValue =
        typeof existingLeave.state === "string"
          ? existingLeave.state
          : existingLeave.state.code;
      const leaveStatus = stateValue === "approved" ? "approved" : "pending";

      // Format the overlapping date range
      const overlapStart = format(
        new Date(existingLeave.startDate),
        DATE_FORMATS.DISPLAY
      );
      const overlapEnd = format(
        new Date(existingLeave.endDate),
        DATE_FORMATS.DISPLAY
      );

      const dateRangeText =
        overlapStart === overlapEnd
          ? overlapStart
          : `${overlapStart} to ${overlapEnd}`;

      return {
        hasConflict: true,
        conflictType: "overlapping_leave",
        message: `Cannot apply leave. You already have a ${leaveStatus} ${existingLeave.durationType.replace(
          "_",
          "-"
        )} leave request for ${dateRangeText}. Please cancel or modify the existing leave before applying for overlapping dates.`,
      };
    }

    return { hasConflict: false };
  } catch (error: unknown) {
    console.error("Error checking overlapping leaves:", error);
    // Log more details about the error
    if (error && typeof error === "object") {
      const err = error as { response?: { status?: number; data?: unknown } };
      if (err.response) {
        console.error(
          "API Response Error:",
          err.response.status,
          err.response.data
        );
      }
    }
    // For errors, allow the request but log the error
    // The backend will perform final validation
    return { hasConflict: false };
  }
}

/**
 * Check if a leave application conflicts with existing timesheet entries
 * Uses monthly timesheet endpoint with caching to minimize API calls
 * @param startDate - Start date of the leave
 * @param endDate - End date of the leave
 * @param durationType - Type of leave (full_day or half_day)
 * @returns Conflict check result
 */
export async function checkLeaveConflictWithTimesheet(
  startDate: Date,
  endDate: Date,
  durationType: "full_day" | "half_day"
): Promise<ConflictCheckResult> {
  try {
    const startDateStr = format(startDate, DATE_FORMATS.API);
    const endDateStr = format(endDate, DATE_FORMATS.API);

    // FIRST: Check for overlapping existing leave requests
    const overlapResult = await checkOverlappingLeaves(
      startDate,
      endDate,
      durationType
    );
    if (overlapResult.hasConflict) {
      return overlapResult;
    }

    // NOTE: Non-working day and holiday checks intentionally removed so users
    // can apply leave for any date. Timesheet conflicts are still enforced below.

    // Reset for timesheet conflict checks
    const currentDate = new Date(startDate);

    const end = new Date(endDate);

    // For single-day leaves, check that specific date
    if (startDateStr === endDateStr) {
      const totalHours = await getTimesheetTotalHoursForDate(startDate);

      // If timesheet exists
      if (totalHours > 0) {
        if (durationType === "full_day") {
          return {
            hasConflict: true,
            conflictType: "timesheet_exists",
            message: `Cannot apply full-day leave. You have already logged ${totalHours} hours of timesheet entries for ${format(
              startDate,
              DATE_FORMATS.DISPLAY
            )}. Please remove the timesheet entries before applying for leave.`,
            existingHours: totalHours,
          };
        } else if (durationType === "half_day") {
          // For half-day leave, timesheet should not exceed remaining hours
          if (totalHours > VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE) {
            return {
              hasConflict: true,
              conflictType: "half_day_leave_hours_exceeded",
              message: `Cannot apply half-day leave. You have already logged ${totalHours} hours for ${format(
                startDate,
                DATE_FORMATS.DISPLAY
              )}, which exceeds the maximum of ${
                VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE
              } hours allowed with a half-day leave. Please adjust your timesheet entries.`,
              existingHours: totalHours,
              maxAllowedHours: VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE,
            };
          }
        }
      }
    } else {
      // For multi-day leaves, check each day in the range
      // Monthly data is cached, so this is efficient even for ranges
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const totalHours = await getTimesheetTotalHoursForDate(currentDate);

        if (totalHours > 0) {
          return {
            hasConflict: true,
            conflictType: "timesheet_exists",
            message: `Cannot apply leave. You have timesheet entries for ${format(
              currentDate,
              DATE_FORMATS.DISPLAY
            )} (${totalHours} hours). Please remove all timesheet entries for the selected date range before applying for leave.`,
            existingHours: totalHours,
          };
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return { hasConflict: false };
  } catch (error: unknown) {
    console.error("Error checking leave-timesheet conflict:", error);
    // For errors, allow the request but log the error
    // The backend will perform final validation
    return { hasConflict: false };
  }
}

/**
 * Check if timesheet entry conflicts with existing leaves
 * @param activityDate - Date of the activity
 * @param totalHours - Total hours being submitted
 * @returns Conflict check result
 */
export async function checkTimesheetConflictWithLeave(
  activityDate: Date,
  totalHours: number
): Promise<ConflictCheckResult> {
  try {
    const dateStr = format(activityDate, DATE_FORMATS.API);

    // Fetch leave requests for the user
    const response = await apiClient.get(API_PATHS.LEAVES_REQUESTS_GET, {
      params: {
        startDate: dateStr,
        endDate: dateStr,
      },
    });

    // Handle wrapped or direct array response
    const leaves: LeaveRequest[] = Array.isArray(response.data)
      ? response.data
      : Array.isArray((response.data as { data?: LeaveRequest[] })?.data)
      ? (response.data as { data: LeaveRequest[] }).data
      : [];

    // Filter for approved or pending leaves that overlap with the activity date
    const relevantLeaves = leaves.filter((leave: LeaveRequest) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const actDate = new Date(dateStr);

      // Only consider approved or pending leaves
      // Handle both string format and object format for state
      const stateValue =
        typeof leave.state === "string" ? leave.state : leave.state.code;

      const isRelevantState =
        stateValue === "approved" || stateValue === "pending";

      // Check if activity date falls within leave range
      const isInRange = actDate >= leaveStart && actDate <= leaveEnd;

      return isRelevantState && isInRange;
    });

    if (relevantLeaves.length > 0) {
      const leave = relevantLeaves[0];
      const stateValue =
        typeof leave.state === "string" ? leave.state : leave.state.code;

      if (leave.durationType === "full_day") {
        return {
          hasConflict: true,
          conflictType: "full_day_leave",
          message: `Cannot submit timesheet. You have a ${stateValue} full-day leave for ${format(
            activityDate,
            DATE_FORMATS.DISPLAY
          )}. Please cancel the leave before submitting timesheet entries.`,
        };
      } else if (leave.durationType === "half_day") {
        // For half-day leave, check if total hours exceed allowed limit
        if (totalHours > VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE) {
          return {
            hasConflict: true,
            conflictType: "half_day_leave_hours_exceeded",
            message: `Cannot submit timesheet. You have a ${stateValue} half-day leave for ${format(
              activityDate,
              DATE_FORMATS.DISPLAY
            )}. Maximum allowed hours for this date is ${
              VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE
            }, but you are trying to submit ${totalHours} hours.`,
            existingHours: totalHours,
            maxAllowedHours: VALIDATION.MAX_HOURS_WITH_HALF_DAY_LEAVE,
          };
        }
      }
    }

    return { hasConflict: false };
  } catch (error: unknown) {
    console.error("Error checking timesheet-leave conflict:", error);
    // If the endpoint returns 404 or no leaves found, assume no conflict
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      error.response.status === 404
    ) {
      return { hasConflict: false };
    }
    // For other errors, allow the request but log the error
    return { hasConflict: false };
  }
}

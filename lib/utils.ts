// Returns a Date object representing the IST business date (00:00:00 IST, with 7AM cutoff)
export function getISTBusinessDate(nowUTC: Date = new Date()): Date {
  // Convert UTC to IST (+5:30)
  const utc = nowUTC.getTime() + nowUTC.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const istNow = new Date(utc + istOffset);
  const cutoffHour = 7;
  let businessDate = new Date(istNow);
  if (istNow.getHours() < cutoffHour) {
    businessDate.setDate(businessDate.getDate() - 1);
  }
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}

export function getISTDateTime(nowUTC: Date = new Date()): Date {
  const utc = nowUTC.getTime() + nowUTC.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  return new Date(utc + istOffset);
}

export function getCurrentSalaryCycleStart(nowUTC: Date = new Date()): Date {
  const istNow = getISTDateTime(nowUTC);
  const cycleStartsOn = 26;
  const cutoffHour = 7;

  const cycleStart = new Date(istNow);
  if (
    istNow.getDate() < cycleStartsOn ||
    (istNow.getDate() === cycleStartsOn && istNow.getHours() < cutoffHour)
  ) {
    cycleStart.setMonth(cycleStart.getMonth() - 1);
  }

  cycleStart.setDate(cycleStartsOn);
  cycleStart.setHours(0, 0, 0, 0);
  return cycleStart;
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getLeaveDurationLabel(entry: {
  durationType?: string;
  hours?: number;
}): string {
  const duration = (entry.durationType ?? "").toLowerCase();
  if (duration.includes("half")) return "Half Day";
  if (duration.includes("full")) return "Full Day";
  return (entry.hours ?? 0) <= 4 ? "Half Day" : "Full Day";
}

// Calendar helpers
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
export function getDayOfWeekIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export const extractErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const typedError = error as ApiErrorLike;
  return typedError.response?.data?.message || typedError.message || fallback;
};

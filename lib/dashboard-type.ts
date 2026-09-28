// Dashboard Types - Centralized type definitions for dashboard components

import type { ReactNode } from "react";

export interface TimesheetEntry {
  id?: number | string;
  entryId?: number | string;
  projectId?: number;
  departmentId?: number;
  departmentName: string;
  projectName?: string;
  taskDescription: string;
  hours: number;
  createdAt?: string;
}

export interface LeaveEntry {
  leaveType: {
    name: string;
    code?: string;
  };
  hours: number;
  state?: string;
  durationType?: string;
  halfDaySegment?: string;
  reason?: string;
}

export interface DayData {
  date: string;
  isWorkingDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isLifeline?: boolean;
  timesheet: {
    id: number;
    state: string;
    totalHours: number;
    notes: string;
    createdAt?: string;
    submittedAt?: string;
    entries: TimesheetEntry[];
  } | null;
  leaves: {
    totalHours: number;
    entries: LeaveEntry[];
  } | null;
}

export interface MonthlyTimesheetResponse {
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
    paidLeaves: number;
    totalCompOffLeaveTaken: number;
    totalPayableDays: number;
  };
  days: DayData[];
}

export interface TimesheetRow {
  sno: number;
  department?: string;
  departmentId?: number;
  project: string;
  activities: string;
  date: string;
  day: string;
  hours: number;
  hoursDisplay?: string;
  isLeave: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isLifeline?: boolean;
  leaveStatus?: "approved" | "pending" | "rejected";
  timesheetState?: string;
  entryId?: number | string;
  projectId?: number;
  dateApi?: string;
  createdAt?: string;
}

export interface ProjectOption {
  id: number;
  name: string;
}

export interface DepartmentOption {
  id: number;
  name: string;
  code: string;
}

export type TeamVisibilityScope = "my_reportees" | "all_org";

export type ProjectPillTone = "green" | "yellow" | "red" | "khaki";

export interface DashboardViewSectionProps {
  viewMode: "grid" | "table";
  monthlyData: MonthlyTimesheetResponse | null;
  timesheetRows: TimesheetRow[];
  isTeamMode: boolean;
  canManageTeamEntries: boolean;
  activeCalendarCreatedAtKey: string | null;
  setActiveCalendarCreatedAtKey: (key: string | null | ((prev: string | null) => string | null)) => void;
  setSelectedDay: (day: DayData) => void;
  setIsDaySheetOpen: (open: boolean) => void;
  editingRowKey: string | null;
  setEditingRowKey: (key: string | null) => void;
  editingForm: any;
  setEditingForm: (form: any) => void;
  savingRowKey: string | null;
  deletingRowKey: string | null;
  confirmDeleteRowKey: string | null;
  setConfirmDeleteRowKey: (key: string | null) => void;
  teamDepartments: DepartmentOption[];
  teamProjectsByDepartment: Record<string, ProjectOption[]>;
  teamLoggerProjectsLoading: boolean;
  fetchTeamLoggerProjectsForDepartment: (departmentId: string) => void;
  handleStartEdit: (row: TimesheetRow, index: number) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: (row: TimesheetRow, index: number) => void;
  handleDeleteEntry: (row: TimesheetRow, index: number) => void;
  renderEmptyDayActions: (options: {
    dateApi?: string;
    layout?: "inline" | "stack";
    stopPropagation?: boolean;
    showLabel?: boolean;
  }) => ReactNode;
  getProjectPill: (row: TimesheetRow) => { label: string; tone: ProjectPillTone } | null;
  getProjectPillClassName: (tone: ProjectPillTone) => string;
  formatCreatedAt: (value?: string | null) => string;
  dailyTotals: Map<string, number>;
  dateCreatedAtMap: Map<string, string | undefined>;
  getRowKey: (row: TimesheetRow, index: number) => string;
  highlightedDateApi: string | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

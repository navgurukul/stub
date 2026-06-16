import { extractErrorMessage, ApiErrorLike } from "./utils";

// Shared types for Comp-Off features and components

export type CompOffScope = "my" | "reportees" | "all";

export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface CompOffRequestFormProps {
  onSuccess?: () => void;
  scope?: CompOffScope;
}

export type DurationType = "half_day" | "full_day";

export interface CompOffRequestPayload {
  userId: number;
  workDate: string;
  duration: DurationType;
  notes: string;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export type { ApiErrorLike };

export interface TimesheetDayRecord {
  isHoliday?: boolean;
  date?: unknown;
  [key: string]: unknown;
}

export interface EmployeeApiRecord {
  id?: number | string;
  name?: string;
  email?: string;
  managerId?: unknown;
  manager?: {
    id?: unknown;
  };
  reportingManagerId?: unknown;
  [key: string]: unknown;
}

export type CreditState = "pending" | "granted" | "availed" | "expired" | "partial_availed" | "warning";
export type StatusFilter = "all" | CreditState;

export interface CreditStatusMeta {
  label: string;
  className: string;
}

export interface StatusOption {
  value: StatusFilter;
  label: string;
}

export interface OffDayWorkRow {
  id: string;
  employeeName?: string;
  employeeEmail?: string;
  workDate: string;
  workDateTs: number | null;
  holidayType: string;
  rmRequest: string;
  timesheet: string;
  credited: string;
  availedOn: string | null;
  availedOnTs: number | null;
  expiresOn: string;
  expiresOnTs: number | null;
  state: CreditState;
}

export type OffDayWorkTab = "my-off-day-work" | "my-reportees" | "all-org";
export type OffDayWorkScope = CompOffScope;

export interface OffDayWorkTabOption {
  value: OffDayWorkTab;
  label: string;
}

export interface OffDayWorkPerson {
  managerId?: unknown;
  name?: unknown;
  email?: unknown;
  [key: string]: unknown;
}

export interface OffDayWorkResponseItem {
  id?: unknown;
  managerId?: unknown;
  name?: unknown;
  employeeName?: unknown;
  employeeEmail?: unknown;
  user?: OffDayWorkPerson;
  employee?: OffDayWorkPerson;
  [key: string]: unknown;
}

export interface OffDayWorkGroupedUser {
  user?: OffDayWorkResponseItem;
  credits?: OffDayWorkResponseItem[];
  [key: string]: unknown;
}

export interface CompOffSummary {
  total: number;
  active: number;
  availed: number;
  expired: number;
}

export interface CreditsSummaryProps {
  summary: CompOffSummary | null;
}

export interface OffDayWorkTableProps {
  rows: OffDayWorkRow[];
  showEmployee: boolean;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  searchPlaceholder: string;
  loading: boolean;
  error: string | null;
}

export const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

export const toTimesheetDays = (value: unknown): TimesheetDayRecord[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => toObject(item) !== null)
    .map((item) => item as TimesheetDayRecord);
};

export const toEmployeeRecords = (value: unknown): EmployeeApiRecord[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => toObject(item) !== null)
    .map((item) => item as EmployeeApiRecord);
};

export { extractErrorMessage };

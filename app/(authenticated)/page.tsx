"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutGrid,
  List,
  Plus,
  Calendar,
  Clock,
  Check,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  cn,
  getCurrentSalaryCycleStart,
  getISTBusinessDate,
  getLeaveDurationLabel,
} from "@/lib/utils";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  SearchCombobox,
  SearchComboboxOption,
} from "@/components/ui/search-combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardRowStats } from "@/hooks/use-dashboard-row-stats";
import { useDashboardViewState } from "@/hooks/use-dashboard-view-state";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { CalendarViewComponent } from "./_components/CalendarViewComponent";
import { ListViewComponent } from "./_components/ListViewComponent";
import { TimesheetPdfExportButton } from "./_components/TimesheetPdfExportButton";
import { TeamActivityLoggerSheet } from "./_components/TeamActivityLoggerSheet";

import {
  TimesheetEntry,
  LeaveEntry,
  DayData,
  MonthlyTimesheetResponse,
  TimesheetRow,
  ProjectOption,
  DepartmentOption,
  TeamVisibilityScope,
  ProjectPillTone,
} from "@/lib/dashboard-type";

const toDisplayLabel = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatCreatedAt = (value?: string | null) => {
  if (!value) return "-";
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd/MM/yyyy HH:mm");
};

const getProjectPillClassName = (tone: ProjectPillTone) => {
  return cn("dashboard-status-pill", {
    "dashboard-status-pill--green": tone === "green",
    "dashboard-status-pill--yellow": tone === "yellow",
    "dashboard-status-pill--red": tone === "red",
    "dashboard-status-pill--khaki": tone === "khaki",
  });
};
const getProjectPill = (row: TimesheetRow) => {
  if (row.isLeave) {
    return {
      label: row.project,
      tone: row.leaveStatus === "rejected"
        ? "red"
        : row.leaveStatus === "pending"
          ? "yellow"
          : "green",
    } as const;
  }

  if (row.isHoliday) {
    return { label: "Public Holiday", tone: "green" } as const;
  }

  if (row.isWeekend) {
    return { label: "Off Day", tone: "green" } as const;
  }

  if (row.activities === "-") {
    return { label: "No Entries", tone: "khaki" } as const;
  }
  return null;
};

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-left">Day</TableHead>
                <TableHead className="text-left">Project</TableHead>
                <TableHead className="text-left">Activity</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheetRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No records for this month.
                  </TableCell>
                </TableRow>
              ) : (
                timesheetRows.map((r) => (
                  <TableRow key={r.sno}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.day}</TableCell>
                    <TableCell>{r.project}</TableCell>
                    <TableCell>{r.activities}</TableCell>
                    <TableCell className="text-right">{r.hours}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, user } = useAuth();
  const targetDateParam = searchParams?.get("date") ?? null;
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    const cycleStartsOn = 26;
    let cycleStart = new Date(today);
    if (today.getDate() < cycleStartsOn) {
      cycleStart.setMonth(today.getMonth() - 1);
    }
    cycleStart.setDate(cycleStartsOn);
    cycleStart.setHours(0, 0, 0, 0);
    return cycleStart;
  });
  // Separate state for employee salary cycle when viewing team members
  const [employeeCurrentMonth, setEmployeeCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    const cycleStartsOn = 26;
    let cycleStart = new Date(today);
    if (today.getDate() < cycleStartsOn) {
      cycleStart.setMonth(today.getMonth() - 1);
    }
    cycleStart.setDate(cycleStartsOn);
    cycleStart.setHours(0, 0, 0, 0);
    return cycleStart;
  });
  const [monthlyData, setMonthlyData] =
    useState<MonthlyTimesheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);

  // Team dashboard / search (admin/super admin/manager)
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamVisibilityScope, setTeamVisibilityScope] =
    useState<TeamVisibilityScope>("my_reportees");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [teamSearchError, setTeamSearchError] = useState<string | null>(null);
  const [teamUser, setTeamUser] = useState<any | null>(null);

  // Restore from browser history on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = window.history.state || {};
    if (state.__teamDashboard) {
      setIsTeamMode(!!state.__teamDashboard.isTeamMode);
      const storedScope = state.__teamDashboard.teamVisibilityScope;
      if (storedScope === "all_org" || storedScope === "my_reportees") {
        setTeamVisibilityScope(storedScope);
      }
      setTeamSearch(state.__teamDashboard.teamSearch || "");
      setTeamUser(state.__teamDashboard.teamUser || null);
    }
  }, []);

  const [refreshTick, setRefreshTick] = useState(0);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({
    departmentId: "",
    project: "",
    projectId: "",
    date: "",
    hours: "",
    activities: "",
  });
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [confirmDeleteRowKey, setConfirmDeleteRowKey] = useState<string | null>(null);
  const [activeCalendarCreatedAtKey, setActiveCalendarCreatedAtKey] = useState<string | null>(null);
  const [teamProjects, setTeamProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isEditingLifeline, setIsEditingLifeline] = useState(false);
  const [lifelineDraft, setLifelineDraft] = useState("");
  const [isSavingLifeline, setIsSavingLifeline] = useState(false);
  const [isTeamLoggerOpen, setIsTeamLoggerOpen] = useState(false);
  const [isSubmittingTeamLogger, setIsSubmittingTeamLogger] = useState(false);
  const [teamDepartments, setTeamDepartments] = useState<DepartmentOption[]>([]);
  const [teamProjectsByDepartment, setTeamProjectsByDepartment] = useState<
    Record<string, ProjectOption[]>
  >({});

  const getEarliestTrackableDate = useCallback(() => {
    const today = getISTBusinessDate();
    today.setHours(0, 0, 0, 0);

    const backfillRemaining = Number(user?.backfill?.remaining ?? 0);
    if (backfillRemaining <= 0) {
      return today;
    }

    const workDaysNeeded = 3;
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - 1);

    let found = 0;
    while (found < workDaysNeeded) {
      const dayName = format(cursor, "EEEE");
      const dayOfMonth = cursor.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      const isSaturday = dayName === "Saturday";
      const is2ndOr4thSaturday =
        isSaturday && (weekOfMonth === 2 || weekOfMonth === 4);
      const isSunday = dayName === "Sunday";

      if (!isSunday && !is2ndOr4thSaturday) {
        found += 1;
      }

      if (found < workDaysNeeded) {
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    cursor.setHours(0, 0, 0, 0);
    return cursor;
  }, [user?.backfill?.remaining]);

  const isAddEntryEligibleDate = useCallback(
    (dateApi?: string) => {
      if (!dateApi || isTeamMode) return false;

      const targetDate = parseISO(dateApi);
      if (!isValid(targetDate)) return false;
      targetDate.setHours(0, 0, 0, 0);

      const today = getISTBusinessDate();
      today.setHours(0, 0, 0, 0);
      if (targetDate.getTime() > today.getTime()) return false;

      const currentCycleStart = getCurrentSalaryCycleStart();
      currentCycleStart.setHours(0, 0, 0, 0);
      if (targetDate.getTime() < currentCycleStart.getTime()) return false;

      const earliestTrackableDate = getEarliestTrackableDate();
      return targetDate.getTime() >= earliestTrackableDate.getTime();
    },
    [getEarliestTrackableDate, isTeamMode]
  );

  const isLeaveEligibleDate = useCallback(
    (dateApi?: string) => {
      if (!dateApi || isTeamMode) return false;

      const targetDate = parseISO(dateApi);
      if (!isValid(targetDate)) return false;
      targetDate.setHours(0, 0, 0, 0);

      const currentCycleStart = getCurrentSalaryCycleStart();
      currentCycleStart.setHours(0, 0, 0, 0);
      return targetDate.getTime() >= currentCycleStart.getTime();
    },
    [isTeamMode]
  );

  const openAddEntryForm = useCallback(
    (dateApi: string) => {
      setIsDaySheetOpen(false);
      router.push(`/tracker?date=${dateApi}`);
    },
    [router]
  );
  const openLeaveApplicationForm = useCallback(
    (dateApi: string) => {
      setIsDaySheetOpen(false);
      router.push(`/leaves?openNewRequest=1&date=${dateApi}`);
    },
    [router]
  );

  const renderEmptyDayActions = useCallback(
    ({
      dateApi,
      layout = "inline",
      stopPropagation = false,
      showLabel = true,
    }: {
      dateApi?: string;
      layout?: "inline" | "stack";
      stopPropagation?: boolean;
      showLabel?: boolean;
    }) => {
      if (!dateApi) {
        return showLabel
          ? <span className="text-muted-foreground">No entry</span>
          : null;
      }

      const canAddEntry = isAddEntryEligibleDate(dateApi);
      const canSubmitLeave = isLeaveEligibleDate(dateApi);

      const handleActionClick = (
        event: React.MouseEvent<HTMLButtonElement>,
        action: () => void
      ) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        action();
      };

      const actionButtons = (
        <div className={cn("flex flex-wrap gap-2", layout === "inline" && "items-center")}>
          {canAddEntry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={(event) =>
                handleActionClick(event, () => openAddEntryForm(dateApi))
              }
            >
              Add entry
            </Button>
          )}
          {canSubmitLeave && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={(event) =>
                handleActionClick(event, () => openLeaveApplicationForm(dateApi))
              }
            >
              Submit Leave
            </Button>
          )}
        </div>
      );

      if (!showLabel) {
        return actionButtons;
      }

      if (layout === "stack") {
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No entry</p>
            {actionButtons}
          </div>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">No entry</span>
          {actionButtons}
        </div>
      );
    },
    [
      isAddEntryEligibleDate,
      isLeaveEligibleDate,
      openAddEntryForm,
      openLeaveApplicationForm,
    ]
  );
  const [teamLoggerProjectsLoading, setTeamLoggerProjectsLoading] = useState(false);
  const [teamLoggerForm, setTeamLoggerForm] = useState({
    workDate: format(new Date(), DATE_FORMATS.API),
    departmentId: "",
    projectId: "",
    hours: "",
    activities: "",
  });

  const getBillingCycleAnchorDate = (inputDate: Date) => {
    const d = new Date(inputDate);
    const cycleStartsOn = 26;
    if (d.getDate() < cycleStartsOn) {
      d.setMonth(d.getMonth() - 1);
    }

    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getResolvedUserId = (candidate: any): number | null => {
    const rawId =
      candidate?.id ?? candidate?.userId ?? candidate?.user?.id ?? null;
    const numericId = Number(rawId);
    return Number.isFinite(numericId) ? numericId : null;
  };
  const isSelfAsTeamMember = (candidate: any) => {
    const currentUserId = getResolvedUserId(user);
    const candidateUserId = getResolvedUserId(candidate);
    return (
      currentUserId !== null &&
      candidateUserId !== null &&
      currentUserId === candidateUserId
    );
  };

  // Check if user can access team dashboard
  const canAccessTeamDashboard = useMemo(() => {
    const roles = (user as any)?.roles;
    if (Array.isArray(roles)) {
      return roles.some((role) => {
        const normalizedRole = String(role).toLowerCase();
        return (
          normalizedRole === "admin" ||
          normalizedRole === "super_admin" ||
          normalizedRole === "manager"
        );
      });
    }
    if (typeof roles === "string") {
      const normalizedRole = roles.toLowerCase();
      return (
        normalizedRole === "admin" ||
        normalizedRole === "super_admin" ||
        normalizedRole === "manager"
      );
    }
    return false;
  }, [user]);

  const canEditTeamLifeline = useMemo(() => {
    const roles = (user as any)?.roles;
    if (Array.isArray(roles)) {
      return roles.some((role) => {
        const normalizedRole = String(role).toLowerCase();
        return normalizedRole === "admin" || normalizedRole === "super_admin";
      });
    }
    if (typeof roles === "string") {
      const normalizedRole = roles.toLowerCase();
      return normalizedRole === "admin" || normalizedRole === "super_admin";
    }
    return false;
  }, [user]);

  const canManageTeamEntries = canEditTeamLifeline;

  const normalizedRoleSet = useMemo(() => {
    const rawRoles = (user as any)?.roles;
    if (Array.isArray(rawRoles)) {
      return new Set(
        rawRoles
          .map((role) => String(role).toLowerCase().replace(/[_\s-]/g, ""))
          .filter(Boolean)
      );
    }
    if (typeof rawRoles === "string") {
      return new Set([rawRoles.toLowerCase().replace(/[_\s-]/g, "")]);
    }
    return new Set<string>();
  }, [user]);

  const isReportingManagerOnly = useMemo(() => {
    const hasManagerRole = normalizedRoleSet.has("manager");
    const hasElevatedRole =
      normalizedRoleSet.has("admin") || normalizedRoleSet.has("superadmin");
    return hasManagerRole && !hasElevatedRole;
  }, [normalizedRoleSet]);

  const canAccessAllOrgDashboard = useMemo(() => {
    return canAccessTeamDashboard && !isReportingManagerOnly;
  }, [canAccessTeamDashboard, isReportingManagerOnly]);

  const isReporteeScope = teamVisibilityScope === "my_reportees";

  const canAccessTeamMemberByHierarchy = useCallback(
    async (rawValue: string, scopeOverride?: TeamVisibilityScope) => {
      const normalizedValue = rawValue.trim().toLowerCase();
      if (!normalizedValue || !user?.orgId) return false;
      const effectiveScope = scopeOverride ?? teamVisibilityScope;
      const shouldRestrictToReportees =
        isReportingManagerOnly || effectiveScope === "my_reportees";

      const params: Record<string, any> = {
        orgId: user.orgId,
        q: normalizedValue,
        page: 1,
        limit: 20,
      };

      if (shouldRestrictToReportees && user?.id) {
        params.managerId = user.id;
      }

      const res = await apiClient.get(API_PATHS.EMPLOYEES, { params });
      const responseData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const items = Array.isArray(responseData)
        ? responseData
        : responseData.data || [];

      return items.some((item: any) => {
        const email = String(item?.email ?? "").trim().toLowerCase();
        const id = Number(item?.id);
        const isNotSelf = !Number.isFinite(id) || id !== Number(user?.id);
        return email === normalizedValue && isNotSelf;
      });
    },
    [isReportingManagerOnly, teamVisibilityScope, user?.id, user?.orgId]
  );

  const fetchTeamMemberOptions = async (
    query: string
  ): Promise<SearchComboboxOption[]> => {
    if (!user?.orgId) return [];

    try {
      const params: Record<string, any> = {
        orgId: user.orgId,
        q: query,
        page: 1,
        limit: 1000,
      };

      // Reporting Managers must only see direct reportees.
      if ((isReportingManagerOnly || isReporteeScope) && user?.id) {
        params.managerId = user.id;
      }

      const res = await apiClient.get(API_PATHS.EMPLOYEES, {
        params,
      });

      const responseData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const items = Array.isArray(responseData)
        ? responseData
        : responseData.data || [];

      return items
        .filter((item: any) => {
          const itemId = Number(item?.id);
          const managerId = Number(item?.managerId);

          if (Number.isFinite(itemId) && Number(itemId) === Number(user?.id)) {
            return false;
          }

          if (
            (isReportingManagerOnly || isReporteeScope) &&
            Number.isFinite(Number(user?.id))
          ) {
            return Number.isFinite(managerId) && managerId === Number(user?.id);
          }

          return true;
        })
        .map((item: any) => ({
          value: String(item?.email ?? "").trim(),
          label: String(item?.name ?? item?.email ?? "").trim(),
          description: String(item?.email ?? "").trim(),
        }))
        .filter((item: SearchComboboxOption) => Boolean(item.value));
    } catch (err: unknown) {
      console.error("Failed to fetch team member suggestions:", err);
      return [];
    }
  };

  const searchTeamMemberByEmail = async (
    rawValue: string,
    persist = true,
    scopeOverride?: TeamVisibilityScope
  ) => {
    const normalizedValue = rawValue.trim();
    if (!normalizedValue) return;
    const effectiveScope = scopeOverride ?? teamVisibilityScope;
    const shouldRestrictToReportees =
      isReportingManagerOnly || effectiveScope === "my_reportees";

    setTeamSearch(normalizedValue);
    // Persist in browser history
    if (persist && typeof window !== "undefined") {
      const state = window.history.state || {};
      window.history.replaceState({
        ...state,
        __teamDashboard: {
          ...state.__teamDashboard,
          isTeamMode: true,
          teamVisibilityScope: effectiveScope,
          teamSearch: normalizedValue,
        },
      }, "");
    }
    setTeamSearchLoading(true);
    setTeamSearchError(null);

    try {
      if (shouldRestrictToReportees) {
        const hasAccess = await canAccessTeamMemberByHierarchy(
          normalizedValue,
          effectiveScope
        );
        if (!hasAccess) {
          setTeamUser(null);
          setMonthlyData(null);
          setTeamSearchError("You can search only your direct reportees.");
          toast.error("Access denied", {
            description: "You can search only your direct reportees.",
          });
          return;
        }
      }

      const res = await apiClient.get(API_PATHS.EMPLOYEE_SEARCH, {
        params: { email: normalizedValue },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const data = res.data;
      const searchedUser = data?.user ?? data;

      if (isSelfAsTeamMember(searchedUser)) {
        setTeamUser(null);
        setMonthlyData(null);
        setTeamSearchError("You cannot select yourself.");
        toast.error("You cannot select yourself.");
        if (persist && typeof window !== "undefined") {
          const state = window.history.state || {};
          window.history.replaceState({
            ...state,
            __teamDashboard: {
              ...state.__teamDashboard,
              teamUser: null,
            },
          }, "");
        }
        return;
      }

      const fallbackEmail = normalizedValue;

      let normalizedTeamUser = null;
      if (data && data.days && data.user) {
        normalizedTeamUser = {
          ...data.user,
          searchedEmail: fallbackEmail,
          backfill:
            (data.user as any)?.backfill ?? (data as any)?.backfill ?? null,
        };
        setMonthlyData(data as MonthlyTimesheetResponse);
        setTeamUser(normalizedTeamUser);
        setTeamSearchError(null);
        toast.success("Team member data loaded");
      } else if (data?.user) {
        normalizedTeamUser = {
          ...data.user,
          searchedEmail: fallbackEmail,
          backfill:
            (data.user as any)?.backfill ?? (data as any)?.backfill ?? null,
        };
        setTeamUser(normalizedTeamUser);
        setTeamSearchError(null);
        toast.success("Team member selected");
      } else {
        normalizedTeamUser = {
          ...(data || {}),
          searchedEmail: fallbackEmail,
        };
        setTeamUser(normalizedTeamUser);
        setTeamSearchError(null);
        toast.success("Team member selected");
      }
      if (persist && typeof window !== "undefined" && normalizedTeamUser) {
        const state = window.history.state || {};
        window.history.replaceState({
          ...state,
          __teamDashboard: {
            ...state.__teamDashboard,
            teamUser: normalizedTeamUser,
            isTeamMode: true,
            teamVisibilityScope: effectiveScope,
          },
        }, "");
      }
    } catch (err: unknown) {
      console.error("Team search error:", err);
      setTeamSearchError("No user found");
      toast.error("Team search failed");
    } finally {
      setTeamSearchLoading(false);
    }
  };
  // Restore from browser history on mount and fetch data if needed
  useEffect(() => {
    if (isReportingManagerOnly && teamVisibilityScope === "all_org") {
      setTeamVisibilityScope("my_reportees");
    }
  }, [isReportingManagerOnly, teamVisibilityScope]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = window.history.state || {};
    if (state.__teamDashboard) {
      setIsTeamMode(!!state.__teamDashboard.isTeamMode);
      const storedScope = state.__teamDashboard.teamVisibilityScope;
      const resolvedScope: TeamVisibilityScope =
        storedScope === "all_org" ? "all_org" : "my_reportees";
      if (storedScope === "all_org" || storedScope === "my_reportees") {
        setTeamVisibilityScope(storedScope);
      }
      setTeamSearch(state.__teamDashboard.teamSearch || "");
      setTeamUser(state.__teamDashboard.teamUser || null);
      if (state.__teamDashboard.isTeamMode && state.__teamDashboard.teamSearch) {
        searchTeamMemberByEmail(
          state.__teamDashboard.teamSearch,
          false,
          resolvedScope
        );
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = window.history.state || {};
    if (isTeamMode) {
      window.history.replaceState({
        ...state,
        __teamDashboard: {
          ...state.__teamDashboard,
          isTeamMode: true,
          teamVisibilityScope,
          teamUser,
          teamSearch,
        },
      }, "");
    } else {
      const { __teamDashboard, ...rest } = state;
      window.history.replaceState(rest, "");
    }
  }, [isTeamMode, teamVisibilityScope, teamUser, teamSearch]);

  useEffect(() => {
    setIsEditingLifeline(false);
    setLifelineDraft("");
    // Persist team mode and user on change
    if (typeof window !== "undefined") {
      localStorage.setItem("team-dashboard-mode", String(isTeamMode));
      localStorage.setItem("team-dashboard-scope", teamVisibilityScope);
      if (!isTeamMode) {
        localStorage.removeItem("team-dashboard-user");
        localStorage.removeItem("team-dashboard-search");
        setEmployeeCurrentMonth(() => {
          const today = new Date();
          const cycleStartsOn = 26;
          let cycleStart = new Date(today);
          if (today.getDate() < cycleStartsOn) {
            cycleStart.setMonth(today.getMonth() - 1);
          }
          cycleStart.setDate(cycleStartsOn);
          cycleStart.setHours(0, 0, 0, 0);
          return cycleStart;
        });
      }
    }
  }, [isTeamMode, teamVisibilityScope, teamUser?.id]);
  // Restore persisted team dashboard state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistedMode = localStorage.getItem("team-dashboard-mode") === "true";
    const persistedUserRaw = localStorage.getItem("team-dashboard-user");
    const persistedSearch = localStorage.getItem("team-dashboard-search");
    const persistedScope = localStorage.getItem("team-dashboard-scope");
    if (persistedMode && persistedUserRaw) {
      try {
        const persistedUser = JSON.parse(persistedUserRaw);
        setIsTeamMode(true);
        if (persistedScope === "all_org" || persistedScope === "my_reportees") {
          setTeamVisibilityScope(persistedScope);
        }
        setTeamUser(persistedUser);
        if (persistedSearch) setTeamSearch(persistedSearch);
      } catch { }
    }
  }, []);

  useEffect(() => {
    if (!targetDateParam || isTeamMode) return;

    const parsedDate = parseISO(targetDateParam);
    if (Number.isNaN(parsedDate.getTime())) return;

    setCurrentMonth(getBillingCycleAnchorDate(parsedDate));
  }, [targetDateParam, isTeamMode]);

  // Fetch timesheet data
  useEffect(() => {
    if (authLoading) return;

    // If we're in team mode but no team user selected, clear data and skip fetch.
    if (isTeamMode && !teamUser) {
      setMonthlyData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    // Admin should not view their own data inside Team Dashboard mode.
    if (isTeamMode && teamUser && isSelfAsTeamMember(teamUser)) {
      setMonthlyData(null);
      setError("You cannot view your own data in Team Dashboard");
      setIsLoading(false);
      return;
    }

    if (isTeamMode && teamUser && !canManageTeamEntries) {
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchMonthlyData = async () => {
      const id = ++fetchIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const monthToUse = isTeamMode ? employeeCurrentMonth : currentMonth;
        const year = monthToUse.getFullYear();
        const month = monthToUse.getMonth() + 1;

        // If teamUser is selected, include their id so backend returns that user's data
        const params: Record<string, any> = { year, month };
        if (teamUser?.id) params.userId = teamUser.id;

        const response = await apiClient.get<MonthlyTimesheetResponse>(
          API_PATHS.MONTHLY_TIMESHEET,
          {
            params,
          }
        );

        if (id !== fetchIdRef.current) return;
        setMonthlyData(response.data);
      } catch (err: unknown) {
        if (id !== fetchIdRef.current) return;
        const error = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (error.response?.status === 403 && isTeamMode) {
          setError(null);
          return;
        }

        console.error("Error fetching monthly data:", err);

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
  }, [currentMonth, employeeCurrentMonth, authLoading, isTeamMode, teamUser, refreshTick, user?.id, teamVisibilityScope]);
  useEffect(() => {
    if (authLoading || !user?.orgId || !canAccessTeamDashboard) return;

    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        let page = 1;
        let hasMore = true;
        const allProjects: ProjectOption[] = [];

        while (hasMore) {
          const res = await apiClient.get(API_PATHS.PROJECTS, {
            params: { orgId: user.orgId, page, limit: 100 },
          });

          const responseData = Array.isArray(res.data)
            ? res.data
            : res.data?.data || [];
          const items = Array.isArray(responseData)
            ? responseData
            : responseData.data || [];

          const normalized = items
            .map((p: any) => ({
              id: Number(p.id),
              name: String(p.name ?? p.projectName ?? ""),
            }))
            .filter((p: ProjectOption) => Number.isFinite(p.id) && p.name);

          allProjects.push(...normalized);

          const total = Number(res.data?.total ?? normalized.length);
          hasMore = allProjects.length < total;
          page += 1;

          if (!res.data?.total) {
            hasMore = false;
          }
        }
        const unique = Array.from(
          new Map(allProjects.map((p) => [p.id, p])).values()
        );
        setTeamProjects(unique);
      } catch (err: unknown) {
        console.error("Failed to load projects for edit:", err);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [authLoading, user?.orgId, canAccessTeamDashboard]);

  useEffect(() => {
    if (authLoading || !user?.orgId || !canAccessTeamDashboard) return;

    const fetchDepartments = async () => {
      try {
        const res = await apiClient.get(API_PATHS.DEPARTMENTS, {
          params: { orgId: user.orgId },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const normalized = list
          .map((dept: any) => ({
            id: Number(dept.id),
            name: String(dept.name ?? ""),
            code: String(dept.code ?? ""),
          }))
          .filter(
            (dept: DepartmentOption) =>
              Number.isFinite(dept.id) && Boolean(dept.name)
          );
        setTeamDepartments(normalized);
      } catch (err: unknown) {
        console.error("Failed to load departments for team logger:", err);
      }
    };

    fetchDepartments();
  }, [authLoading, user?.orgId, canAccessTeamDashboard]);
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
      const timesheetEntries = day.timesheet?.entries ?? [];
      const timesheetDayCreatedAt = day.timesheet?.createdAt;
      const leaveEntries = day.leaves?.entries ?? [];
      const hasTimesheetEntries = timesheetEntries.length > 0;
      const hasLeaveEntries = leaveEntries.length > 0;

      // Add timesheet entries
      if (hasTimesheetEntries) {
        timesheetEntries.forEach((entry) => {
          rows.push({
            sno: sno++,
            department: entry.departmentName || "-",
            departmentId: (entry as any).departmentId,
            project: entry.projectName || "-",
            activities: entry.taskDescription || "-",
            date: format(parsedDate, "dd/MM/yyyy"),
            dateApi: format(parsedDate, DATE_FORMATS.API),
            day: dayOfWeek,
            hours: entry.hours,
            isLeave: false,
            isWeekend: isWeekendOff,
            isHoliday: day.isHoliday,
            timesheetState: day.timesheet?.state,
            entryId: (entry as any).id ?? (entry as any).entryId ?? undefined,
            projectId: (entry as any).projectId,
            createdAt: entry.createdAt ?? timesheetDayCreatedAt,
          });
        });
      }

      // Add leave entries
      if (hasLeaveEntries) {
        leaveEntries.forEach((entry) => {
          const leaveStatus =
            (entry as any).state === "rejected"
              ? "rejected"
              : (entry as any).state === "pending"
                ? "pending"
                : "approved";

          const leaveName = entry.leaveType?.name || "Leave";
          const leaveDurationLabel = getLeaveDurationLabel(entry);
          const leaveStatusLabel = toDisplayLabel(leaveStatus);

          rows.push({
            sno: sno++,
            project: `${leaveName} (${leaveStatusLabel})`,
            activities: "-",
            date: format(parsedDate, "dd/MM/yyyy"),
            dateApi: format(parsedDate, DATE_FORMATS.API),
            day: dayOfWeek,
            hours: entry.hours,
            hoursDisplay: leaveDurationLabel,
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
        !hasTimesheetEntries &&
        !hasLeaveEntries
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
      if (!isWeekendOff && !day.isHoliday && !hasTimesheetEntries && !hasLeaveEntries) {
        rows.push({
          sno: sno++,
          project: "-",
          activities: "-",
          date: format(parsedDate, "dd/MM/yyyy"),
          dateApi: format(parsedDate, DATE_FORMATS.API),
          day: dayOfWeek,
          hours: 0,
          isLeave: false,
          isWeekend: false,
          isHoliday: false,
        });
      }
    });

    return rows;
  }, [monthlyData]);

  const {
    viewMode,
    setViewMode,
    highlightedDateApi,
  } = useDashboardViewState({
    userId: user?.id ?? null,
    targetDateParam,
    timesheetRows,
    isLoading,
    router,
  });
  const { dailyTotals, dateCreatedAtMap } = useDashboardRowStats(timesheetRows);

  const leaveDaysDisplay = useMemo(() => {
    if (!monthlyData) return 0;
    const totalLeaveDays =
      monthlyData.totals.paidLeaves + monthlyData.totals.totalCompOffLeaveTaken;
    return Number.isInteger(totalLeaveDays)
      ? totalLeaveDays
      : Number(totalLeaveDays.toFixed(1));
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

  const resolvedBackfill = useMemo(() => {
    if (isTeamMode) {
      return (teamUser as any)?.backfill ?? null;
    }
    return (user as any)?.backfill ?? null;
  }, [isTeamMode, teamUser, user]);

  const getTeamTargetUserId = () => {
    const teamSelectedId = Number(teamUser?.id);
    if (Number.isFinite(teamSelectedId)) return teamSelectedId;
    const fetchedUserId = Number((monthlyData as any)?.user?.id);
    if (Number.isFinite(fetchedUserId)) return fetchedUserId;
    return null;
  };

  const postBackfillLimitWithFallbackPayloads = async (
    payloads: Array<Record<string, unknown>>
  ) => {
    let lastError: unknown;
    for (const payload of payloads) {
      try {
        await apiClient.post(API_PATHS.BACKFILL_LIMIT, payload);
        return;
      } catch (err: unknown) {
        lastError = err;
        if (!isUnknownProperty400(err)) {
          throw err;
        }
      }
    }
    throw lastError;
  };

  const resetTeamLoggerForm = () => {
    setTeamLoggerForm({
      workDate: format(new Date(), DATE_FORMATS.API),
      departmentId: "",
      projectId: "",
      hours: "",
      activities: "",
    });
  };

  const fetchTeamLoggerProjectsForDepartment = async (departmentId: string) => {
    const numericDepartmentId = Number(departmentId);
    if (!user?.orgId || !Number.isFinite(numericDepartmentId)) return;

    if (teamProjectsByDepartment[departmentId]?.length) return;

    setTeamLoggerProjectsLoading(true);
    try {
      let page = 1;
      let hasMore = true;
      const allProjects: ProjectOption[] = [];

      while (hasMore) {
        const res = await apiClient.get(API_PATHS.PROJECTS, {
          params: {
            orgId: user.orgId,
            departmentId: numericDepartmentId,
            page,
            limit: 100,
          },
        });

        const responseData = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];

        const normalized = items
          .map((project: any) => ({
            id: Number(project.id),
            name: String(project.name ?? project.projectName ?? ""),
          }))
          .filter(
            (project: ProjectOption) =>
              Number.isFinite(project.id) && Boolean(project.name)
          );

        allProjects.push(...normalized);

        const total = Number(res.data?.total ?? normalized.length);
        hasMore = allProjects.length < total;
        page += 1;

        if (!res.data?.total) {
          hasMore = false;
        }
      }

      const unique = Array.from(
        new Map(allProjects.map((project) => [project.id, project])).values()
      );
      setTeamProjectsByDepartment((prev) => ({
        ...prev,
        [departmentId]: unique,
      }));
    } catch (err: unknown) {
      console.error("Failed to load department projects for team logger:", err);
      toast.error("Failed to load projects", {
        description: "Please try again.",
      });
    } finally {
      setTeamLoggerProjectsLoading(false);
    }
  };

  const postAdminCreateWithFallbackPayloads = async (
    payloads: Array<Record<string, unknown>>
  ) => {
    let lastError: unknown;
    for (const payload of payloads) {
      try {
        await apiClient.post(API_PATHS.TIMESHEET_ADMIN_CREATE, payload);
        return;
      } catch (err: unknown) {
        lastError = err;
        if (!isUnknownProperty400(err)) {
          throw err;
        }
      }
    }
    throw lastError;
  };

  const handleStartLifelineEdit = () => {
    if (!isTeamMode || !teamUser || !canEditTeamLifeline) return;
    const currentValue = Number((teamUser as any)?.backfill?.remaining ?? 0);
    setLifelineDraft(String(Number.isFinite(currentValue) ? currentValue : 0));
    setIsEditingLifeline(true);
  };

  const handleCancelLifelineEdit = () => {
    setIsEditingLifeline(false);
    setLifelineDraft("");
  };

  const handleSaveLifeline = async () => {
    const targetUserId = getTeamTargetUserId();
    if (!targetUserId) {
      toast.error("Unable to identify team member");
      return;
    }

    const updatedLimit = Number(lifelineDraft);
    if (!Number.isFinite(updatedLimit) || updatedLimit < 0) {
      toast.error("Invalid lifeline limit", {
        description: "Lifeline limit must be a number greater than or equal to 0.",
      });
      return;
    }

    const normalizedLimit = Math.floor(updatedLimit);
    const monthFromData = Number(monthlyData?.period?.month);
    const yearFromData = Number(monthlyData?.period?.year);
    const monthToUseForContext = isTeamMode ? employeeCurrentMonth : currentMonth;
    const requestMonth = Number.isInteger(monthFromData)
      ? monthFromData
      : monthToUseForContext.getMonth() + 1;
    const requestYear = Number.isInteger(yearFromData)
      ? yearFromData
      : monthToUseForContext.getFullYear();

    if (!Number.isInteger(requestYear) || !Number.isInteger(requestMonth)) {
      toast.error("Unable to update lifeline", {
        description: "Month/year context is missing.",
      });
      return;
    }

    const contextPayload = {
      year: requestYear,
      month: requestMonth,
    };

    setIsSavingLifeline(true);
    try {
      await postBackfillLimitWithFallbackPayloads([
        {
          ...contextPayload,
          userId: targetUserId,
          limit: normalizedLimit,
        },
      ]);
      setTeamUser((prev: any) => {
        if (!prev) return prev;
        const previousLimit = Number(prev.backfill?.limit ?? 0);
        const previousRemaining = Number(prev.backfill?.remaining ?? 0);
        const consumedCount =
          Number.isFinite(previousLimit) && Number.isFinite(previousRemaining)
            ? Math.max(previousLimit - previousRemaining, 0)
            : 0;
        const nextRemaining = Math.max(normalizedLimit - consumedCount, 0);

        return {
          ...prev,
          backfill: {
            ...(prev.backfill || {}),
            limit: normalizedLimit,
            remaining: nextRemaining,
          },
        };
      });
      setIsEditingLifeline(false);
      setRefreshTick((prev) => prev + 1);
      toast.success("Lifeline limit updated successfully");
    } catch (err: unknown) {
      console.error("Failed to update lifeline:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update lifeline limit";
      toast.error("Lifeline limit update failed", {
        description: message,
      });
    } finally {
      setIsSavingLifeline(false);
    }
  };

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
    if (isTeamMode) {
      setEmployeeCurrentMonth((prev) => subMonths(prev, 1));
    } else {
      setCurrentMonth((prev) => subMonths(prev, 1));
    }
  };

  const handleNextMonth = () => {
    if (isTeamMode) {
      setEmployeeCurrentMonth((prev) => addMonths(prev, 1));
    } else {
      setCurrentMonth((prev) => addMonths(prev, 1));
    }
  };

  const getRowKey = (row: TimesheetRow, index: number) =>
    `${row.entryId ?? "no-entry"}-${row.date}-${index}`;
  const getTeamEditContext = () => {
    const actorId = (user as any)?.id;
    const targetUserId =
      (teamUser as any)?.id ?? (monthlyData as any)?.user?.id ?? null;

    if (!actorId || !targetUserId) {
      toast.error("Unable to identify actor or team member");
      return null;
    }
    return { actorId, targetUserId };
  };
  const buildTimesheetEntryPath = (
    template: string,
    actorId: number | string,
    targetUserId: number | string,
    entryId: number | string
  ) =>
    template
      .replace("{actorId}", String(actorId))
      .replace("{targetUserId}", String(targetUserId))
      .replace("{entryId}", String(entryId));

  const handleStartEdit = (row: TimesheetRow, index: number) => {
    const rowKey = getRowKey(row, index);
    const mappedDepartmentId =
      row.departmentId ??
      teamDepartments.find(
        (d) =>
          row.department &&
          d.name.toLowerCase() === row.department.toLowerCase()
      )?.id;
    const departmentKey = mappedDepartmentId ? String(mappedDepartmentId) : "";

    if (departmentKey) {
      void fetchTeamLoggerProjectsForDepartment(departmentKey);
    }

    const departmentProjects = departmentKey
      ? teamProjectsByDepartment[departmentKey] || []
      : [];
    const mappedProjectId =
      row.projectId ??
      departmentProjects.find(
        (p) => p.name.toLowerCase() === row.project.toLowerCase()
      )?.id ??
      teamProjects.find(
        (p) => p.name.toLowerCase() === row.project.toLowerCase()
      )?.id;

    setEditingRowKey(rowKey);
    setEditingForm({
      departmentId: departmentKey,
      project: row.project,
      projectId: mappedProjectId ? String(mappedProjectId) : "",
      date: row.dateApi ?? "",
      hours: String(row.hours),
      activities: row.activities,
    });
  };

  const handleCancelEdit = () => {
    setEditingRowKey(null);
    setConfirmDeleteRowKey(null);
    setEditingForm({
      departmentId: "",
      project: "",
      projectId: "",
      date: "",
      hours: "",
      activities: "",
    });
  };
  const isUnknownProperty400 = (err: unknown) => {
    const error = err as {
      response?: { status?: number; data?: { message?: string | string[] } };
    };
    if (error.response?.status !== 400) return false;
    const msg = error.response?.data?.message;
    const text = Array.isArray(msg) ? msg.join(" | ") : msg || "";
    return text.includes("should not exist");
  };

  const handleSaveEdit = async (row: TimesheetRow, index: number) => {
    const rowKey = getRowKey(row, index);

    if (!row.entryId) {
      toast.error("Entry ID missing for update");
      return;
    }

    const context = getTeamEditContext();
    if (!context) return;

    const selectedDate = editingForm.date;
    const hours = Number(editingForm.hours);
    const taskDescription = editingForm.activities.trim();
    const selectedDepartmentId = Number(
      editingForm.departmentId || row.departmentId
    );
    const selectedProjectId = Number(editingForm.projectId || row.projectId);
    if (
      !Number.isFinite(hours) ||
      hours < VALIDATION.MIN_HOURS_PER_ENTRY ||
      hours > VALIDATION.MAX_HOURS_PER_ENTRY
    ) {
      toast.error("Invalid hours", {
        description: `Hours must be between ${VALIDATION.MIN_HOURS_PER_ENTRY} and ${VALIDATION.MAX_HOURS_PER_ENTRY}`,
      });
      return;
    }
    if (taskDescription.length < VALIDATION.MIN_TASK_DESCRIPTION_LENGTH) {
      toast.error("Invalid activity", {
        description: `Activity should be at least ${VALIDATION.MIN_TASK_DESCRIPTION_LENGTH} characters`,
      });
      return;
    }

    if (!Number.isFinite(selectedDepartmentId) || selectedDepartmentId <= 0) {
      toast.error("Please select a valid department");
      return;
    }

    if (!Number.isFinite(selectedProjectId) || selectedProjectId <= 0) {
      toast.error("Please select a valid project");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a valid date");
      return;
    }

    const path = buildTimesheetEntryPath(
      API_PATHS.TIMESHEET_ENTRY_PATCH,
      context.actorId,
      context.targetUserId,
      row.entryId
    );

    const payloadWithDepartment = {
      projectId: selectedProjectId,
      departmentId: selectedDepartmentId,
      date: selectedDate,
      hours,
      activities: taskDescription,
    };
    const payloadWithoutDepartment = {
      projectId: selectedProjectId,
      date: selectedDate,
      hours,
      activities: taskDescription,
    };

    setSavingRowKey(rowKey);
    try {
      try {
        await apiClient.patch(path, payloadWithDepartment);
      } catch (err: unknown) {
        if (!isUnknownProperty400(err)) {
          throw err;
        }
        await apiClient.patch(path, payloadWithoutDepartment);
      }
      toast.success("Entry updated successfully");
      setEditingRowKey(null);
      setRefreshTick((prev) => prev + 1);
    } catch (err: unknown) {
      console.error("Error updating timesheet entry:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update timesheet entry";
      toast.error("Update failed", {
        description: errorMessage,
      });
    } finally {
      setSavingRowKey(null);
    }
  };

  const handleDeleteEntry = async (row: TimesheetRow, index: number) => {
    const rowKey = getRowKey(row, index);

    if (!row.entryId) {
      toast.error("Entry ID missing for delete");
      return;
    }

    const context = getTeamEditContext();
    if (!context) return;

    const path = buildTimesheetEntryPath(
      API_PATHS.TIMESHEET_ENTRY_DELETE,
      context.actorId,
      context.targetUserId,
      row.entryId
    );

    setDeletingRowKey(rowKey);
    try {
      await apiClient.delete(path);
      toast.success("Entry deleted successfully");
      if (editingRowKey === rowKey) {
        handleCancelEdit();
      }
      setRefreshTick((prev) => prev + 1);
    } catch (err: unknown) {
      console.error("Error deleting timesheet entry:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete timesheet entry";
      toast.error("Delete failed", {
        description: errorMessage,
      });
    } finally {
      setDeletingRowKey(null);
    }
  };

  const handleOpenTeamLogger = () => {
    if (!canManageTeamEntries) return;
    if (!isTeamMode) {
      toast.error("Open Team Dashboard first");
      return;
    }
    if (!teamUser) {
      toast.error("Select a team member first");
      return;
    }
    resetTeamLoggerForm();
    setIsTeamLoggerOpen(true);
  };

  const handleSubmitTeamLogger = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const targetUserId = getTeamTargetUserId();
    if (!targetUserId) {
      toast.error("Unable to identify team member");
      return;
    }

    const selectedDepartmentId = Number(teamLoggerForm.departmentId);
    const selectedProjectId = Number(teamLoggerForm.projectId);
    const hours = Number(teamLoggerForm.hours);
    const taskDescription = teamLoggerForm.activities.trim();
    const workDate = teamLoggerForm.workDate;

    if (!workDate) {
      toast.error("Please select a date");
      return;
    }

    if (!Number.isFinite(selectedDepartmentId) || selectedDepartmentId <= 0) {
      toast.error("Please select a valid department");
      return;
    }

    if (!Number.isFinite(selectedProjectId) || selectedProjectId <= 0) {
      toast.error("Please select a valid project");
      return;
    }

    if (
      !Number.isFinite(hours) ||
      hours < VALIDATION.MIN_HOURS_PER_ENTRY ||
      hours > VALIDATION.MAX_HOURS_PER_ENTRY
    ) {
      toast.error("Invalid hours", {
        description: `Hours must be between ${VALIDATION.MIN_HOURS_PER_ENTRY} and ${VALIDATION.MAX_HOURS_PER_ENTRY}`,
      });
      return;
    }

    if (taskDescription.length < VALIDATION.MIN_TASK_DESCRIPTION_LENGTH) {
      toast.error("Invalid activity", {
        description: `Activity should be at least ${VALIDATION.MIN_TASK_DESCRIPTION_LENGTH} characters`,
      });
      return;
    }

    const basePayload = {
      workDate,
      notes: "",
      entries: [
        {
          projectId: selectedProjectId,
          taskDescription,
          hours,
        },
      ],
    };

    const payloadsToTry: Array<Record<string, unknown>> = [
      { ...basePayload, userId: targetUserId },
      { ...basePayload, targetUserId },
      { ...basePayload, employeeId: targetUserId },
    ];

    setIsSubmittingTeamLogger(true);
    try {
      await postAdminCreateWithFallbackPayloads(payloadsToTry);
      toast.success("Activity log added successfully");
      setIsTeamLoggerOpen(false);
      setRefreshTick((prev) => prev + 1);
      resetTeamLoggerForm();
    } catch (err: unknown) {
      console.error("Failed to create team activity log:", err);
      const error = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const messageFromResponse = error.response?.data?.message;
      const parsedMessage = Array.isArray(messageFromResponse)
        ? messageFromResponse.join(" | ")
        : messageFromResponse;
      toast.error("Failed to add activity log", {
        description:
          parsedMessage || error.message || "Please try again with valid details.",
      });
    } finally {
      setIsSubmittingTeamLogger(false);
    }
  };

  return (
    <>
      <AppHeader
        crumbs={[]}
        className="h-11"
        left={
          <Tabs
            value={
              isTeamMode
                ? teamVisibilityScope === "all_org"
                  ? "all_org"
                  : "my_reportees"
                : "my"
            }
            onValueChange={(val) => {
              if (val === "my") {
                setTeamVisibilityScope("my_reportees");
                setIsTeamMode(false);
                setTeamUser(null);
                setTeamSearch("");
                setTeamSearchError(null);
                if (typeof window !== "undefined") {
                  const state = window.history.state || {};
                  const { __teamDashboard, ...rest } = state;
                  window.history.replaceState(rest, "");
                }
                return;
              }

              if (val === "all_org" && !canAccessAllOrgDashboard) {
                return;
              }

              setIsTeamMode(true);
              setTeamVisibilityScope(
                val === "all_org" ? "all_org" : "my_reportees"
              );
              setTeamSearch("");
              setTeamSearchError(null);
              setTeamUser(null);
            }}
          >
            <TabsList className="h-9 gap-2">
              <TabsTrigger value="my" className="h-7 px-3 py-0.5">
                My Dashboard
              </TabsTrigger>
              {canAccessTeamDashboard && (
                <TabsTrigger
                  value="my_reportees"
                  className="h-7 px-3 py-0.5"
                >
                  My Reportees
                </TabsTrigger>
              )}
              {canAccessAllOrgDashboard && (
                <TabsTrigger value="all_org" className="h-7 px-3 py-0.5">
                  All Org
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        }
      />
      <PageWrapper>
        <div className="p-4 md:p-6 space-y-5">
          {/* Billing cycle chip */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary-background border border-border px-3 py-1.5 rounded-full">
              <Clock className="h-3 w-3 flex-shrink-0" />
              Salary cycle runs from 26th of one month to 25th of the next
            </span>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Hours Logged",
                display: String(monthlyData?.totals.timesheetHours || 0),
                unit: "hrs",
                tooltip:
                  "Total hours logged in the current salary cycle. Part-time and hourly employees are paid based on these hours.",
                accent: "border-l-[#74808e]",
              },
              {
                label: "Leave Days",
                display: String(leaveDaysDisplay),
                unit: "days",
                tooltip: "Total approved leave days in the current salary cycle.",
                accent: "border-l-amber-400",
              },
              {
                label: "Lifelines",
                display: (() => {
                  const remaining = Number(resolvedBackfill?.remaining ?? 0);
                  return String(remaining);
                })(),
                unit: "",
                sub: "",
                tooltip:
                "You are expected to submit timesheets daily. Lifelines allow you to add missed entries for up to 3 past working days. You can use up to 3 lifelines per cycle. This card shows how many lifelines you have remaining in the current cycle.",
                accent: Number(resolvedBackfill?.remaining ?? 0) > 0 ? "border-l-emerald-400" : "border-l-amber-400",
              },
              {
                label: "Payable Days",
                display: String(payableDays),
                unit: "",
                tooltip:
                  "Applicable only to full-time employees, consultants, and interns. This is your total payable days for the current cycle, including attendance on working days, approved leaves, week-offs (2nd and 4th Saturdays, Sundays), and fixed holidays. Any shortfall is treated as unpaid leave and deducted from your salary.",
                accent: "border-l-[#8a6f5e]",
              },
            ].map((card) => {
              const isLifelineCard = card.label === "Lifelines";
              const canShowLifelineEditor =
                isLifelineCard && isTeamMode && Boolean(teamUser) && canEditTeamLifeline;
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
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={`${card.label} information`}
                            >
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            className="w-72 max-w-[calc(100vw-2rem)] whitespace-normal break-words text-xs leading-relaxed text-left"
                            side="top"
                            align="end"
                          >
                            {card.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {isLifelineCard && canShowLifelineEditor ? (
                    isEditingLifeline ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <p className="text-2xl font-bold text-foreground tabular-nums leading-none mr-2">{card.display}</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={lifelineDraft}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setLifelineDraft(val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveLifeline();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelLifelineEdit();
                            }
                          }}
                          disabled={isSavingLifeline}
                          className="h-7 w-20"
                        />
                        <button
                          type="button"
                          onClick={handleSaveLifeline}
                          disabled={isSavingLifeline}
                          className="h-6 w-6 rounded-md border border-border bg-background flex items-center justify-center hover:bg-secondary-background disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Save lifeline limit"
                        >
                          {isSavingLifeline ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelLifelineEdit}
                          disabled={isSavingLifeline}
                          className="h-6 w-6 rounded-md border border-border bg-background flex items-center justify-center hover:bg-secondary-background disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Cancel lifeline limit edit"
                        >
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <p className="text-2xl font-bold text-foreground tabular-nums leading-none mr-2">{card.display}</p>
                        <button
                          type="button"
                          onClick={handleStartLifelineEdit}
                          className="h-5 w-5 rounded-md border border-border bg-background flex items-center justify-center hover:bg-secondary-background"
                          title="Edit lifeline limit"
                        >
                          <Pencil className="h-3 w-3 text-foreground" />
                        </button>
                      </div>
                    )
                  ) : (
                    isLoading ? (
                      <div className="h-8 w-16 bg-secondary-background rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                        {card.display}
                        {card.unit && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">{card.unit}</span>
                        )}
                      </p>
                    )
                  )}
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
                    {isTeamMode
                      ? teamUser
                        ? teamUser.email || teamUser.user?.email || teamUser.name || teamUser.user?.name || monthlyData?.user?.name
                        : "Select team member"
                      : user?.email || "user@example.com"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Team search (visible after clicking Team Dashboard) */}
                  {canAccessTeamDashboard && isTeamMode && (
                    <div className="mr-2 space-y-1">
                      <div className="flex items-center gap-2">
                        {canManageTeamEntries && (
                          <Button
                            variant="outline"
                            size="default"
                            onClick={handleOpenTeamLogger}
                            disabled={teamSearchLoading || !teamUser}
                            className="h-10 rounded-md border-input bg-background px-4 text-sm font-normal whitespace-nowrap"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Activity Log
                          </Button>
                        )}
                        <SearchCombobox
                          value={teamSearch}
                          onValueChange={(nextValue) => {
                            setTeamSearch(nextValue);
                            if (teamSearchError) setTeamSearchError(null);
                          }}
                          onSelect={(option) => {
                            void searchTeamMemberByEmail(option.value);
                          }}
                          onSubmitValue={(nextValue) => {
                            void searchTeamMemberByEmail(nextValue);
                          }}
                          fetchOptions={fetchTeamMemberOptions}
                          placeholder="Select employee"
                          searchPlaceholder="Search employee..."
                          emptyMessage="No team member found."
                          minQueryLength={0}
                          className="w-[260px]"
                          disabled={teamSearchLoading}
                        />
                      </div>
                      {teamSearchError && (
                        <p className="mt-1 text-xs text-red-600">{teamSearchError}</p>
                      )}
                    </div>
                  )}
                  {/* View toggle */}
                  {!isTeamMode && (
                    <TimesheetPdfExportButton
                      monthlyData={monthlyData}
                      isLoading={isLoading}
                      isTeamMode={isTeamMode}
                      userEmail={user?.email}
                    />
                  )}
                  <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => {
                        setViewMode("table");
                        if (user?.id) {
                          localStorage.setItem(`timesheet-view-mode-${user.id}`, "table");
                        } else {
                          localStorage.setItem("timesheet-view-mode", "table");
                        }
                      }}
                      title="List View"
                      className={cn(
                        "h-7 rounded-md px-3 flex items-center gap-2 transition-all cursor-pointer",
                        viewMode === "table"
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">List View</span>
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("grid");
                        if (user?.id) {
                          localStorage.setItem(`timesheet-view-mode-${user.id}`, "grid");
                        } else {
                          localStorage.setItem("timesheet-view-mode", "grid");
                        }
                      }}
                      title="Calendar View"
                      className={cn(
                        "h-7 rounded-md px-3 flex items-center gap-2 transition-all cursor-pointer",
                        viewMode === "grid"
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Calendar View</span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isTeamMode) {
                        setEmployeeCurrentMonth(new Date(employeeCurrentMonth));
                      } else {
                        setCurrentMonth(new Date(currentMonth));
                      }
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : timesheetRows.length === 0 && viewMode === "table" ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">No records found for this period</p>
                </div>
              ) : viewMode === "grid" ? (
                <CalendarViewComponent
                  monthlyData={monthlyData}
                  timesheetRows={timesheetRows}
                  activeCalendarCreatedAtKey={activeCalendarCreatedAtKey}
                  setActiveCalendarCreatedAtKey={setActiveCalendarCreatedAtKey}
                  setSelectedDay={setSelectedDay}
                  setIsDaySheetOpen={setIsDaySheetOpen}
                  renderEmptyDayActions={renderEmptyDayActions}
                  getProjectPill={getProjectPill}
                  getProjectPillClassName={getProjectPillClassName}
                />
              ) : (
                <ListViewComponent
                  monthlyData={monthlyData}
                  timesheetRows={timesheetRows}
                  isTeamMode={isTeamMode}
                  canManageTeamEntries={canManageTeamEntries}
                  editingRowKey={editingRowKey}
                  setEditingRowKey={setEditingRowKey}
                  editingForm={editingForm}
                  setEditingForm={setEditingForm}
                  savingRowKey={savingRowKey}
                  deletingRowKey={deletingRowKey}
                  confirmDeleteRowKey={confirmDeleteRowKey}
                  setConfirmDeleteRowKey={setConfirmDeleteRowKey}
                  teamDepartments={teamDepartments}
                  teamProjectsByDepartment={teamProjectsByDepartment}
                  teamLoggerProjectsLoading={teamLoggerProjectsLoading}
                  fetchTeamLoggerProjectsForDepartment={fetchTeamLoggerProjectsForDepartment}
                  handleStartEdit={handleStartEdit}
                  handleCancelEdit={handleCancelEdit}
                  handleSaveEdit={handleSaveEdit}
                  handleDeleteEntry={handleDeleteEntry}
                  renderEmptyDayActions={renderEmptyDayActions}
                  getProjectPill={getProjectPill}
                  getProjectPillClassName={getProjectPillClassName}
                  formatCreatedAt={formatCreatedAt}
                  dailyTotals={dailyTotals}
                  dateCreatedAtMap={dateCreatedAtMap}
                  getRowKey={getRowKey}
                  highlightedDateApi={highlightedDateApi}
                  activeCalendarCreatedAtKey={null}
                  setActiveCalendarCreatedAtKey={() => { }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Team Activity Logger Sheet (admin/super admin) */}
        <TeamActivityLoggerSheet
          isOpen={isTeamLoggerOpen}
          setIsOpen={setIsTeamLoggerOpen}
          isSubmitting={isSubmittingTeamLogger}
          teamUser={teamUser}
          teamDepartments={teamDepartments}
          teamProjectsByDepartment={teamProjectsByDepartment}
          teamLoggerProjectsLoading={teamLoggerProjectsLoading}
          teamLoggerForm={teamLoggerForm}
          setTeamLoggerForm={setTeamLoggerForm}
          fetchTeamLoggerProjectsForDepartment={fetchTeamLoggerProjectsForDepartment}
          onSubmit={handleSubmitTeamLogger}
        />

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
                        {selectedDay.leaves?.entries?.length
                          ? selectedDay.leaves.entries
                            .map((entry) => getLeaveDurationLabel(entry))
                            .join(", ")
                          : "-"}
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
                                    {getLeaveDurationLabel(entry)}
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

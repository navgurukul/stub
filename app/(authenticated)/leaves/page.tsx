"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Search, TreePalm, Clock, CheckCircle2, Calendar as CalendarIcon, X, Pencil, Plus, AlertCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SearchCombobox,
  SearchComboboxOption,
} from "@/components/ui/search-combobox";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DataTable,
  columns,
  type LeaveRequest as TeamLeaveRequest,
} from "./history/_components";
import { NewLeaveRequestDialog, FileUploadField } from "./_components/NewLeaveRequestDialog";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { mockDataService } from "@/lib/mock-data";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/rbac-constants";
import {
  checkLeaveConflictWithTimesheet,
  invalidateMonthlyTimesheetCache,
  calculateLeaveDays,
} from "@/lib/leave-timesheet-validator";

import {
  LeaveRequest,
  LeaveBalanceItem,
  LeaveSummary,
  LeavesMainTab,
  PersistedLeavesState,
} from "@/lib/leave-types";

const getDashboardHighlightUrl = (dateApi: string) => {
  const normalized = dateApi.trim();
  return normalized ? `/?date=${encodeURIComponent(normalized)}` : "/";
};

export default function LeavesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const canEditTeamPendingRequests = useRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const canUseLeaveSearch = useRole([
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.MANAGER,
  ]);

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

  const isAdminOrSuperAdmin = useMemo(() => {
    return (
      normalizedRoleSet.has("admin") || normalizedRoleSet.has("superadmin")
    );
  }, [normalizedRoleSet]);
  const [activeMainTab, setActiveMainTab] = useState<LeavesMainTab>("leaves");

  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [teamLeaveHistory, setTeamLeaveHistory] = useState<TeamLeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [isBalancesLoading, setIsBalancesLoading] = useState(true);
  const [shouldScrollToLeaveHistory, setShouldScrollToLeaveHistory] =
    useState(false);
  const leaveHistorySectionRef = useRef<HTMLDivElement | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [historyFromDate, setHistoryFromDate] = useState<Date | undefined>();
  const [historyToDate, setHistoryToDate] = useState<Date | undefined>();
  const [leavesPage, setLeavesPage] = useState(1);

  const [teamSearch, setTeamSearch] = useState("");
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [teamLeaveTypeFilter, setTeamLeaveTypeFilter] = useState("all");
  const [teamVisibilityScope, setTeamVisibilityScope] = useState<"my_reportees" | "all_org">("my_reportees");
  const [isTeamEmployeeBalanceView, setIsTeamEmployeeBalanceView] = useState(false);
  const [showTeamEmployeeBalanceSearch, setShowTeamEmployeeBalanceSearch] = useState(false);
  const [teamEmployeeBalanceEmail, setTeamEmployeeBalanceEmail] = useState("");
  const [selectedTeamEmployeeEmail, setSelectedTeamEmployeeEmail] = useState("");
  const [selectedTeamEmployeeUserId, setSelectedTeamEmployeeUserId] = useState<number | null>(null);
  const [teamEmployeeBalances, setTeamEmployeeBalances] = useState<LeaveBalanceItem[]>([]);
  const [isTeamEmployeeBalanceLoading, setIsTeamEmployeeBalanceLoading] =
    useState(false);

  // Edit allocated balance state
  const [editingAllocatedBalance, setEditingAllocatedBalance] = useState<LeaveBalanceItem | null>(null);
  const [editingAllocatedHours, setEditingAllocatedHours] = useState<string>("");
  const [isUpdatingAllocated, setIsUpdatingAllocated] = useState(false);

  // Admin apply leave state
  const [adminApplyLeaveOpen, setAdminApplyLeaveOpen] = useState(false);
  const [adminApplLeaveSubmitting, setAdminApplyLeaveSubmitting] = useState(false);
  const [adminEmployeeDetailsLoading, setAdminEmployeeDetailsLoading] =
    useState(false);
  const [adminApplyEmployeeEmail, setAdminApplyEmployeeEmail] = useState("");
  const [adminApplyEmployeeName, setAdminApplyEmployeeName] = useState("");
  const [adminApplyEmployeeUserId, setAdminApplyEmployeeUserId] =
    useState<number | null>(null);
  const [adminEmployeeBalances, setAdminEmployeeBalances] = useState<
    LeaveBalanceItem[]
  >([]);
  const [adminEmployeeHistory, setAdminEmployeeHistory] = useState<
    TeamLeaveRequest[]
  >([]);
  const [adminLeaveTypes, setAdminLeaveTypes] = useState<any[]>([]);
  const [adminLeaveDateRange, setAdminLeaveDateRange] = useState<DateRange | undefined>();
  const [isAdminDatePickerOpen, setIsAdminDatePickerOpen] = useState(false);
  const [adminLeaveValidationError, setAdminLeaveValidationError] = useState<string | null>(null);
  const [adminLeaveIsValidating, setAdminLeaveIsValidating] = useState(false);

  const adminApplyLeaveFormSchema = z
    .object({
      leaveType: z.string().min(1, "Please select a leave type."),
      startDate: z.date({ message: "Start date is required." }),
      endDate: z.date({ message: "End date is required." }),
      durationType: z.string().min(1, "Please select a duration type."),
      halfDaySegment: z.string().optional(),
      
      // Bereavement fields
      bereavementRelationship: z.string().optional(),
      bereavementRelationshipOther: z.string().optional(),
      
      // Wedding fields
      weddingCardImage: z.any().optional(),
      
      // Election fields
      voterIdImage: z.any().optional(),
      
      // Exam / L&D fields
      examCourseName: z.string().optional(),
      examHallTicket: z.any().optional(),
      
      // Vipassana fields
      vipassanaDocuments: z.array(z.any()).optional(),
    })
    .superRefine((data, ctx) => {
      const selectedType = adminLeaveTypes.find((t) => String(t.id) === data.leaveType);
      const typeName = selectedType?.name?.toLowerCase().trim() || "";
      const typeCode = selectedType?.code?.toLowerCase().trim() || "";

      const isBereavement = typeName.includes("bereavement") || typeCode === "bl";
      const isWedding = typeName.includes("wedding") || typeCode === "wd" || typeCode === "wdl";
      const isExam = typeName.includes("exam") || typeCode === "ex" || typeCode === "el";
      const isElection = (typeName.includes("election") || typeCode === "ecl") && !isExam;
      const isLAndD = typeName.includes("lnd") || typeName.includes("l&d") || typeName.includes("learning") || typeCode === "ld" || typeCode === "ldl";
      const isVipassanaCourse = typeName.includes("vipassana_course") || typeName.includes("vipassana-course") || typeName.includes("vipassana course") || typeCode === "vcl";
      const isVipassanaSeva = typeName.includes("vipassana_seva") || typeName.includes("vipassana-seva") || typeName.includes("vipassana seva") || typeCode === "vs";

      // 1. Date Range
      if (data.startDate && data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after the start date.",
          path: ["endDate"],
        });
      }

      // 2. Duration Type & Half Day Segment
      if (data.durationType === "half_day" && !data.halfDaySegment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a half day segment.",
          path: ["halfDaySegment"],
        });
      }

      // 3. Bereavement Validation
      if (isBereavement) {
        if (!data.bereavementRelationship) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Relationship is required.",
            path: ["bereavementRelationship"],
          });
        }
        if (
          data.bereavementRelationship === "Other Immediate Family Member"
        ) {
          const otherVal = data.bereavementRelationshipOther?.trim() || "";
          if (!otherVal) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please mention your relationship with them.",
              path: ["bereavementRelationshipOther"],
            });
          } else if (/\d/.test(otherVal)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Relationship must be valid text. Numbers are not accepted.",
              path: ["bereavementRelationshipOther"],
            });
          }
        }
      }

      // 4. Wedding Validation
      if (isWedding) {
        if (!data.weddingCardImage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wedding card invitation is required.",
            path: ["weddingCardImage"],
          });
        } else if (data.weddingCardImage instanceof File && data.weddingCardImage.size > 2 * 1024 * 1024) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File size must not exceed 2MB.",
            path: ["weddingCardImage"],
          });
        }
      }

      // 5. Election Validation
      if (isElection) {
        if (!data.voterIdImage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Voter ID card is required.",
            path: ["voterIdImage"],
          });
        } else if (data.voterIdImage instanceof File && data.voterIdImage.size > 2 * 1024 * 1024) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File size must not exceed 2MB.",
            path: ["voterIdImage"],
          });
        }
      }

      // 6. Exam / L&D Validation
      if (isExam || isLAndD) {
        if (!data.examCourseName?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Course or Exam name is required.",
            path: ["examCourseName"],
          });
        }
      }
      if (isExam) {
        if (!data.examHallTicket) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Hall ticket or exam schedule image is required.",
            path: ["examHallTicket"],
          });
        } else if (data.examHallTicket instanceof File && data.examHallTicket.size > 2 * 1024 * 1024) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File size must not exceed 2MB.",
            path: ["examHallTicket"],
          });
        }
      }

      // 7. Vipassana Validation
      if (isVipassanaCourse || isVipassanaSeva) {
        if (!data.vipassanaDocuments || (Array.isArray(data.vipassanaDocuments) && data.vipassanaDocuments.length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one booking confirmation or completion certificate is required.",
            path: ["vipassanaDocuments"],
          });
        } else if (Array.isArray(data.vipassanaDocuments)) {
          if (data.vipassanaDocuments.length > 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Maximum 2 documents should be allowed.",
              path: ["vipassanaDocuments"],
            });
          }
          for (const file of data.vipassanaDocuments) {
            if (file instanceof File && file.size > 2 * 1024 * 1024) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "File size must not exceed 2MB.",
                path: ["vipassanaDocuments"],
              });
              break;
            }
          }
        }
      }
    });

  const adminApplyLeaveForm = useForm<z.infer<typeof adminApplyLeaveFormSchema>>({
    resolver: zodResolver(adminApplyLeaveFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      leaveType: "",
      startDate: undefined,
      endDate: undefined,
      durationType: "",
      halfDaySegment: "",
      bereavementRelationship: "",
      bereavementRelationshipOther: "",
      weddingCardImage: undefined,
      voterIdImage: undefined,
      examCourseName: "",
      examHallTicket: undefined,
      vipassanaDocuments: [],
    },
  });

  const previousAdminLeaveTypeRef = useRef("");

  const watchAdminLeaveType = adminApplyLeaveForm.watch("leaveType");
  const watchAdminBereavementRelationship = adminApplyLeaveForm.watch("bereavementRelationship");

  const selectedAdminType = adminLeaveTypes.find((t) => String(t.id) === watchAdminLeaveType);
  const adminTypeName = selectedAdminType?.name?.toLowerCase().trim() || "";
  const adminTypeCode = selectedAdminType?.code?.toLowerCase().trim() || "";

  const isAdminBereavement = adminTypeName.includes("bereavement") || adminTypeCode === "bl";
  const isAdminWedding = adminTypeName.includes("wedding") || adminTypeCode === "wd" || adminTypeCode === "wdl";
  const isAdminExam = adminTypeName.includes("exam") || adminTypeCode === "ex" || adminTypeCode === "el";
  const isAdminElection = (adminTypeName.includes("election") || adminTypeCode === "ecl") && !isAdminExam;
  const isAdminLAndD = adminTypeName.includes("lnd") || adminTypeName.includes("l&d") || adminTypeName.includes("learning") || adminTypeCode === "ld" || adminTypeCode === "ldl";
  const isAdminVipassanaCourse = adminTypeName.includes("vipassana_course") || adminTypeName.includes("vipassana-course") || adminTypeName.includes("vipassana course") || adminTypeCode === "vcl";
  const isAdminVipassanaSeva = adminTypeName.includes("vipassana_seva") || adminTypeName.includes("vipassana-seva") || adminTypeName.includes("vipassana seva") || adminTypeCode === "vs";

  useEffect(() => {
    if (!adminApplyLeaveOpen) {
      previousAdminLeaveTypeRef.current = "";
      return;
    }

    if (!watchAdminLeaveType) return;

    const isFirstSelection = previousAdminLeaveTypeRef.current === "";

    if (!isFirstSelection) {
      adminApplyLeaveForm.setValue("startDate", undefined as unknown as Date);
      adminApplyLeaveForm.setValue("endDate", undefined as unknown as Date);
      setAdminLeaveDateRange(undefined);
    }

    adminApplyLeaveForm.setValue("durationType", "");
    adminApplyLeaveForm.setValue("halfDaySegment", "");
    adminApplyLeaveForm.setValue("bereavementRelationship", "");
    adminApplyLeaveForm.setValue("bereavementRelationshipOther", "");
    adminApplyLeaveForm.setValue("weddingCardImage", undefined);
    adminApplyLeaveForm.setValue("voterIdImage", undefined);
    adminApplyLeaveForm.setValue("examCourseName", "");
    adminApplyLeaveForm.setValue("examHallTicket", undefined);
    adminApplyLeaveForm.setValue("vipassanaDocuments", []);
    setAdminLeaveValidationError(null);

    previousAdminLeaveTypeRef.current = watchAdminLeaveType;
  }, [watchAdminLeaveType, adminApplyLeaveOpen, adminApplyLeaveForm]);

  const watchAdminStartDate = adminApplyLeaveForm.watch("startDate");
  const watchAdminEndDate = adminApplyLeaveForm.watch("endDate");
  const watchAdminDurationType = adminApplyLeaveForm.watch("durationType");

  const validateAdminLeaveConflict = useCallback(
    async (startDate?: Date, endDate?: Date, durationType?: string) => {
      if (!startDate || !endDate || !durationType) {
        setAdminLeaveValidationError(null);
        return;
      }
      setAdminLeaveIsValidating(true);
      setAdminLeaveValidationError(null);
      try {
        const result = await checkLeaveConflictWithTimesheet(
          startDate,
          endDate,
          durationType as "full_day" | "half_day"
        );
        if (result.hasConflict) {
          setAdminLeaveValidationError(result.message || "Conflict detected");
        } else {
          setAdminLeaveValidationError(null);
        }
      } catch {
        setAdminLeaveValidationError(null);
      } finally {
        setAdminLeaveIsValidating(false);
      }
    },
    []
  );

  useEffect(() => {
    const id = setTimeout(() => {
      validateAdminLeaveConflict(watchAdminStartDate, watchAdminEndDate, watchAdminDurationType);
    }, 500);
    return () => clearTimeout(id);
  }, [watchAdminStartDate, watchAdminEndDate, watchAdminDurationType, validateAdminLeaveConflict]);

  const handleAdminSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      setAdminLeaveDateRange({ from: date, to: date });
      adminApplyLeaveForm.setValue("startDate", date, { shouldValidate: true, shouldDirty: true });
      adminApplyLeaveForm.setValue("endDate", date, { shouldValidate: true, shouldDirty: true });
      setIsAdminDatePickerOpen(false);
    } else {
      setAdminLeaveDateRange(undefined);
      adminApplyLeaveForm.setValue("startDate", undefined as any, { shouldValidate: true, shouldDirty: true });
      adminApplyLeaveForm.setValue("endDate", undefined as any, { shouldValidate: true, shouldDirty: true });
    }
  };

  useEffect(() => {
    if (!adminApplyLeaveOpen) {
      adminApplyLeaveForm.reset({
        leaveType: "",
        startDate: undefined,
        endDate: undefined,
        durationType: "",
        halfDaySegment: "",
        bereavementRelationship: "",
        bereavementRelationshipOther: "",
        weddingCardImage: undefined,
        voterIdImage: undefined,
        examCourseName: "",
        examHallTicket: undefined,
        vipassanaDocuments: [],
      });
      setAdminLeaveDateRange(undefined);
      setAdminLeaveValidationError(null);
      setIsAdminDatePickerOpen(false);
    }
  }, [adminApplyLeaveOpen, adminApplyLeaveForm]);

  useEffect(() => {
    adminApplyLeaveForm.reset({
      leaveType: "",
      startDate: undefined,
      endDate: undefined,
      durationType: "",
      halfDaySegment: "",
      bereavementRelationship: "",
      bereavementRelationshipOther: "",
      weddingCardImage: undefined,
      voterIdImage: undefined,
      examCourseName: "",
      examHallTicket: undefined,
      vipassanaDocuments: [],
    });
    setAdminLeaveDateRange(undefined);
    setAdminLeaveValidationError(null);
    setIsAdminDatePickerOpen(false);
  }, [adminApplyEmployeeUserId, adminApplyLeaveForm]);

  const durationTypes = mockDataService.getDurationTypes();

  const leavesPageSize = 10;

  const handleViewLeaveHistory = useCallback(() => {
    setActiveMainTab("leaves");
    setShouldScrollToLeaveHistory(true);
  }, []);

  useEffect(() => {
    if (!shouldScrollToLeaveHistory || activeMainTab !== "leaves") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      leaveHistorySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setShouldScrollToLeaveHistory(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [shouldScrollToLeaveHistory, activeMainTab]);

  const fetchBalances = useCallback(async () => {
    setIsBalancesLoading(true);
    try {
      const res = await apiClient.get(API_PATHS.LEAVES_BALANCES);
      setBalances(Array.isArray(res.data?.balances) ? res.data.balances : []);
      if (res.data?.summary) {
        setLeaveSummary(res.data.summary);
      }
    } catch {
      setBalances([]);
    } finally {
      setIsBalancesLoading(false);
    }
  }, []);

  const fetchMyLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(API_PATHS.LEAVES_REQUESTS_GET);
      setLeaveHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load leave history");
      setLeaveHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTeamLeaves = useCallback(async () => {
    if (!canUseLeaveSearch) {
      setTeamLeaveHistory([]);
      setIsTeamLoading(false);
      return;
    }

    setIsTeamLoading(true);
    try {
      const res = await apiClient.get(API_PATHS.LEAVES_TEAM_REQUESTS_GET);
      setTeamLeaveHistory(
        Array.isArray(res.data) ? (res.data as TeamLeaveRequest[]) : []
      );
    } catch {
      setTeamLeaveHistory([]);
    } finally {
      setIsTeamLoading(false);
    }
  }, [canUseLeaveSearch]);

  const fetchEmployeeEmailSuggestions = useCallback(
    async (query: string): Promise<SearchComboboxOption[]> => {
      if (!user?.orgId || !user?.id || !canUseLeaveSearch) return [];

      try {
        const params: Record<string, any> = {
          orgId: user.orgId,
          q: query,
          page: 1,
          limit: 1000,
          managerId: user.id,
        };

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
            return Number(item?.managerId) === Number(user.id);
          })
          .map((item: any) => ({
            value: String(item?.email ?? "").trim(),
            label: String(item?.email ?? "").trim(),
            description: String(item?.email ?? "").trim(),
          }))
          .filter((item: SearchComboboxOption) => Boolean(item.value));
      } catch {
        return [];
      }
    },
    [canUseLeaveSearch, user?.id, user?.orgId]
  );

  const fetchAdminApplyEmployeeSuggestions = useCallback(
    async (query: string): Promise<SearchComboboxOption[]> => {
      if (!user?.orgId || !isAdminOrSuperAdmin) return [];

      try {
        const res = await apiClient.get(API_PATHS.EMPLOYEES, {
          params: {
            orgId: user.orgId,
            q: query,
            page: 1,
            limit: 1000,
          },
        });

        const responseData = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];

        return items
          .map((item: any) => ({
            value: String(item?.id ?? "").trim(),
            label: String(item?.name ?? item?.email ?? "").trim(),
            description: String(item?.email ?? "").trim(),
          }))
          .filter((item: SearchComboboxOption) => Boolean(item.value));
      } catch {
        return [];
      }
    },
    [isAdminOrSuperAdmin, user?.orgId]
  );

  const resolveAdminApplyEmployeeByEmail = useCallback(
    async (rawEmail: string) => {
      if (!user?.orgId || !isAdminOrSuperAdmin) return null;

      const email = rawEmail.trim().toLowerCase();
      if (!email) return null;

      try {
        const res = await apiClient.get(API_PATHS.EMPLOYEES, {
          params: {
            orgId: user.orgId,
            q: email,
            page: 1,
            limit: 20,
          },
        });

        const responseData = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];

        const matchedEmployee = items.find(
          (item: any) =>
            String(item?.email ?? "").trim().toLowerCase() === email
        );

        if (matchedEmployee?.id) {
          const resolvedName = String(
            matchedEmployee?.name ?? matchedEmployee?.email ?? ""
          ).trim();
          const resolvedEmail = String(
            matchedEmployee?.email ?? rawEmail
          ).trim();
          const resolvedUserId = Number(matchedEmployee.id);

          setAdminApplyEmployeeName(resolvedName);
          setAdminApplyEmployeeUserId(resolvedUserId);
          setAdminApplyEmployeeEmail(resolvedEmail);

          return {
            userId: resolvedUserId,
            email: resolvedEmail,
            name: resolvedName,
          };
        }

        setAdminApplyEmployeeUserId(null);
        setAdminApplyEmployeeName("");
        toast.error("Please select a valid employee from the list");
        return null;
      } catch {
        setAdminApplyEmployeeUserId(null);
        setAdminApplyEmployeeName("");
        toast.error("Unable to resolve employee");
        return null;
      }
    },
    [isAdminOrSuperAdmin, user?.orgId]
  );

  const loadAdminEmployeeDetails = useCallback(
    async (
      rawEmail: string,
      providedUserId?: number | null,
      providedName?: string
    ) => {
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        setAdminEmployeeBalances([]);
        setAdminEmployeeHistory([]);
        return;
      }

      setAdminEmployeeDetailsLoading(true);

      try {
        const params: Record<string, unknown> = { email };
        const response = await apiClient.get(API_PATHS.LEAVES_BALANCES_EMPLOYEE, {
          params,
        });

        const parsedBalances = Array.isArray(response.data?.balances)
          ? response.data.balances
          : Array.isArray(response.data?.data?.balances)
            ? response.data.data.balances
            : [];

        const resolvedUserId =
          response.data?.userId ||
          response.data?.data?.userId ||
          response.data?.user?.id ||
          (parsedBalances[0]?.userId as number | undefined) ||
          providedUserId ||
          null;

        const matchingHistory = [...teamLeaveHistory]
          .filter((leave) => {
            if (resolvedUserId) {
              return Number(leave.user?.id) === Number(resolvedUserId);
            }
            return (
              String(leave.user?.email ?? "").trim().toLowerCase() === email
            );
          })
          .sort((a, b) => {
            const aTs = new Date(a.requestedAt).getTime();
            const bTs = new Date(b.requestedAt).getTime();
            return bTs - aTs;
          })
          .slice(0, 8);

        const resolvedName =
          providedName?.trim() ||
          String(matchingHistory[0]?.user?.name ?? "").trim() ||
          String(email.split("@")[0] ?? "");

        setAdminApplyEmployeeName(resolvedName);
        setAdminApplyEmployeeUserId(resolvedUserId);
        setAdminEmployeeBalances(parsedBalances);
        setAdminEmployeeHistory(matchingHistory);
      } catch {
        const fallbackHistory = [...teamLeaveHistory]
          .filter(
            (leave) =>
              String(leave.user?.email ?? "").trim().toLowerCase() === email
          )
          .sort((a, b) => {
            const aTs = new Date(a.requestedAt).getTime();
            const bTs = new Date(b.requestedAt).getTime();
            return bTs - aTs;
          })
          .slice(0, 8);

        setAdminEmployeeBalances([]);
        setAdminEmployeeHistory(fallbackHistory);
        toast.error("Unable to load employee leave balance");
      } finally {
        setAdminEmployeeDetailsLoading(false);
      }
    },
    [teamLeaveHistory]
  );

  const validateManagerHierarchyAccess = useCallback(
    async (rawEmail: string) => {
      if (!isReportingManagerOnly || !user?.orgId || !user?.id) {
        return true;
      }

      const email = rawEmail.trim().toLowerCase();
      if (!email) return false;

      const res = await apiClient.get(API_PATHS.EMPLOYEES, {
        params: {
          orgId: user.orgId,
          q: email,
          managerId: user.id,
          page: 1,
          limit: 20,
        },
      });

      const responseData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const items = Array.isArray(responseData)
        ? responseData
        : responseData.data || [];

      return items.some(
        (item: any) =>
          String(item?.email ?? "").trim().toLowerCase() === email &&
          Number(item?.managerId) === Number(user.id)
      );
    },
    [isReportingManagerOnly, user?.id, user?.orgId]
  );

  useEffect(() => {
    if (activeMainTab === "leaves") {
      fetchBalances();
      fetchMyLeaves();
    } else {
      fetchTeamLeaves();
    }
  }, [fetchBalances, fetchMyLeaves, fetchTeamLeaves, activeMainTab]);

  const persistLeavesState = useCallback((nextState: PersistedLeavesState) => {
    if (typeof window === "undefined") return;

    const currentState = (window.history.state ?? {}) as Record<string, unknown>;
    const existingLeavesState =
      (currentState.__leavesState as PersistedLeavesState | undefined) ?? {};

    window.history.replaceState(
      {
        ...currentState,
        __leavesState: {
          ...existingLeavesState,
          ...nextState,
        },
      },
      "",
      window.location.pathname
    );
  }, []);

  useEffect(() => {
    if (!adminApplyLeaveOpen) return;
    let isMounted = true;
    async function fetchLeaveTypesForAdmin() {
      try {
        const res = await apiClient.get(API_PATHS.LEAVES_TYPES);
        const types = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        const filteredTypes = types.filter(
          (type: any) =>
            String(type?.code ?? "").trim().toUpperCase() !== "CPL" &&
            String(type?.name ?? "").trim().toLowerCase() !== "compensatory leave"
        );
        if (isMounted) {
          setAdminLeaveTypes(filteredTypes);
        }
      } catch {
        if (isMounted) {
          setAdminLeaveTypes([]);
        }
      }
    }
    fetchLeaveTypesForAdmin();
    return () => {
      isMounted = false;
    };
  }, [adminApplyLeaveOpen]);

  const handleNewRequestSuccess = useCallback((submittedDate: string) => {
    fetchBalances();
    fetchMyLeaves();
    router.push(getDashboardHighlightUrl(submittedDate));
  }, [fetchBalances, fetchMyLeaves, router]);

  const handleAdminApplyLeaveSubmit = useCallback(
    async (values: z.infer<typeof adminApplyLeaveFormSchema>) => {
      if (!adminApplyEmployeeUserId) {
        toast.error("Please select an employee first", {
          description: "Choose an employee from the dropdown before submitting.",
        });
        return;
      }

      setAdminApplyLeaveSubmitting(true);
      try {
        const selectedLeaveType = adminLeaveTypes.find(
          (t) => t.id === parseInt(values.leaveType)
        );
        if (!selectedLeaveType) {
          toast.error("Invalid leave type selected");
          setAdminApplyLeaveSubmitting(false);
          return;
        }

        const conflict = await checkLeaveConflictWithTimesheet(
          values.startDate,
          values.endDate,
          values.durationType as "full_day" | "half_day"
        );
        if (conflict.hasConflict) {
          toast.error("Conflict with timesheet entries", {
            description: conflict.message,
          });
          setAdminApplyLeaveSubmitting(false);
          return;
        }

        const netDays = await calculateLeaveDays(values.startDate, values.endDate);
        if (netDays === 0) {
          toast.error("Selected date range consists only of non-working days or holidays");
          setAdminApplyLeaveSubmitting(false);
          return;
        }

        const hours =
          values.durationType === "full_day" ? netDays * 8 : netDays * 4;

        const typeName = (selectedLeaveType.name || "").toLowerCase().trim();
        const typeCode = (selectedLeaveType.code || "").toLowerCase().trim();

        const isBereavement = typeName.includes("bereavement") || typeCode === "bl";
        const isWedding = typeName.includes("wedding") || typeCode === "wd" || typeCode === "wdl";
        const isExam = typeName.includes("exam") || typeCode === "ex" || typeCode === "el";
        const isElection = (typeName.includes("election") || typeCode === "ecl") && !isExam;
        const isLAndD = typeName.includes("lnd") || typeName.includes("l&d") || typeName.includes("learning") || typeCode === "ld" || typeCode === "ldl";
        const isVipassanaCourse = typeName.includes("vipassana_course") || typeName.includes("vipassana-course") || typeName.includes("vipassana course") || typeCode === "vcl";
        const isVipassanaSeva = typeName.includes("vipassana_seva") || typeName.includes("vipassana-seva") || typeName.includes("vipassana seva") || typeCode === "vs";

        const formData = new FormData();
        formData.append("userId", String(adminApplyEmployeeUserId));
        formData.append("leaveTypeId", String(selectedLeaveType.id));
        formData.append("startDate", format(values.startDate, DATE_FORMATS.API));
        formData.append("endDate", format(values.endDate, DATE_FORMATS.API));
        formData.append("hours", String(hours));
        formData.append("durationType", values.durationType);
        if (values.durationType === "half_day" && values.halfDaySegment) {
          formData.append("halfDaySegment", values.halfDaySegment);
        }

        if (isBereavement) {
          if (values.bereavementRelationship) {
            formData.append("relationship", values.bereavementRelationship);
          }
          if (values.bereavementRelationshipOther) {
            formData.append("relationshipDetails", values.bereavementRelationshipOther);
          }
        }

        if (isWedding && values.weddingCardImage) {
          formData.append("document", values.weddingCardImage);
        }

        if (isElection && values.voterIdImage) {
          formData.append("document", values.voterIdImage);
        }

        if (isExam || isLAndD) {
          if (values.examCourseName) {
            formData.append("courseOrProgrammeName", values.examCourseName);
          }
          if (values.examHallTicket) {
            formData.append("document", values.examHallTicket);
          }
        }

        if ((isVipassanaCourse || isVipassanaSeva) && values.vipassanaDocuments) {
          const docs = Array.isArray(values.vipassanaDocuments)
            ? values.vipassanaDocuments
            : [values.vipassanaDocuments];
          docs.forEach((doc) => {
            if (doc instanceof File) {
              formData.append("document", doc);
            }
          });
        }

        const response = await apiClient.post(
          API_PATHS.LEAVES_ADMIN_APPLY,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (response.status === 200 || response.status === 201) {
          toast.success(`Leave request submitted successfully for ${adminApplyEmployeeEmail || "employee"}`);
          invalidateMonthlyTimesheetCache(
            values.startDate.getFullYear(),
            values.startDate.getMonth() + 1
          );
          if (values.startDate.getMonth() !== values.endDate.getMonth()) {
            invalidateMonthlyTimesheetCache(
              values.endDate.getFullYear(),
              values.endDate.getMonth() + 1
            );
          }
          adminApplyLeaveForm.reset({
            leaveType: "",
            startDate: undefined,
            endDate: undefined,
            durationType: "",
            halfDaySegment: "",
            bereavementRelationship: "",
            bereavementRelationshipOther: "",
            weddingCardImage: undefined,
            voterIdImage: undefined,
            examCourseName: "",
            examHallTicket: undefined,
            vipassanaDocuments: [],
          });
          setAdminLeaveDateRange(undefined);
          setIsAdminDatePickerOpen(false);
          setAdminLeaveValidationError(null);
          setAdminApplyEmployeeEmail("");
          setAdminApplyEmployeeUserId(null);
          setAdminApplyLeaveOpen(false);
          fetchTeamLeaves();
        }
      } catch (error: unknown) {
        const msg =
          typeof error === "object" &&
            error !== null &&
            "response" in error &&
            (error as { response?: { data?: { message?: string } } }).response?.data
              ?.message
            ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
            : error instanceof Error
              ? error.message
              : "Failed to apply leave.";
        toast.error("Submission failed", { description: msg });
      } finally {
        setAdminApplyLeaveSubmitting(false);
      }
    },
    [adminApplyEmployeeUserId, adminApplyEmployeeEmail, adminLeaveTypes, adminApplyLeaveForm, fetchTeamLeaves]
  );

  const openAdminApplyLeaveDialog = useCallback(() => {
    if (selectedTeamEmployeeEmail) {
      const matchedEmployee = teamLeaveHistory.find(
        (leave) =>
          String(leave.user?.email ?? "").trim().toLowerCase() ===
          selectedTeamEmployeeEmail.trim().toLowerCase()
      );

      const prefillName = String(matchedEmployee?.user?.name ?? "").trim();
      setAdminApplyEmployeeName(prefillName);
      setAdminApplyEmployeeEmail(selectedTeamEmployeeEmail);
      setAdminApplyEmployeeUserId(selectedTeamEmployeeUserId ?? null);
      void loadAdminEmployeeDetails(
        selectedTeamEmployeeEmail,
        selectedTeamEmployeeUserId,
        prefillName
      );
    } else {
      setAdminApplyEmployeeEmail("");
      setAdminApplyEmployeeName("");
      setAdminApplyEmployeeUserId(null);
      setAdminEmployeeBalances([]);
      setAdminEmployeeHistory([]);
    }

    setAdminApplyLeaveOpen(true);
  }, [
    loadAdminEmployeeDetails,
    selectedTeamEmployeeEmail,
    selectedTeamEmployeeUserId,
    teamLeaveHistory,
  ]);

  useEffect(() => {
    if (isAdminElection) return; // Managed separately for single date picker
    if (adminLeaveDateRange?.from && adminLeaveDateRange?.to) {
      adminApplyLeaveForm.setValue("startDate", adminLeaveDateRange.from, { shouldValidate: true, shouldDirty: true });
      adminApplyLeaveForm.setValue("endDate", adminLeaveDateRange.to, { shouldValidate: true, shouldDirty: true });
    } else if (adminLeaveDateRange?.from && !adminLeaveDateRange?.to) {
      adminApplyLeaveForm.setValue("startDate", adminLeaveDateRange.from, { shouldValidate: true, shouldDirty: true });
      adminApplyLeaveForm.setValue("endDate", adminLeaveDateRange.from, { shouldValidate: true, shouldDirty: true });
    }
  }, [adminLeaveDateRange, adminApplyLeaveForm, isAdminElection]);

  // Internal search function that only fetches data
  const fetchEmployeeLeaveBalance = useCallback(async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return false;
    }

    if (!canUseLeaveSearch) {
      toast.error("You are not allowed to search employee balances");
      return false;
    }

    setIsTeamEmployeeBalanceLoading(true);
    try {
      const hasHierarchyAccess = await validateManagerHierarchyAccess(
        trimmedEmail
      );

      if (!hasHierarchyAccess) {
        setTeamEmployeeBalances([]);
        setSelectedTeamEmployeeEmail("");
        setSelectedTeamEmployeeUserId(null);
        toast.error("You can view balances only for your direct reportees.");
        return false;
      }

      const params: Record<string, unknown> = { email: trimmedEmail };
      if (isReportingManagerOnly && user?.id) {
        params.managerId = user.id;
      }

      const response = await apiClient.get(API_PATHS.LEAVES_BALANCES_EMPLOYEE, {
        params,
      });

      const parsedBalances = Array.isArray(response.data?.balances)
        ? response.data.balances
        : Array.isArray(response.data?.data?.balances)
          ? response.data.data.balances
          : [];

      // Try to get userId from response
      const userId = response.data?.userId || response.data?.data?.userId || response.data?.user?.id || (parsedBalances[0]?.userId) || null;

      setTeamEmployeeBalances(parsedBalances);
      setSelectedTeamEmployeeEmail(trimmedEmail);
      setSelectedTeamEmployeeUserId(userId);
      return true;
    } catch {
      setTeamEmployeeBalances([]);
      setSelectedTeamEmployeeEmail("");
      setSelectedTeamEmployeeUserId(null);
      toast.error("Unable to load employee leave balance");
      return false;
    } finally {
      setIsTeamEmployeeBalanceLoading(false);
    }
  }, [
    canUseLeaveSearch,
    isReportingManagerOnly,
    user?.id,
    validateManagerHierarchyAccess,
  ]);

  // Restore team balance state from browser history on refresh
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentState = (window.history.state ?? {}) as Record<string, unknown>;
    const leavesState =
      (currentState.__leavesState as PersistedLeavesState | undefined) ?? {};

    const rawRestoredTab = String(leavesState.activeMainTab ?? "");
    const restoredMainTab: LeavesMainTab =
      rawRestoredTab === "all_org"
        ? "all_org"
        : rawRestoredTab === "my_reportees" || rawRestoredTab === "team"
          ? "my_reportees"
          : "leaves";

    const canRestoreTeamTab =
      restoredMainTab === "my_reportees" ||
      (restoredMainTab === "all_org" && isAdminOrSuperAdmin);

    if (restoredMainTab === "leaves" || (canUseLeaveSearch && canRestoreTeamTab)) {
      setActiveMainTab(restoredMainTab);
      setTeamVisibilityScope(
        restoredMainTab === "all_org" ? "all_org" : "my_reportees"
      );
    }

    if (canUseLeaveSearch && leavesState.isTeamEmployeeBalanceView) {
      setIsTeamEmployeeBalanceView(true);
      setShowTeamEmployeeBalanceSearch(true);
      const balanceTab: LeavesMainTab = "my_reportees";
      setActiveMainTab(balanceTab);
      setTeamVisibilityScope("my_reportees");
    }

    if (canUseLeaveSearch && leavesState.teamEmployeeEmail) {
      setTeamEmployeeBalanceEmail(leavesState.teamEmployeeEmail);
      void fetchEmployeeLeaveBalance(leavesState.teamEmployeeEmail);
    }
  }, [canUseLeaveSearch, fetchEmployeeLeaveBalance, isAdminOrSuperAdmin]);

  useEffect(() => {
    if (!canUseLeaveSearch && activeMainTab !== "leaves") {
      setActiveMainTab("leaves");
      setTeamVisibilityScope("my_reportees");
    }

    if (
      canUseLeaveSearch &&
      activeMainTab === "all_org" &&
      !isAdminOrSuperAdmin
    ) {
      setActiveMainTab("my_reportees");
      setTeamVisibilityScope("my_reportees");
    }

    if (isTeamEmployeeBalanceView) {
      if (!canUseLeaveSearch) {
        setIsTeamEmployeeBalanceView(false);
        setShowTeamEmployeeBalanceSearch(false);
      }

      if (activeMainTab === "all_org") {
        setIsTeamEmployeeBalanceView(false);
        setShowTeamEmployeeBalanceSearch(false);
      }
    }
  }, [
    activeMainTab,
    canUseLeaveSearch,
    isAdminOrSuperAdmin,
    isTeamEmployeeBalanceView,
  ]);

  useEffect(() => {
    persistLeavesState({ activeMainTab });
  }, [activeMainTab, persistLeavesState]);

  const searchTeamEmployeeBalanceByEmail = useCallback(async (rawEmail: string) => {
    if (!canUseLeaveSearch) {
      toast.error("You are not allowed to search employee balances");
      return;
    }

    const email = rawEmail.trim();
    if (!email) {
      toast.error("Please enter employee email");
      return;
    }

    const success = await fetchEmployeeLeaveBalance(email);
    if (success) {
      const balanceTab: LeavesMainTab =
        activeMainTab === "all_org" && isAdminOrSuperAdmin
          ? "all_org"
          : "my_reportees";
      setActiveMainTab(balanceTab);
      setTeamVisibilityScope(
        balanceTab === "all_org" ? "all_org" : "my_reportees"
      );
      setIsTeamEmployeeBalanceView(true);
      setShowTeamEmployeeBalanceSearch(true);
      persistLeavesState({
        activeMainTab: balanceTab,
        isTeamEmployeeBalanceView: true,
        teamEmployeeEmail: email,
      });
    }
  }, [
    activeMainTab,
    canUseLeaveSearch,
    fetchEmployeeLeaveBalance,
    isAdminOrSuperAdmin,
    persistLeavesState,
  ]);

  const handleSearchTeamEmployeeBalance = useCallback(async () => {
    await searchTeamEmployeeBalanceByEmail(teamEmployeeBalanceEmail);
  }, [searchTeamEmployeeBalanceByEmail, teamEmployeeBalanceEmail]);

  const clearTeamEmployeeBalanceSearch = useCallback(() => {
    // Clear search field and data, but keep search interface visible
    setTeamEmployeeBalanceEmail("");
    setSelectedTeamEmployeeEmail("");
    setSelectedTeamEmployeeUserId(null);
    setTeamEmployeeBalances([]);

    const currentTeamTab: LeavesMainTab =
      activeMainTab === "all_org" && isAdminOrSuperAdmin
        ? "all_org"
        : "my_reportees";

    persistLeavesState({
      activeMainTab: currentTeamTab,
      isTeamEmployeeBalanceView: true,
      teamEmployeeEmail: "",
    });
  }, [activeMainTab, isAdminOrSuperAdmin, persistLeavesState]);

  const backToTeamLeaves = useCallback(() => {
    const currentTeamTab: LeavesMainTab =
      activeMainTab === "all_org" && isAdminOrSuperAdmin
        ? "all_org"
        : "my_reportees";

    setIsTeamEmployeeBalanceView(false);
    setShowTeamEmployeeBalanceSearch(false);
    persistLeavesState({
      activeMainTab: currentTeamTab,
      isTeamEmployeeBalanceView: false,
      teamEmployeeEmail: teamEmployeeBalanceEmail,
    });
  }, [
    activeMainTab,
    isAdminOrSuperAdmin,
    persistLeavesState,
    teamEmployeeBalanceEmail,
  ]);

  const handleUpdateAllocatedBalance = useCallback(async () => {
    if (!editingAllocatedBalance) return;
    const userId = selectedTeamEmployeeUserId ?? adminApplyEmployeeUserId;
    if (!userId) {
      toast.error("No employee selected");
      return;
    }

    const newAllocatedHours = parseFloat(editingAllocatedHours);
    if (isNaN(newAllocatedHours) || newAllocatedHours < 0) {
      toast.error("Please enter a valid number");
      return;
    }

    setIsUpdatingAllocated(true);
    try {
      await apiClient.patch(API_PATHS.LEAVES_ADMIN_BALANCES_UPDATE, {
        userId,
        leaveTypeId: editingAllocatedBalance.leaveTypeId,
        allocatedHours: newAllocatedHours * 8,
      });

      toast.success("Allocated balance updated successfully");

      setTeamEmployeeBalances((prev) =>
        prev.map((balance) =>
          balance.id === editingAllocatedBalance.id
            ? { ...balance, allocatedHours: newAllocatedHours * 8 }
            : balance
        )
      );

      setAdminEmployeeBalances((prev) =>
        prev.map((balance) =>
          balance.id === editingAllocatedBalance.id
            ? { ...balance, allocatedHours: newAllocatedHours * 8 }
            : balance
        )
      );
      setEditingAllocatedBalance(null);
      setEditingAllocatedHours("");
    } catch {
      toast.error("Failed to update allocated balance");
    } finally {
      setIsUpdatingAllocated(false);
    }
  }, [
    editingAllocatedBalance,
    editingAllocatedHours,
    selectedTeamEmployeeUserId,
    adminApplyEmployeeUserId,
  ]);

  const visibleBalances = useMemo(() => {
    return balances.filter((balance) => {
      const leaveName = String(balance.leaveType?.name ?? "").trim().toLowerCase();
      const leaveCode = String(balance.leaveType?.code ?? "").trim().toLowerCase();

      const isCompensatoryLeave =
        leaveName === "compensatory leave" ||
        leaveCode === "compensatory_leave" ||
        leaveCode === "compensatory-leave" ||
        leaveCode === "compensatory";

      return !isCompensatoryLeave;
    });
  }, [balances]);

  // Summary stats from balances API summary field
  const summaryStats = useMemo(() => ({
    available: leaveSummary?.availableEarnedLeaves ?? 0,
    allocated: leaveSummary?.totalAllocatedEarnedLeaves ?? 0,
    pending: leaveSummary?.pending ?? 0,
    approved: leaveSummary?.approved ?? 0,
  }), [leaveSummary]);

  // Filtered leave requests
  const filteredLeaves = useMemo(() => {
    const effectiveFromDate =
      historyFromDate && historyToDate
        ? (historyFromDate <= historyToDate ? historyFromDate : historyToDate)
        : historyFromDate;
    const effectiveToDate =
      historyFromDate && historyToDate
        ? (historyFromDate <= historyToDate ? historyToDate : historyFromDate)
        : historyToDate;

    const fromStr = effectiveFromDate ? format(effectiveFromDate, "yyyy-MM-dd") : "";
    const toStr = effectiveToDate ? format(effectiveToDate, "yyyy-MM-dd") : "";

    return leaveHistory.filter((leave) => {
      const matchesLeaveType =
        leaveTypeFilter === "all" ||
        String(leave.leaveType?.name ?? "").trim().toLowerCase() ===
          leaveTypeFilter.trim().toLowerCase();
      const matchesStatus = statusFilter === "all" || leave.state === statusFilter;
      const matchesFrom = !fromStr || leave.endDate >= fromStr;
      const matchesTo = !toStr || leave.startDate <= toStr;
      return matchesLeaveType && matchesStatus && matchesFrom && matchesTo;
    });
  }, [leaveHistory, statusFilter, leaveTypeFilter, historyFromDate, historyToDate]);

  const leavesTotal = filteredLeaves.length;
  const leavesTotalPages = Math.max(1, Math.ceil(leavesTotal / leavesPageSize));
  const paginatedLeaves = useMemo(() => {
    const start = (leavesPage - 1) * leavesPageSize;
    return filteredLeaves.slice(start, start + leavesPageSize);
  }, [filteredLeaves, leavesPage, leavesPageSize]);

  useEffect(() => {
    setLeavesPage(1);
  }, [filteredLeaves, leavesPageSize]);

  useEffect(() => {
    setLeavesPage((prev) => Math.min(prev, leavesTotalPages));
  }, [leavesTotalPages]);

  const myReporteeTeamLeaves = useMemo(() => {
    if (!user?.id) return [] as TeamLeaveRequest[];

    const resolveManagerId = (leave: TeamLeaveRequest) => {
      const flatManagerId = Number(
        (leave as TeamLeaveRequest & { managerId?: unknown }).managerId
      );

      if (Number.isFinite(flatManagerId)) {
        return flatManagerId;
      }

      const nestedManagerId = Number(
        (
          leave as TeamLeaveRequest & { manager?: { id?: unknown } }
        ).manager?.id
      );

      return Number.isFinite(nestedManagerId) ? nestedManagerId : null;
    };

    return teamLeaveHistory.filter((leave) => {
      const managerId = resolveManagerId(leave);
      return managerId !== null && managerId === Number(user.id);
    });
  }, [teamLeaveHistory, user?.id]);

  const scopedTeamLeaves = useMemo(() => {
    if (isReportingManagerOnly) {
      return myReporteeTeamLeaves;
    }

    if (isAdminOrSuperAdmin && teamVisibilityScope === "my_reportees") {
      return myReporteeTeamLeaves;
    }

    return teamLeaveHistory;
  }, [
    isAdminOrSuperAdmin,
    isReportingManagerOnly,
    myReporteeTeamLeaves,
    teamLeaveHistory,
    teamVisibilityScope,
  ]);

  const teamLeaveTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    return scopedTeamLeaves
      .map((leave) => String(leave.leaveType?.name ?? "").trim())
      .filter((name) => {
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: getDisplayLeaveTypeName(name) }));
  }, [scopedTeamLeaves]);

  const filteredTeamLeaves = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();

    return [...scopedTeamLeaves]
      .filter((leave) => {
        const matchesSearch =
          !query ||
          String(leave.user?.name ?? "").toLowerCase().includes(query) ||
          String(leave.user?.email ?? "").toLowerCase().includes(query);
        const matchesStatus =
          teamStatusFilter === "all" || leave.state === teamStatusFilter;
        const matchesLeaveType =
          teamLeaveTypeFilter === "all" ||
          String(leave.leaveType?.name ?? "").trim().toLowerCase() ===
            teamLeaveTypeFilter.trim().toLowerCase();

        return matchesSearch && matchesStatus && matchesLeaveType;
      })
      .sort((a, b) => {
        const aTs = new Date(a.requestedAt).getTime();
        const bTs = new Date(b.requestedAt).getTime();
        return bTs - aTs;
      });
  }, [scopedTeamLeaves, teamSearch, teamStatusFilter, teamLeaveTypeFilter]);

  const showNoReporteesEmptyState =
    isAdminOrSuperAdmin &&
    teamVisibilityScope === "my_reportees" &&
    !isTeamLoading &&
    myReporteeTeamLeaves.length === 0;

  // Sorted balances (casual/wellness first)
  const sortedBalances = useMemo(() => {
    const priority = ["casual leave", "wellness leave"];
    return [...visibleBalances].sort((a, b) => {
      const aKey = (a.leaveType?.name || "").toLowerCase();
      const bKey = (b.leaveType?.name || "").toLowerCase();
      const ai = priority.findIndex((p) => aKey.includes(p));
      const bi = priority.findIndex((p) => bKey.includes(p));
      return (
        (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
        aKey.localeCompare(bKey)
      );
    });
  }, [visibleBalances]);

  const leaveTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    return sortedBalances
      .map((balance) => {
        const value = String(balance.leaveType?.name ?? "").trim();
        return {
          value,
          label: getDisplayLeaveTypeName(value),
        };
      })
      .filter((option) => {
        if (!option.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
  }, [sortedBalances]);

  const sortedTeamEmployeeBalances = useMemo(() => {
    const priority = ["casual leave", "wellness leave"];
    return teamEmployeeBalances
      .filter((balance) => {
        const leaveName = String(balance.leaveType?.name ?? "").trim().toLowerCase();
        const leaveCode = String(balance.leaveType?.code ?? "").trim().toLowerCase();

        const isCompensatoryLeave =
          leaveName === "compensatory leave" ||
          leaveCode === "compensatory_leave" ||
          leaveCode === "compensatory-leave" ||
          leaveCode === "compensatory";

        return !isCompensatoryLeave;
      })
      .sort((a, b) => {
        const aKey = (a.leaveType?.name || "").toLowerCase();
        const bKey = (b.leaveType?.name || "").toLowerCase();
        const ai = priority.findIndex((p) => aKey.includes(p));
        const bi = priority.findIndex((p) => bKey.includes(p));
        return (
          (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
          aKey.localeCompare(bKey)
        );
      });
  }, [teamEmployeeBalances]);

  const formatLeaveDaysValue = (days: number) => {
    const normalized = Math.round((days + Number.EPSILON) * 100) / 100;
    return Number.isInteger(normalized)
      ? String(normalized)
      : String(normalized)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*[1-9])0+$/, "$1");
  };

  const formatDays = (leave: LeaveRequest) => {
    const days = leave.hours / 8;
    return `${formatLeaveDaysValue(days)}d`;
  };

  const formatTeamLeaveDuration = (leave: TeamLeaveRequest) => {
    if (leave.durationType === "half_day") {
      const segment =
        leave.halfDaySegment === "first_half" ? "First Half" : "Second Half";
      return `Half Day (${segment})`;
    }

    const days = leave.hours / 8;
    return `${formatLeaveDaysValue(days)} ${days === 1 ? "day" : "days"}`;
  };

  const sortedAdminEmployeeBalances = useMemo(() => {
    const priority = ["casual leave", "wellness leave"];
    return adminEmployeeBalances
      .filter((balance) => {
        const leaveName = String(balance.leaveType?.name ?? "")
          .trim()
          .toLowerCase();
        const leaveCode = String(balance.leaveType?.code ?? "")
          .trim()
          .toLowerCase();

        const isCompensatoryLeave =
          leaveName === "compensatory leave" ||
          leaveCode === "compensatory_leave" ||
          leaveCode === "compensatory-leave" ||
          leaveCode === "compensatory";

        return !isCompensatoryLeave;
      })
      .sort((a, b) => {
        const aKey = (a.leaveType?.name || "").toLowerCase();
        const bKey = (b.leaveType?.name || "").toLowerCase();
        const ai = priority.findIndex((p) => aKey.includes(p));
        const bi = priority.findIndex((p) => bKey.includes(p));
        return (
          (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
          aKey.localeCompare(bKey)
        );
      });
  }, [adminEmployeeBalances]);

  const hasFilters =
    statusFilter !== "all" || leaveTypeFilter !== "all" || historyFromDate || historyToDate;

  const clearFilters = () => {
    setStatusFilter("all");
    setLeaveTypeFilter("all");
    setHistoryFromDate(undefined);
    setHistoryToDate(undefined);
  };

  const getStatusBadge = (state: string) => {
    const configs = {
      pending: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Pending" },
      approved: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Approved" },
      rejected: { dot: "bg-red-400", text: "text-red-700", bg: "bg-red-50 border-red-200", label: "Declined" },
    };
    const c = configs[state as keyof typeof configs] ?? configs.rejected;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", c.bg, c.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
        {c.label}
      </span>
    );
  };

  function getDisplayLeaveTypeName(name: string) {
    const normalizedName = name.trim().toLowerCase();
    if (normalizedName === "comp off") {
      return "Compensatory Leave";
    }
    return name;
  }

  function isCompOffLeaveType(leaveType?: { name?: string; code?: string }) {
    const normalizedName = String(leaveType?.name ?? "").trim().toLowerCase();
    const normalizedCode = String(leaveType?.code ?? "").trim().toLowerCase();

    return (
      normalizedName === "comp off" ||
      normalizedName === "compensatory leave" ||
      normalizedCode === "compensatory_leave" ||
      normalizedCode === "compensatory-leave" ||
      normalizedCode === "compensatory"
    );
  }

  const getLeaveCategory = (leaveCode?: string, leaveName?: string) => {
    const normalizedCode = String(leaveCode ?? "")
      .trim()
      .toUpperCase();
    const normalizedName = String(leaveName ?? "")
      .trim()
      .toLowerCase();

    const isEarnedLeave =
      normalizedCode === "CL" ||
      normalizedCode === "WL" ||
      normalizedName === "comp off" ||
      normalizedName === "casual leave" ||
      normalizedName === "wellness leave";

    return isEarnedLeave
      ? {
          label: "Earned Leave",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      : {
          label: "Special Leave",
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };
  };

  const currentYear = new Date().getFullYear();
  const fyLabel = `FY ${currentYear - 1}–${String(currentYear).slice(-2)}`;
  const leavePolicyUrl = process.env.NEXT_PUBLIC_LEAVE_POLICY_URL?.trim() ?? "";
  const headerAction = (() => {
    if (activeMainTab === "leaves") {
      const shouldOpenNewRequest =
        searchParams.get("openNewRequest") === "1" ||
        searchParams.get("openNewRequest") === "true";
      const prefilledDate = searchParams.get("date") ?? undefined;

      return (
        <NewLeaveRequestDialog
          userEmail={user?.email ?? ""}
          onSuccess={handleNewRequestSuccess}
          forceOpen={shouldOpenNewRequest}
          prefilledDate={prefilledDate}
        />
      );
    }

    if (activeMainTab === "my_reportees") {
      return (
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            setIsTeamEmployeeBalanceView(true);
            setShowTeamEmployeeBalanceSearch(true);
            persistLeavesState({
              activeMainTab: "my_reportees",
              isTeamEmployeeBalanceView: true,
              teamEmployeeEmail: teamEmployeeBalanceEmail,
            });
          }}
          className="gap-1.5 whitespace-nowrap"
        >
          View Leave Balance for Reportees
        </Button>
      );
    }
    if (activeMainTab === "all_org" && isAdminOrSuperAdmin) {
      return (
        <Button
          size="sm"
          variant="default"
          onClick={openAdminApplyLeaveDialog}
          className="gap-1.5 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Leave Request for Employee
        </Button>
      );
    }
    return null;
  })();

  const statCards = [
    {
      label: "Available Earned Leaves",
      value: summaryStats.available,
      icon: TreePalm,
      accent: "border-l-[#8a6f5e]",
      iconBg: "bg-[#f0ebe3]",
      iconColor: "text-[#8a6f5e]",
      valueColor: "text-[#4a5548]",
    },
    {
      label: "Total Allocated Earned Leaves",
      value: summaryStats.allocated,
      icon: CalendarIcon,
      accent: "border-l-[#748074]",
      iconBg: "bg-[#e5eeea]",
      iconColor: "text-[#748074]",
      valueColor: "text-[#4a5548]",
    },
    {
      label: "Pending",
      value: summaryStats.pending,
      icon: Clock,
      accent: "border-l-amber-400",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
    {
      label: "Approved",
      value: summaryStats.approved,
      icon: CheckCircle2,
      accent: "border-l-emerald-400",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
  ];

  return (
    <>
      <AppHeader
        crumbs={[{ label: "Leaves" }]}
        right={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleViewLeaveHistory}
              className="my-1 h-9 px-3 text-sm font-medium whitespace-nowrap"
            >
              View Leave History
            </Button>
            <a
              href={leavePolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="my-1 inline-flex h-9 items-center whitespace-nowrap rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary-background hover:text-foreground"
            >
              View Leave Policy ↗
            </a>
            <div className="my-1">{headerAction}</div>
          </div>
        }
      />
      <PageWrapper>
        <div className="p-4 md:p-6 space-y-6">
          {/* Page header */}
          <div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Leave Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track and manage your time off</p>
            </div>
          </div>

          <Tabs
            value={activeMainTab}
            onValueChange={(value) => {
              const nextTab = value as LeavesMainTab;

              if (nextTab !== "leaves" && !canUseLeaveSearch) {
                setActiveMainTab("leaves");
                setTeamVisibilityScope("my_reportees");
                return;
              }

              if (nextTab === "all_org" && !isAdminOrSuperAdmin) {
                setActiveMainTab("my_reportees");
                setTeamVisibilityScope("my_reportees");
                return;
              }

              setTeamVisibilityScope(
                nextTab === "all_org" ? "all_org" : "my_reportees"
              );

              if (nextTab === "all_org") {
                setIsTeamEmployeeBalanceView(false);
                setShowTeamEmployeeBalanceSearch(false);
              }

              setActiveMainTab(nextTab);
            }}
            className="w-full"
          >
            {/* Tab navigation — segmented pill style */}
            <TabsList className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary-background p-1 h-auto mb-6">
              {[
                { value: "leaves", label: "My Leaves" },
                ...(canUseLeaveSearch
                  ? ([{ value: "my_reportees", label: "My Reportees" }] as const)
                  : []),
                ...(canUseLeaveSearch && isAdminOrSuperAdmin
                  ? ([{ value: "all_org", label: "All Org" }] as const)
                  : []),
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    "text-muted-foreground hover:text-foreground",
                    "border border-transparent",
                    "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:shadow-sm",
                    "focus-visible:outline-none"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── MY LEAVES TAB ── */}
            <TabsContent value="leaves" className="space-y-6 mt-0">
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className={cn(
                        "bg-background border border-border rounded-lg p-4 border-l-4 transition-shadow hover:shadow-sm",
                        card.accent
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {card.label}
                        </span>
                        <span className={cn("p-1.5 rounded-md", card.iconBg)}>
                          <Icon className={cn("h-3.5 w-3.5", card.iconColor)} />
                        </span>
                      </div>
                      {isBalancesLoading ? (
                        <div className="h-8 w-16 bg-secondary-background rounded animate-pulse" />
                      ) : (
                        <p className={cn("text-2xl font-bold tabular-nums", card.valueColor)}>
                          {formatLeaveDaysValue(card.value)}
                          <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leave Balance */}
              <div className="rounded-lg border border-border overflow-hidden bg-background">
                <div className="px-4 py-3 border-b border-border bg-secondary-background flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Leave Balance</span>
                  {!isBalancesLoading && (
                    <span className="text-xs text-muted-foreground">
                      {sortedBalances.length} {sortedBalances.length === 1 ? "record" : "records"}
                    </span>
                  )}
                </div>
                {isBalancesLoading ? (
                  <div className="p-5 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-8 bg-secondary-background rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full text-sm min-w-[640px]">
                      <TableHeader>
                        <TableRow className="border-b border-border bg-secondary-background">
                          <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</TableHead>
                          <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated</TableHead>
                          <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</TableHead>
                          <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</TableHead>
                          <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBalances.length === 0 ? (
                            <TableRow>
                            <TableCell colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              No leave balance found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedBalances.map((balance) => {
                            const allocated = balance.allocatedHours / 8;
                            const pending = balance.pendingHours / 8;
                            const approved = balance.bookedHours / 8;
                            const remaining = balance.balanceHours / 8;
                            const isCompOffLeave = isCompOffLeaveType(balance.leaveType);
                            const remainingTone =
                              remaining <= 0
                                ? "bg-red-50 text-red-700 border-red-200"
                                : remaining <= 2
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200";

                            return (
                              <TableRow key={balance.id} className="border-b border-border last:border-0 hover:bg-secondary-background/50 transition-colors">
                                <TableCell className="px-4 py-3.5 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <span>{getDisplayLeaveTypeName(balance.leaveType.name)}</span>
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                        getLeaveCategory(balance.leaveType.code, balance.leaveType.name).className
                                      )}
                                    >
                                      {getLeaveCategory(balance.leaveType.code, balance.leaveType.name).label}
                                    </span>
                                    {isCompOffLeave && (
                                      <Link href="/compoff" className="text-xs font-medium text-primary underline-offset-2 hover:underline ml-2">
                                        View details
                                      </Link>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                                  {formatLeaveDaysValue(allocated)}
                                </TableCell>
                                <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                                  {formatLeaveDaysValue(pending)}
                                </TableCell>
                                <TableCell className="px-4 py-3.5 text-center tabular-nums text-foreground">
                                  {formatLeaveDaysValue(approved)}
                                </TableCell>
                                <TableCell className="px-4 py-3.5 text-center tabular-nums font-semibold">
                                    <span className={cn("inline-flex min-w-[3rem] items-center justify-center rounded-md border px-2 py-1", remainingTone)}>
                                      {formatLeaveDaysValue(remaining)}
                                    </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Leave History */}
              <div ref={leaveHistorySectionRef} className="rounded-lg border border-border overflow-hidden bg-background">
                <div className="px-4 py-3 border-b border-border bg-secondary-background flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Leave History</span>
                  {!isLoading && (
                    <span className="text-xs text-muted-foreground">
                      {filteredLeaves.length} {filteredLeaves.length === 1 ? "record" : "records"}
                    </span>
                  )}
                </div>

                <div className="px-4 py-4 border-b border-border flex flex-wrap items-center gap-2">
                  <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                    <SelectTrigger className="h-9 w-[170px] bg-background text-foreground border-border text-sm font-base">
                      <SelectValue placeholder="All Leave Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leave Types</SelectItem>
                      {leaveTypeOptions.map((leaveType) => (
                        <SelectItem key={leaveType.value} value={leaveType.value}>
                          {leaveType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-9 min-w-[170px] justify-start text-sm font-base",
                              !historyFromDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            {historyFromDate
                              ? `From: ${format(historyFromDate, "d MMM yyyy")}`
                              : "From"}
                            {historyFromDate && (
                              <span
                                role="button"
                                className="ml-auto h-4 w-4 rounded-full flex items-center justify-center hover:bg-secondary-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryFromDate(undefined);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0" align="start">
                          <Calendar
                            mode="single"
                            selected={historyFromDate}
                            onSelect={setHistoryFromDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-9 min-w-[170px] justify-start text-sm font-base",
                              !historyToDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            {historyToDate
                              ? `To: ${format(historyToDate, "d MMM yyyy")}`
                              : "To"}
                            {historyToDate && (
                              <span
                                role="button"
                                className="ml-auto h-4 w-4 rounded-full flex items-center justify-center hover:bg-secondary-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryToDate(undefined);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0" align="start">
                          <Calendar
                            mode="single"
                            selected={historyToDate}
                            onSelect={setHistoryToDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[130px] bg-background text-foreground border-border text-sm font-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={clearFilters}
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <Table className="w-full text-sm min-w-[600px]">
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">#</TableHead>
                        <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</TableHead>
                        <TableHead className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</TableHead>
                        <TableHead className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-b border-border last:border-0">
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j} className="px-4 py-3.5">
                                <div className="h-4 bg-secondary-background rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredLeaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <TreePalm className="h-8 w-8 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">No leave records found</p>
                              {hasFilters && (
                                <button onClick={clearFilters} className="text-xs text-foreground underline underline-offset-2">
                                  Clear filters
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedLeaves.map((leave, idx) => (
                          <TableRow
                            key={leave.id}
                            className="border-b border-border last:border-0 hover:bg-secondary-background/60 transition-colors"
                          >
                            <TableCell className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums">
                              {(leavesPage - 1) * leavesPageSize + idx + 1}
                            </TableCell>
                            <TableCell className="px-4 py-3.5">
                              <span className="font-medium text-foreground">{getDisplayLeaveTypeName(leave.leaveType.name)}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-foreground">
                              <span>{format(parseISO(leave.startDate), "d MMM yyyy")}</span>
                              {leave.startDate !== leave.endDate && (
                                <>
                                  <span className="mx-1.5 text-muted-foreground">→</span>
                                  <span>{format(parseISO(leave.endDate), "d MMM yyyy")}</span>
                                </>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-md bg-secondary-background border border-border px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                                {formatDays(leave)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-right">
                              {getStatusBadge(leave.state)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {!isLoading && filteredLeaves.length > 0 && leavesTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-border bg-secondary-background flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      Showing {(leavesPage - 1) * leavesPageSize + 1}-
                      {Math.min(leavesPage * leavesPageSize, leavesTotal)} of {leavesTotal}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLeavesPage((p) => Math.max(1, p - 1))}
                        disabled={leavesPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLeavesPage((p) => Math.min(leavesTotalPages, p + 1))}
                        disabled={leavesPage === leavesTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TEAM MANAGEMENT TABS ── */}
            {canUseLeaveSearch && (
            <TabsContent
              value={activeMainTab === "all_org" ? "all_org" : "my_reportees"}
              className="mt-0"
            >
                {canUseLeaveSearch && activeMainTab === "my_reportees" && isTeamEmployeeBalanceView && showTeamEmployeeBalanceSearch && (
                  <div className="mb-4 rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <SearchCombobox
                        value={teamEmployeeBalanceEmail}
                        onValueChange={(nextValue) => {
                          setTeamEmployeeBalanceEmail(nextValue);
                        }}
                        onSelect={(option) => {
                          void searchTeamEmployeeBalanceByEmail(option.value);
                        }}
                        onSubmitValue={(nextValue) => {
                          void searchTeamEmployeeBalanceByEmail(nextValue);
                        }}
                        fetchOptions={fetchEmployeeEmailSuggestions}
                        placeholder="Select employee"
                        searchPlaceholder="Search employee..."
                        emptyMessage="No employee found."
                        minQueryLength={0}
                        className="w-[260px]"
                      />
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => void handleSearchTeamEmployeeBalance()}
                        disabled={isTeamEmployeeBalanceLoading}
                        className="sm:min-w-[92px]"
                      >
                        {isTeamEmployeeBalanceLoading ? "Searching..." : "Search"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearTeamEmployeeBalanceSearch}
                        disabled={isTeamEmployeeBalanceLoading}
                        className="sm:min-w-[72px]"
                      >
                        Clear
                      </Button>
                    </div>

                    {selectedTeamEmployeeEmail && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Showing leave balance for: {selectedTeamEmployeeEmail}
                      </p>
                    )}

                    {selectedTeamEmployeeEmail && (
                      <div className="mt-3 overflow-x-auto rounded-md border border-border">
                        <Table className="w-full text-sm min-w-[640px]">
                          <TableHeader>
                            <TableRow className="border-b border-border bg-secondary-background">
                              <TableHead className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</TableHead>
                              <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated</TableHead>
                              <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</TableHead>
                              <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</TableHead>
                              <TableHead className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedTeamEmployeeBalances.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                  No leave balance found for this employee.
                                </TableCell>
                              </TableRow>
                            ) : (
                              sortedTeamEmployeeBalances.map((balance) => (
                                <TableRow key={balance.id} className="border-b border-border last:border-0">
                                  <TableCell className="px-4 py-3 font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                      <span>{getDisplayLeaveTypeName(balance.leaveType.name)}</span>
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                          getLeaveCategory(balance.leaveType.code, balance.leaveType.name).className
                                        )}
                                      >
                                        {getLeaveCategory(balance.leaveType.code, balance.leaveType.name).label}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-center tabular-nums">
                                    {editingAllocatedBalance?.id === balance.id ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <Input
                                          type="number"
                                          inputMode="decimal"
                                          step="0.5"
                                          min="0"
                                          value={editingAllocatedHours}
                                          onChange={(e) => setEditingAllocatedHours(e.target.value)}
                                          className="h-7 w-16 text-center text-sm"
                                          disabled={isUpdatingAllocated}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); void handleUpdateAllocatedBalance(); }}
                                          disabled={isUpdatingAllocated}
                                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                                          title="Confirm"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setEditingAllocatedBalance(null); setEditingAllocatedHours(""); }}
                                          disabled={isUpdatingAllocated}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                          title="Cancel"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        <span>{formatLeaveDaysValue(balance.allocatedHours / 8)}</span>
                                        {canEditTeamPendingRequests && !isCompOffLeaveType(balance.leaveType) && (
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setEditingAllocatedBalance(balance); setEditingAllocatedHours(String(balance.allocatedHours / 8)); }}
                                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                                            title="Edit allocated balance"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-center tabular-nums">
                                    {formatLeaveDaysValue(balance.balanceHours / 8)}
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-center tabular-nums">
                                    {formatLeaveDaysValue(balance.pendingHours / 8)}
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-center tabular-nums">
                                    {formatLeaveDaysValue(balance.bookedHours / 8)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[220px] flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search employee name or email..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="pl-9 h-9 bg-background text-sm"
                        />
                      </div>

                      <Select
                        value={teamLeaveTypeFilter}
                        onValueChange={setTeamLeaveTypeFilter}
                      >
                        <SelectTrigger className="h-9 w-[170px] bg-background text-foreground border-border text-sm font-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Leave Types</SelectItem>
                          {teamLeaveTypeOptions.map((typeOption) => (
                            <SelectItem key={typeOption.value} value={typeOption.value}>
                              {typeOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={teamStatusFilter}
                        onValueChange={(value) =>
                          setTeamStatusFilter(
                            value as "all" | "pending" | "approved" | "rejected"
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-[150px] bg-background text-foreground border-border text-sm font-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {showNoReporteesEmptyState ? (
                    <div className="rounded-lg border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                      No reportees found. If this seems incorrect, please contact your manager.
                    </div>
                  ) : (
                    <DataTable
                      columns={columns}
                      data={filteredTeamLeaves}
                      onUpdate={fetchTeamLeaves}
                      canEditPendingRequests={canEditTeamPendingRequests}
                      canDeleteApprovedRequests={canEditTeamPendingRequests}
                      getRowCanSelect={(row) => row.original.state === "pending"}
                    />
                  )}
                </div>
            </TabsContent>
            )}
          </Tabs>
        </div>

      </PageWrapper>

      {/* Admin Apply Leave Side Panel */}
      <Sheet
        open={adminApplyLeaveOpen}
        onOpenChange={(nextOpen) => {
          setAdminApplyLeaveOpen(nextOpen);
          if (!nextOpen) {
            setIsAdminDatePickerOpen(false);
            setAdminApplyEmployeeEmail("");
            setAdminApplyEmployeeName("");
            setAdminApplyEmployeeUserId(null);
            setAdminEmployeeBalances([]);
            setAdminEmployeeHistory([]);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[620px] md:w-[680px] lg:w-[740px] xl:w-[800px] max-w-[90vw] overflow-y-auto p-0"
        >
          <SheetHeader className="border-b border-border pb-4 pr-12">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <SheetTitle>Apply Leave for Employee</SheetTitle>
                <SheetDescription>
                  {adminApplyEmployeeEmail
                    ? `Apply leave on behalf of ${adminApplyEmployeeEmail}`
                    : "Select an employee and submit to auto-approve leave."}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Form {...adminApplyLeaveForm}>
            <form
              onSubmit={adminApplyLeaveForm.handleSubmit(handleAdminApplyLeaveSubmit)}
              className="p-4 md:p-5"
            >
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Employee</p>
                <SearchCombobox
                  value={adminApplyEmployeeEmail}
                  onValueChange={(nextValue) => {
                    setAdminApplyEmployeeEmail(nextValue);
                    setAdminApplyEmployeeName("");
                    setAdminApplyEmployeeUserId(null);
                    setAdminEmployeeBalances([]);
                    setAdminEmployeeHistory([]);
                  }}
                  onSelect={(option) => {
                    const selectedEmail = option.description ?? option.label;
                    const selectedUserId = Number(option.value);
                    setAdminApplyEmployeeName(option.label);
                    setAdminApplyEmployeeUserId(selectedUserId);
                    setAdminApplyEmployeeEmail(selectedEmail);
                    void loadAdminEmployeeDetails(selectedEmail, selectedUserId, option.label);
                  }}
                  onSubmitValue={(nextValue) => {
                    void (async () => {
                      const resolved = await resolveAdminApplyEmployeeByEmail(nextValue);
                      if (resolved) {
                        await loadAdminEmployeeDetails(resolved.email, resolved.userId, resolved.name);
                      }
                    })();
                  }}
                  fetchOptions={fetchAdminApplyEmployeeSuggestions}
                  placeholder="Select employee"
                  searchPlaceholder="Search employee..."
                  emptyMessage="No employee found."
                  minQueryLength={0}
                  className="w-full"
                />
              </div>

              <div className="grid gap-4">
                <div className="space-y-4">
                  {!adminApplyEmployeeEmail ? (
                    <div className="rounded-lg border border-dashed border-border bg-secondary-background/30 p-4 text-sm text-muted-foreground">
                      Select an employee to view leave balance and leave history.
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-lg border border-border bg-secondary-background/40 p-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {adminApplyEmployeeName || adminApplyEmployeeEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">{adminApplyEmployeeEmail}</p>
                      </div>

                      {adminEmployeeDetailsLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 rounded bg-secondary-background animate-pulse" />
                          <div className="h-8 rounded bg-secondary-background animate-pulse" />
                          <div className="h-8 rounded bg-secondary-background animate-pulse" />
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg border border-border bg-background overflow-hidden">
                            <div className="px-3 py-2 border-b border-border bg-secondary-background">
                              <span className="text-sm font-medium text-foreground">Leave Balance</span>
                            </div>
                            <div className="overflow-x-auto">
                              <Table className="w-full min-w-[420px] text-sm">
                                <TableHeader>
                                  <TableRow className="border-b border-border bg-secondary-background">
                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</TableHead>
                                    <TableHead className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocated</TableHead>
                                    <TableHead className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</TableHead>
                                    <TableHead className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taken</TableHead>
                                    <TableHead className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortedAdminEmployeeBalances.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">
                                        No leave balance found for this employee.
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    sortedAdminEmployeeBalances.map((balance) => {
                                      const allocated = balance.allocatedHours / 8;
                                      const pending = balance.pendingHours / 8;
                                      const taken = balance.bookedHours / 8;
                                      const remaining = balance.balanceHours / 8;
                                      const remainingTone =
                                        remaining <= 0
                                          ? "text-red-600"
                                          : remaining <= 2
                                            ? "text-amber-600"
                                            : "text-emerald-600";

                                      return (
                                        <TableRow key={balance.id} className="border-b border-border last:border-0">
                                          <TableCell className="px-3 py-2.5 font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                              <span>{getDisplayLeaveTypeName(balance.leaveType.name)}</span>
                                              <span
                                                className={cn(
                                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                                  getLeaveCategory(balance.leaveType.code, balance.leaveType.name).className
                                                )}
                                              >
                                                {getLeaveCategory(balance.leaveType.code, balance.leaveType.name).label}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-3 py-2.5 text-center tabular-nums">
                                            {editingAllocatedBalance?.id === balance.id ? (
                                              <div className="flex items-center justify-center gap-1">
                                                <Input
                                                  type="number"
                                                  inputMode="decimal"
                                                  step="0.5"
                                                  min="0"
                                                  value={editingAllocatedHours}
                                                  onChange={(e) => setEditingAllocatedHours(e.target.value)}
                                                  className="h-7 w-16 text-center text-sm"
                                                  disabled={isUpdatingAllocated}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); void handleUpdateAllocatedBalance(); }}
                                                  disabled={isUpdatingAllocated}
                                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                                                  title="Confirm"
                                                >
                                                  <CheckCircle2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); setEditingAllocatedBalance(null); setEditingAllocatedHours(""); }}
                                                  disabled={isUpdatingAllocated}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                  title="Cancel"
                                                >
                                                  <X className="h-4 w-4" />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-center gap-2">
                                                <span>{formatLeaveDaysValue(allocated)}</span>
                                                {canEditTeamPendingRequests && !isCompOffLeaveType(balance.leaveType) && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setEditingAllocatedBalance(balance); setEditingAllocatedHours(String(balance.allocatedHours / 8)); }}
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                                                    title="Edit allocated balance"
                                                  >
                                                    <Pencil className="h-4 w-4" />
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="px-3 py-2.5 text-center tabular-nums">{formatLeaveDaysValue(pending)}</TableCell>
                                          <TableCell className="px-3 py-2.5 text-center tabular-nums">{formatLeaveDaysValue(taken)}</TableCell>
                                          <TableCell className={cn("px-3 py-2.5 text-center tabular-nums font-semibold", remainingTone)}>
                                            {formatLeaveDaysValue(remaining)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          <div id="admin-apply-leave-form" className="space-y-4 rounded-lg border border-border bg-background p-4 md:p-5">
                            <p className="text-sm font-semibold text-foreground">Apply Leave</p>

                            <FormField
                              control={adminApplyLeaveForm.control}
                              name="leaveType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Leave Type</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="— Select leave type —" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {adminLeaveTypes.map((type) => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                          {getDisplayLeaveTypeName(type.name)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-red-500" />
                                </FormItem>
                              )}
                            />



                            {/* Conditional Bereavement Fields */}
                            {isAdminBereavement && (
                              <div className="space-y-4 border-primary/20 py-1">
                                <FormField
                                  control={adminApplyLeaveForm.control}
                                  name="bereavementRelationship"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Deepest condolences for their loss. Please describe the relationship to the deceased
                                      </FormLabel>
                                      <Select
                                        value={field.value || ""}
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select relationship" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="Parent">Parent</SelectItem>
                                          <SelectItem value="Child">Child</SelectItem>
                                          <SelectItem value="other_immediate_family_member">
                                            Other Immediate Family Member
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage className="text-red-500" />
                                    </FormItem>
                                  )}
                                />

                                {watchAdminBereavementRelationship === "other_immediate_family_member" && (
                                  <FormField
                                    control={adminApplyLeaveForm.control}
                                    name="bereavementRelationshipOther"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Please mention the relationship with them</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Describe the relationship"
                                            {...field}
                                            value={field.value || ""}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-red-500" />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            )}

                            {/* Conditional Wedding Fields */}
                            {isAdminWedding && (
                              <div className="space-y-4 border-primary/20 py-1">
                                <Alert className="bg-primary/5 border-primary/20">
                                  <AlertCircle className="h-4 w-4 !text-foreground" />
                                  <AlertDescription className="text-foreground">
                                    Wedding Congratulations! We wish them a lifetime of happiness and love! ❤️
                                  </AlertDescription>
                                </Alert>

                                <FormField
                                  control={adminApplyLeaveForm.control}
                                  name="weddingCardImage"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <FileUploadField
                                          label="Upload an image of the wedding card invitation"
                                          accept="image/*"
                                          value={field.value}
                                          onChange={(val) => {
                                            field.onChange(val);
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage className="text-red-500" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}

                            {/* Conditional Election Fields */}
                            {isAdminElection && (
                              <div className="space-y-4 border-primary/20 py-1">
                                <FormField
                                  control={adminApplyLeaveForm.control}
                                  name="voterIdImage"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <FileUploadField
                                          label="Upload the Voter ID card"
                                          accept="image/*"
                                          value={field.value}
                                          onChange={(val) => {
                                            field.onChange(val);
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage className="text-red-500" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}

                            {/* Conditional Exam Fields */}
                            {isAdminExam && (
                              <div className="space-y-4 border-primary/20 py-1">
                                <FormField
                                  control={adminApplyLeaveForm.control}
                                  name="examCourseName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Course or Exam Name</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Enter course or exam name"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage className="text-red-500" />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                   control={adminApplyLeaveForm.control}
                                   name="examHallTicket"
                                   render={({ field, fieldState }) => (
                                     <FormItem>
                                       <FormControl>
                                         <FileUploadField
                                           label="Upload the hall ticket or exam schedule image with the university’s letterhead"
                                           accept="image/*,application/pdf"
                                           value={field.value}
                                           onChange={(val) => {
                                             field.onChange(val);
                                           }}
                                           error={fieldState.error?.message}
                                         />
                                       </FormControl>
                                       <FormMessage className="text-red-500" />
                                     </FormItem>
                                   )}
                                 />
                              </div>
                            )}

                             {/* Conditional L&D Fields */}
                             {isAdminLAndD && (
                               <div className="space-y-4 border-primary/20 py-1">
                                 <FormField
                                   control={adminApplyLeaveForm.control}
                                   name="examCourseName"
                                   render={({ field }) => (
                                     <FormItem>
                                       <FormLabel>Learning program, course, workshop, or event name</FormLabel>
                                       <FormControl>
                                         <Input
                                           placeholder="Enter learning program, course, workshop, or event name"
                                           {...field}
                                           value={field.value || ""}
                                         />
                                       </FormControl>
                                       <FormMessage className="text-red-500" />
                                     </FormItem>
                                   )}
                                 />
                               </div>
                             )}

                            {/* Conditional Vipassana Fields */}
                            {(isAdminVipassanaCourse || isAdminVipassanaSeva) && (
                              <div className="space-y-4 border-primary/20 py-1">
                                <FormField
                                  control={adminApplyLeaveForm.control}
                                  name="vipassanaDocuments"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <FileUploadField
                                          label="Upload the booking confirmation and/or completion certificate"
                                          accept="image/*,application/pdf"
                                          multiple={true}
                                          value={field.value}
                                          onChange={(val) => {
                                            field.onChange(val);
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage className="text-red-500" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}

                            <FormField
                              control={adminApplyLeaveForm.control}
                              name="startDate"
                              render={() => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>{isAdminElection ? "Leave Date" : "Leave Date Range"}</FormLabel>
                                  <Popover modal open={isAdminDatePickerOpen} onOpenChange={setIsAdminDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal",
                                          !adminLeaveDateRange?.from && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {adminLeaveDateRange?.from ? (
                                          isAdminElection ||
                                          !adminLeaveDateRange.to ||
                                          format(adminLeaveDateRange.from, DATE_FORMATS.DISPLAY) ===
                                            format(adminLeaveDateRange.to, DATE_FORMATS.DISPLAY) ? (
                                            format(adminLeaveDateRange.from, DATE_FORMATS.DISPLAY)
                                          ) : (
                                            <>
                                              {format(adminLeaveDateRange.from, DATE_FORMATS.DISPLAY)} - {format(adminLeaveDateRange.to, DATE_FORMATS.DISPLAY)}
                                            </>
                                          )
                                        ) : (
                                          <span>{isAdminElection ? "Pick a date" : "Pick a date range"}</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-0" align="start" side="bottom" sideOffset={8} style={{ zIndex: 9999 }}>
                                      {isAdminElection ? (
                                        <Calendar
                                          mode="single"
                                          defaultMonth={adminLeaveDateRange?.from}
                                          selected={adminLeaveDateRange?.from}
                                          onSelect={handleAdminSingleDateSelect}
                                          disabled={(date) => date < new Date(1900, 0, 1)}
                                          initialFocus
                                        />
                                      ) : (
                                        <Calendar
                                          mode="range"
                                          defaultMonth={adminLeaveDateRange?.from}
                                          selected={adminLeaveDateRange}
                                          onSelect={(range) => {
                                            setAdminLeaveDateRange(range);
                                            if (range?.from && range?.to) setIsAdminDatePickerOpen(false);
                                          }}
                                          numberOfMonths={2}
                                          disabled={(date) => date < new Date(1900, 0, 1)}
                                          initialFocus
                                        />
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                  <FormDescription>
                                    {isAdminElection
                                      ? "Click to select the date of the election leave"
                                      : "Click to select start date, then click end date for range"}
                                  </FormDescription>
                                  <FormMessage className="text-red-500" />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={adminApplyLeaveForm.control}
                              name="durationType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration Type</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="— Select duration —" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {durationTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-red-500" />
                                </FormItem>
                              )}
                            />

                            {adminApplyLeaveForm.watch("durationType") === "half_day" && (
                              <FormField
                                control={adminApplyLeaveForm.control}
                                name="halfDaySegment"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Half Day Segment</FormLabel>
                                    <Select value={field.value || ""} onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="— Select segment —" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="first_half">First Half</SelectItem>
                                        <SelectItem value="second_half">Second Half</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage className="text-red-500" />
                                  </FormItem>
                                )}
                              />
                            )}

                            {adminLeaveValidationError && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{adminLeaveValidationError}</AlertDescription>
                              </Alert>
                            )}

                            <div className="flex gap-2 justify-end pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  adminApplyLeaveForm.reset({
                                    leaveType: "",
                                    startDate: undefined,
                                    endDate: undefined,
                                    durationType: "",
                                    halfDaySegment: "",
                                    bereavementRelationship: "",
                                    bereavementRelationshipOther: "",
                                    weddingCardImage: undefined,
                                    voterIdImage: undefined,
                                    examCourseName: "",
                                    examHallTicket: undefined,
                                    vipassanaDocuments: [],
                                  });
                                  setAdminLeaveDateRange(undefined);
                                  setAdminLeaveValidationError(null);
                                }}
                                disabled={
                                  adminApplLeaveSubmitting ||
                                  adminLeaveIsValidating
                                }
                              >
                                Reset
                              </Button>
                              <Button
                                type="submit"
                                disabled={
                                  adminApplLeaveSubmitting ||
                                  adminLeaveIsValidating ||
                                  !!adminLeaveValidationError
                                }
                              >
                                {adminApplLeaveSubmitting
                                  ? "Applying..."
                                  : adminLeaveIsValidating
                                    ? "Validating..."
                                    : "Apply Leave"}
                              </Button>
                            </div>
                          </div>

                          <div className="rounded-lg border border-border bg-background overflow-hidden">
                            <div className="px-3 py-2 border-b border-border bg-secondary-background">
                              <span className="text-sm font-medium text-foreground">Leave History</span>
                            </div>
                            <div className="overflow-x-auto">
                              <Table className="w-full min-w-[420px] text-sm">
                                <TableHeader>
                                  <TableRow className="border-b border-border bg-secondary-background">
                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</TableHead>
                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</TableHead>
                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {adminEmployeeHistory.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground">
                                        No leave history found for this employee.
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    adminEmployeeHistory.map((leave) => {
                                      const start = parseISO(leave.startDate);
                                      const end = parseISO(leave.endDate);
                                      const period =
                                        leave.startDate === leave.endDate
                                          ? format(start, "d MMM")
                                          : `${format(start, "d MMM")} - ${format(end, "d MMM")}`;

                                      return (
                                        <TableRow key={leave.id} className="border-b border-border last:border-0">
                                          <TableCell className="px-3 py-2.5 font-medium text-foreground">
                                            {getDisplayLeaveTypeName(leave.leaveType?.name ?? "-")}
                                          </TableCell>
                                          <TableCell className="px-3 py-2.5 text-muted-foreground">{period}</TableCell>
                                          <TableCell className="px-3 py-2.5 text-foreground">{formatTeamLeaveDuration(leave)}</TableCell>
                                          <TableCell className="px-3 py-2.5">{getStatusBadge(leave.state)}</TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}


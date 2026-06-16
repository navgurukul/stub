"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { CompOffRequestForm } from "./CompOffRequestForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import type {
  CompOffSummary,
  CreditsSummaryProps,
  CreditState,
  OffDayWorkGroupedUser,
  OffDayWorkPerson,
  OffDayWorkResponseItem,
  OffDayWorkRow,
  OffDayWorkScope,
  OffDayWorkTabOption,
  OffDayWorkTab,
} from "@/lib/compofftype";
import { ROLES } from "@/lib/rbac-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OffDayWorkTable } from "./OffDayWorkTable";

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const isDirectReporteeRow = (item: OffDayWorkResponseItem, managerId: number): boolean => {
  const user: OffDayWorkPerson | undefined = item.user;
  const employee: OffDayWorkPerson | undefined = item.employee;
  const explicitManagerId =
    toFiniteNumber(item.managerId) ??
    toFiniteNumber(user?.managerId) ??
    toFiniteNumber(employee?.managerId);

  if (explicitManagerId !== null) {
    return explicitManagerId === managerId;
  }
  return true;
};

const todayStart = startOfDay(new Date()).getTime();

const tabScope: Record<OffDayWorkTab, OffDayWorkScope> = {
  "my-off-day-work": "my",
  "my-reportees": "reportees",
  "all-org": "all",
};

const toText = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const extractSummary = (payload: unknown): CompOffSummary | null => {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  const compOffData = data["comp-off"] ?? data.compOff ?? data;

  if (compOffData && typeof compOffData === "object") {
    const summary = compOffData as Record<string, unknown>;
    return {
      total: toFiniteNumber(summary.total) ?? 0,
      active: toFiniteNumber(summary.active) ?? 0,
      availed: toFiniteNumber(summary.availed) ?? 0,
      expired: toFiniteNumber(summary.expired) ?? 0,
    };
  }

  return null;
};

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date && isValid(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValid(date)) return date;
  }
  const iso = parseISO(trimmed);
  if (isValid(iso)) return iso;

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
};

const formatDateDisplay = (value: unknown) => {
  const date = parseDateValue(value);
  return date ? format(date, "dd MMM yyyy") : "—";
};

const getDateTs = (value: unknown) => {
  const date = parseDateValue(value);
  return date ? date.getTime() : null;
};

const formatDurationValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    if (value === 1) return "Full Day";
    return `${value} Days`;
  }

  const raw = String(value).trim();
  if (!raw) return "—";
  const lower = raw.toLowerCase();
  if (lower.includes("full")) return "Full Day";
  if (lower.includes("half")) return "Half Day";
  return raw;
};

const formatHoursValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "Not yet";
  if (typeof value === "number") {
    return `${value} hrs`;
  }

  const raw = String(value).trim();
  if (!raw) return "Not yet";
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return `${parsed} hrs`;
  return raw;
};

const pickFormattedValue = (
  values: unknown[],
  formatter: (value: unknown) => string,
  fallback: string
) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const formatted = formatter(value);
    if (formatted !== "—" && formatted !== "Not yet") return formatted;
  }

  return fallback;
};

const normalizeState = (raw: OffDayWorkResponseItem): CreditState => {
  const status = toText(raw.state ?? raw.status ?? raw.creditStatus ?? raw.lifecycleState).toLowerCase().trim();
    const validStatuses: CreditState[] = ["pending", "granted", "availed", "expired", "partial_availed", "warning"];
  if (validStatuses.includes(status as CreditState)) {
    return status as CreditState;
  }
  // Default fallback if status is not recognized
  return "pending";
};

const normalizeRow = (raw: OffDayWorkResponseItem, index: number): OffDayWorkRow => {
  const user: OffDayWorkPerson | undefined = raw.user;
  const employee: OffDayWorkPerson | undefined = raw.employee;
  const employeeName =
    toText(raw.employeeName) ||
    toText(user?.name) ||
    toText(employee?.name) ||
    toText(raw.name) ||
    "—";
  const employeeEmail =
    toText(raw.employeeEmail) ||
    toText(user?.email) ||
    toText(employee?.email) ||
    "";

  const workDateSource = raw.workDate ?? raw.date ?? raw.work_date ?? raw.startDate ?? raw.creditDate ?? raw.creditedOn;
  const availedOnSource = raw.availedOn ?? raw.availedDate ?? raw.leaveTakenOn ?? raw.usedOn;
  const expiresOnSource = raw.expiresOn ?? raw.expiryDate ?? raw.expireDate ?? raw.expiryOn ?? raw.validUntil ?? raw.validTill;

  return {
    id: toText(raw.id, `${employeeEmail}-${index}`),
    employeeName,
    employeeEmail,
    workDate: formatDateDisplay(workDateSource),
    workDateTs: getDateTs(workDateSource),
    holidayType: toText(raw.holidayType) || toText(raw.holidayName) || toText(raw.workType) || "—",
    rmRequest: pickFormattedValue([raw.duration, raw.requestedDuration, raw.durationType], formatDurationValue, "—"),
    timesheet: pickFormattedValue([raw.timesheetHours, raw.timesheet, raw.hours], formatHoursValue, "Not yet"),
    credited: pickFormattedValue([raw.creditedHours, raw.credited, raw.creditHours], formatHoursValue, "Not yet"),
    availedOn: formatDateDisplay(availedOnSource),
    availedOnTs: getDateTs(availedOnSource),
    expiresOn: formatDateDisplay(expiresOnSource),
    expiresOnTs: getDateTs(expiresOnSource),
    state: normalizeState(raw),
  };
};

const flattenGroupedUsers = (users: unknown): OffDayWorkResponseItem[] => {
  if (!Array.isArray(users)) return [];

  return users.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const group = entry as OffDayWorkGroupedUser;
    const parentUser = (group.user && typeof group.user === "object" ? group.user : undefined) as OffDayWorkResponseItem | undefined;
    const credits = Array.isArray(group.credits) ? group.credits : [];

    return credits
      .filter((credit) => credit && typeof credit === "object")
      .map((credit) => ({
        ...credit,
        user: parentUser ?? (group as OffDayWorkResponseItem),
        employee: parentUser ?? (group as OffDayWorkResponseItem),
      }));
  });
};

const extractRows = (payload: unknown): OffDayWorkResponseItem[] => {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const groupedItems = flattenGroupedUsers((item as Record<string, unknown>).users);
      if (groupedItems.length > 0) return groupedItems;

      return [item as OffDayWorkResponseItem];
    });
  }

  if (!payload || typeof payload !== "object") return [];

  const data = payload as Record<string, unknown>;
  const groupedUsers = flattenGroupedUsers(data.users);
  if (groupedUsers.length > 0) return groupedUsers;

  const candidates = [
    data.data,
    data.rows,
    data.items,
    data.records,
    data.credits,
    data.compOffs,
    data.compOffCredits,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const candidateGrouped = flattenGroupedUsers(candidate);
      if (candidateGrouped.length > 0) return candidateGrouped;

      return candidate as OffDayWorkResponseItem[];
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedGrouped = flattenGroupedUsers(nested.users);
      if (nestedGrouped.length > 0) return nestedGrouped;

      const nestedCandidates = [nested.data, nested.rows, nested.items, nested.records, nested.credits];
      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) return nestedCandidate as OffDayWorkResponseItem[];
      }
    }
  }
  return [];
};

function CreditsSummary({ summary }: CreditsSummaryProps) {
  const cards = [
    { label: "Total", className: "offday-summary-card--total", value: summary?.total },
    { label: "Active", className: "offday-summary-card--active", value: summary?.active },
    { label: "Availed", className: "offday-summary-card--availed", value: summary?.availed },
    { label: "Expired", className: "offday-summary-card--expired", value: summary?.expired },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className={cn("offday-summary-card gap-0 rounded-lg py-0 transition-shadow hover:shadow-sm", card.className)}>
          <CardContent className="p-4">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</div>
              <div className="text-2xl font-semibold text-foreground">{card.value ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OffDayWorkDashboard() {
  const { user } = useAuth();
  const canUseTeamTabs = useRole([ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const canSeeAllOrg = useRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

  const [activeTab, setActiveTab] = useState<OffDayWorkTab>("my-off-day-work");
  const [requestOpen, setRequestOpen] = useState(false);

  const [summaryData, setSummaryData] = useState<CompOffSummary | null>(null);

  const [rowsByTab, setRowsByTab] = useState<Record<OffDayWorkTab, OffDayWorkRow[]>>({
    "my-off-day-work": [],
    "my-reportees": [],
    "all-org": [],
  });
  const [loadingByTab, setLoadingByTab] = useState<Record<OffDayWorkTab, boolean>>({
    "my-off-day-work": true,
    "my-reportees": false,
    "all-org": false,
  });
  const [errorByTab, setErrorByTab] = useState<Record<OffDayWorkTab, string | null>>({
    "my-off-day-work": null,
    "my-reportees": null,
    "all-org": null,
  });
  const [loadedByTab, setLoadedByTab] = useState<Record<OffDayWorkTab, boolean>>({
    "my-off-day-work": false,
    "my-reportees": false,
    "all-org": false,
  });

  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState<"all" | CreditState>("all");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamStatus, setTeamStatus] = useState<"all" | CreditState>("all");
  const [allSearch, setAllSearch] = useState("");
  const [allStatus, setAllStatus] = useState<"all" | CreditState>("all");

  const tabs = useMemo(() => {
    const items: OffDayWorkTabOption[] = [
      { value: "my-off-day-work", label: "My Off-Day Work Dashboard" },
    ];

    if (canUseTeamTabs) items.push({ value: "my-reportees", label: "My Reportees" });
    if (canSeeAllOrg) items.push({ value: "all-org", label: "All Org" });

    return items;
  }, [canSeeAllOrg, canUseTeamTabs]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await apiClient.get(API_PATHS.COMPOFF_MY);
      const summary = extractSummary(response.data);
      setSummaryData(summary);
    } catch (error) {
      setSummaryData(null);
    }
  }, []);

  const fetchTabRows = useCallback(
    async (tab: OffDayWorkTab) => {
      setLoadingByTab((prev) => ({ ...prev, [tab]: true }));
      setErrorByTab((prev) => ({ ...prev, [tab]: null }));

      try {
        const scope = tabScope[tab];
        const shouldRestrictToReportees = scope === "reportees";

        const apiPath = scope === "my" ? API_PATHS.COMPOFF_MY : API_PATHS.COMPOFF_ALL;

        const params =
          scope === "my"
            ? undefined
            : shouldRestrictToReportees && user?.id
              ? { managerId: user.id }
              : undefined;

        const response = await apiClient.get(apiPath, params ? { params } : undefined);

        const payloadRows = extractRows(response.data);
        const scopedRows =
          shouldRestrictToReportees && user?.id
            ? payloadRows.filter((item) => isDirectReporteeRow(item, Number(user.id)))
            : payloadRows;
        const rows = scopedRows.map((item, index) => normalizeRow(item, index));
        setRowsByTab((prev) => ({ ...prev, [tab]: rows }));
        setLoadedByTab((prev) => ({ ...prev, [tab]: true }));
      } catch (error) {
        console.error("Failed to load off-day work data", error);
        toast.error("Failed to load off-day work data", {
          description: "Unable to fetch comp-off credits. Please try again.",
        });
        setRowsByTab((prev) => ({ ...prev, [tab]: [] }));
        setErrorByTab((prev) => ({ ...prev, [tab]: "Unable to load data right now." }));
        setLoadedByTab((prev) => ({ ...prev, [tab]: true }));
      } finally {
        setLoadingByTab((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [user?.id]
  );

  useEffect(() => {
    void fetchTabRows(activeTab);
  }, [activeTab, fetchTabRows]);

  useEffect(() => {
    if (activeTab === "my-off-day-work") {
      void fetchSummary();
    }
  }, [activeTab, fetchSummary]);

  const handleRequestSuccess = useCallback(() => {
    setRequestOpen(false);
    void fetchTabRows(activeTab);
  }, [activeTab, fetchTabRows]);

  const headerAction =
    activeTab !== "my-off-day-work" && canUseTeamTabs ? (
      <Button size="sm" className="gap-1.5" onClick={() => setRequestOpen(true)}>
        <Plus className="h-4 w-4" />
        Raise Comp-Off Request
      </Button>
    ) : null;

  return (
    <>
      <AppHeader crumbs={[{ label: "Off Day Work" }]} right={headerAction} />
      <PageWrapper>
        <div className="min-h-[calc(100vh-4rem)] space-y-6 bg-background p-4 md:p-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Full visibility into every comp-off credit lifecycle.
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OffDayWorkTab)} className="w-full">
            <TabsList className="inline-flex h-auto items-center gap-1 rounded-lg border border-border bg-secondary-background p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    "text-muted-foreground hover:text-foreground",
                    "border border-transparent",
                    "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="my-off-day-work" className="mt-6 space-y-6">
              <CreditsSummary summary={summaryData} />
              <OffDayWorkTable
                rows={rowsByTab["my-off-day-work"]}
                showEmployee={false}
                searchValue={mySearch}
                onSearchValueChange={setMySearch}
                statusFilter={myStatus}
                onStatusFilterChange={setMyStatus}
                searchPlaceholder="Search by holiday  or date..."
                loading={loadingByTab["my-off-day-work"]}
                error={errorByTab["my-off-day-work"]}
              />
            </TabsContent>

            {canUseTeamTabs && (
              <TabsContent value="my-reportees" className="mt-6 space-y-4">
                <OffDayWorkTable
                  rows={rowsByTab["my-reportees"]}
                  showEmployee
                  searchValue={teamSearch}
                  onSearchValueChange={setTeamSearch}
                  statusFilter={teamStatus}
                  onStatusFilterChange={setTeamStatus}
                  searchPlaceholder="Search employee, holiday..."
                  loading={loadingByTab["my-reportees"]}
                  error={errorByTab["my-reportees"]}
                />
              </TabsContent>
            )}

            {canSeeAllOrg && (
              <TabsContent value="all-org" className="mt-6 space-y-4">
                <OffDayWorkTable
                  rows={rowsByTab["all-org"]}
                  showEmployee
                  searchValue={allSearch}
                  onSearchValueChange={setAllSearch}
                  statusFilter={allStatus}
                  onStatusFilterChange={setAllStatus}
                  searchPlaceholder="Search employee, holiday ..."
                  loading={loadingByTab["all-org"]}
                  error={errorByTab["all-org"]}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageWrapper>

      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[94vw] overflow-y-auto p-0 sm:max-w-[620px] md:w-[620px] lg:w-[620px] xl:w-[620px]"
        >
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-xl font-semibold">Raise Comp-Off Request</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Submit a compensatory off request for a reportee.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5">
            <CompOffRequestForm onSuccess={handleRequestSuccess} scope={tabScope[activeTab]} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
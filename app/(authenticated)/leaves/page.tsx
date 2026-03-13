"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Search, TreePalm, Clock, CheckCircle2, Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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
import { DataTable } from "./history/_components/data-table";
import { columns, type LeaveRequest as TeamLeaveRequest } from "./history/_components/columns";
import { LeaveTable } from "./history/_components/LeaveTable";
import { NewLeaveRequestDialog } from "./_components/NewLeaveRequestDialog";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: number;
  user: { id: number; name: string; email: string };
  managerId: number;
  leaveType: { id: number; name: string; code: string };
  state: "pending" | "approved" | "rejected";
  startDate: string;
  endDate: string;
  durationType: "full_day" | "half_day";
  halfDaySegment: "first_half" | "second_half" | null;
  hours: number;
  reason: string;
  requestedAt: string;
  updatedAt: string;
  decidedByUserId: number | null;
}

interface LeaveBalanceItem {
  id: number;
  leaveTypeId: number;
  balanceHours: number;
  pendingHours: number;
  bookedHours: number;
  allocatedHours: number;
  asOfDate: string;
  leaveType: {
    id: number;
    code: string;
    name: string;
    paid: boolean;
    requiresApproval: boolean;
  };
}

export default function LeavesPage() {
  const { user } = useAuth();

  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [teamLeaveHistory, setTeamLeaveHistory] = useState<TeamLeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [isBalancesLoading, setIsBalancesLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();

  const fetchBalances = useCallback(async () => {
    setIsBalancesLoading(true);
    try {
      const res = await apiClient.get(API_PATHS.LEAVES_BALANCES);
      setBalances(Array.isArray(res.data?.balances) ? res.data.balances : []);
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
  }, []);

  useEffect(() => {
    fetchBalances();
    fetchMyLeaves();
    fetchTeamLeaves();
  }, [fetchBalances, fetchMyLeaves, fetchTeamLeaves]);

  const handleNewRequestSuccess = useCallback(() => {
    fetchBalances();
    fetchMyLeaves();
  }, [fetchBalances, fetchMyLeaves]);

  // Summary stats from balances
  const summaryStats = useMemo(() => {
    const allocated = balances.reduce((sum, b) => sum + b.allocatedHours / 8, 0);
    const available = balances.reduce((sum, b) => sum + b.balanceHours / 8, 0);
    const pending = balances.reduce((sum, b) => sum + b.pendingHours / 8, 0);
    const approved = balances.reduce((sum, b) => sum + b.bookedHours / 8, 0);
    return {
      available: Math.round(available),
      allocated: Math.round(allocated),
      pending: Math.round(pending),
      approved: Math.round(approved),
    };
  }, [balances]);

  // Filtered leave requests
  const filteredLeaves = useMemo(() => {
    const fromStr = filterDateRange?.from ? format(filterDateRange.from, "yyyy-MM-dd") : "";
    const toStr = filterDateRange?.to ? format(filterDateRange.to, "yyyy-MM-dd") : (filterDateRange?.from ? format(filterDateRange.from, "yyyy-MM-dd") : "");
    return leaveHistory.filter((leave) => {
      const matchesSearch =
        !searchQuery ||
        leave.leaveType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || leave.state === statusFilter;
      const matchesFrom = !fromStr || leave.startDate >= fromStr;
      const matchesTo = !toStr || leave.endDate <= toStr;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [leaveHistory, searchQuery, statusFilter, filterDateRange]);

  // Team leaves by state
  const teamPending = useMemo(
    () => teamLeaveHistory.filter((l) => l.state === "pending"),
    [teamLeaveHistory]
  );
  const teamApproved = useMemo(
    () => teamLeaveHistory.filter((l) => l.state === "approved"),
    [teamLeaveHistory]
  );
  const teamRejected = useMemo(
    () => teamLeaveHistory.filter((l) => l.state === "rejected"),
    [teamLeaveHistory]
  );

  // Sorted balances (casual/wellness first)
  const sortedBalances = useMemo(() => {
    const priority = ["casual leave", "wellness leave"];
    return [...balances].sort((a, b) => {
      const aKey = (a.leaveType?.name || "").toLowerCase();
      const bKey = (b.leaveType?.name || "").toLowerCase();
      const ai = priority.findIndex((p) => aKey.includes(p));
      const bi = priority.findIndex((p) => bKey.includes(p));
      return (
        (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
        aKey.localeCompare(bKey)
      );
    });
  }, [balances]);

  const formatDays = (leave: LeaveRequest) => {
    const days = leave.hours / 8;
    return days <= 0.5 ? "0.5d" : `${Math.round(days)}d`;
  };

  const hasFilters = searchQuery || statusFilter !== "all" || filterDateRange;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFilterDateRange(undefined);
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

  const currentYear = new Date().getFullYear();
  const fyLabel = `FY ${currentYear - 1}–${String(currentYear).slice(-2)}`;

  const statCards = [
    {
      label: "Available",
      value: summaryStats.available,
      sub: "days remaining",
      icon: TreePalm,
      accent: "border-l-[#8a6f5e]",
      iconBg: "bg-[#f0ebe3]",
      iconColor: "text-[#8a6f5e]",
      valueColor: "text-[#4a5548]",
    },
    {
      label: "Allocated",
      value: summaryStats.allocated,
      sub: "total this year",
      icon: CalendarIcon,
      accent: "border-l-[#748074]",
      iconBg: "bg-[#e5eeea]",
      iconColor: "text-[#748074]",
      valueColor: "text-[#4a5548]",
    },
    {
      label: "Pending",
      value: summaryStats.pending,
      sub: "awaiting review",
      icon: Clock,
      accent: "border-l-amber-400",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
    {
      label: "Approved",
      value: summaryStats.approved,
      sub: `taken in ${fyLabel}`,
      icon: CheckCircle2,
      accent: "border-l-emerald-400",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
  ];

  return (
    <>
      <AppHeader crumbs={[{ label: "Leaves" }]} />
      <PageWrapper>
        <div className="p-4 md:p-6 space-y-6">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">Leave Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track and manage your time off</p>
            </div>
            <NewLeaveRequestDialog
              userEmail={user?.email ?? ""}
              onSuccess={handleNewRequestSuccess}
            />
          </div>

          <Tabs defaultValue="leaves" className="w-full">
            {/* Tab navigation — segmented pill style */}
            <TabsList className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary-background p-1 h-auto mb-6">
              {[
                { value: "leaves", label: "My Leaves" },
                { value: "balance", label: "Leave Balance" },
                { value: "team", label: "Team" },
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
                          {card.value}
                          <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search leave type or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background text-sm"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 gap-2 font-normal min-w-[200px] justify-start",
                        !filterDateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                      {filterDateRange?.from ? (
                        filterDateRange.to ? (
                          <>
                            {format(filterDateRange.from, "d MMM yyyy")}
                            {" — "}
                            {format(filterDateRange.to, "d MMM yyyy")}
                          </>
                        ) : (
                          format(filterDateRange.from, "d MMM yyyy")
                        )
                      ) : (
                        "Filter by date range"
                      )}
                      {filterDateRange?.from && (
                        <span
                          role="button"
                          className="ml-auto h-4 w-4 rounded-full flex items-center justify-center hover:bg-secondary-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterDateRange(undefined);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={filterDateRange?.from}
                      selected={filterDateRange}
                      onSelect={setFilterDateRange}
                      numberOfMonths={2}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px] bg-background text-foreground border-border text-sm">
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

              {/* Leave requests table */}
              <div className="rounded-lg border border-border overflow-hidden bg-background">
                <div className="px-4 py-3 border-b border-border bg-secondary-background flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Leave Requests</span>
                  {!isLoading && (
                    <span className="text-xs text-muted-foreground">
                      {filteredLeaves.length} {filteredLeaves.length === 1 ? "record" : "records"}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3.5">
                              <div className="h-4 bg-secondary-background rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <TreePalm className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No leave records found</p>
                            {hasFilters && (
                              <button onClick={clearFilters} className="text-xs text-foreground underline underline-offset-2">
                                Clear filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLeaves.map((leave, idx) => (
                        <tr
                          key={leave.id}
                          className="border-b border-border last:border-0 hover:bg-secondary-background/60 transition-colors"
                        >
                          <td className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-foreground">{leave.leaveType.name}</span>
                          </td>
                          <td className="px-4 py-3.5 text-foreground">
                            <span>{format(parseISO(leave.startDate), "d MMM yyyy")}</span>
                            {leave.startDate !== leave.endDate && (
                              <>
                                <span className="mx-1.5 text-muted-foreground">→</span>
                                <span>{format(parseISO(leave.endDate), "d MMM yyyy")}</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-md bg-secondary-background border border-border px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                              {formatDays(leave)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground max-w-[220px] truncate text-sm">
                            {leave.reason}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {getStatusBadge(leave.state)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </TabsContent>

            {/* ── LEAVE BALANCE TAB ── */}
            <TabsContent value="balance" className="mt-0">
              <div className="rounded-lg border border-border overflow-hidden bg-background">
                <div className="px-5 py-4 border-b border-border bg-secondary-background flex flex-wrap items-start gap-y-2 justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Leave Balance</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Allocated and remaining days for {fyLabel}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                      Healthy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                      Low
                    </span>
                  </div>
                </div>

                {isBalancesLoading ? (
                  <div className="p-5 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="h-4 w-40 bg-secondary-background rounded animate-pulse" />
                        <div className="h-4 flex-1 bg-secondary-background rounded animate-pulse" />
                        <div className="h-4 w-16 bg-secondary-background rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sortedBalances.map((balance) => {
                      const allocated = balance.allocatedHours / 8;
                      const remaining = balance.balanceHours / 8;
                      const pending = balance.pendingHours / 8;
                      const approved = balance.bookedHours / 8;
                      const pct = allocated > 0 ? Math.round((remaining / allocated) * 100) : 0;
                      const isLow = pct < 50;

                      return (
                        <div key={balance.id} className="px-5 py-4 hover:bg-secondary-background/40 transition-colors">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                            {/* Leave type name */}
                            <div className="flex items-center gap-2 sm:w-44 sm:flex-shrink-0">
                              <span className="text-sm font-medium text-foreground">{balance.leaveType.name}</span>
                              {balance.leaveType.paid && (
                                <span className="text-[10px] font-medium text-[#748074] bg-[#e5eeea] rounded px-1.5 py-0.5">Paid</span>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    isLow ? "bg-amber-400" : "bg-emerald-400"
                                  )}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 sm:gap-5 text-sm sm:flex-shrink-0">
                              <div className="text-center min-w-[2.5rem]">
                                <p className={cn("font-semibold tabular-nums", isLow ? "text-amber-600" : "text-emerald-600")}>
                                  {remaining}
                                </p>
                                <p className="text-[10px] text-muted-foreground">remaining</p>
                              </div>
                              <div className="text-center min-w-[2.5rem]">
                                <p className="font-medium text-foreground tabular-nums">{allocated}</p>
                                <p className="text-[10px] text-muted-foreground">allocated</p>
                              </div>
                              {pending > 0 && (
                                <div className="text-center min-w-[2.5rem]">
                                  <p className="font-medium text-amber-600 tabular-nums">{pending}</p>
                                  <p className="text-[10px] text-muted-foreground">pending</p>
                                </div>
                              )}
                              {approved > 0 && (
                                <div className="text-center min-w-[2.5rem]">
                                  <p className="font-medium text-muted-foreground tabular-nums">{approved}</p>
                                  <p className="text-[10px] text-muted-foreground">taken</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TEAM MANAGEMENT TAB ── */}
            <TabsContent value="team" className="mt-0">
              <Tabs defaultValue="pending" className="w-full">
                {/* Inner tab bar for team sub-tabs */}
                <div className="flex items-center gap-1 mb-5 border-b border-border">
                  {[
                    { val: "pending", label: "Pending", count: teamPending.length, activeColor: "data-[state=active]:text-amber-700 data-[state=active]:border-amber-500" },
                    { val: "approved", label: "Approved", count: teamApproved.length, activeColor: "data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-500" },
                    { val: "rejected", label: "Rejected", count: teamRejected.length, activeColor: "data-[state=active]:text-red-700 data-[state=active]:border-red-500" },
                  ].map(({ val, label, count, activeColor }) => (
                    <TabsList key={val} className="h-auto p-0 bg-transparent border-0 rounded-none">
                      <TabsTrigger
                        value={val}
                        className={cn(
                          "rounded-none px-4 pb-3 pt-1 text-sm font-medium bg-transparent shadow-none",
                          "border-b-2 border-transparent -mb-px",
                          "text-muted-foreground hover:text-foreground transition-colors",
                          "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                          activeColor
                        )}
                      >
                        {label}
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                            val === "pending" ? "bg-amber-50 text-amber-700" :
                            val === "approved" ? "bg-emerald-50 text-emerald-700" :
                            "bg-red-50 text-red-700"
                          )}
                        >
                          {count}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  ))}
                </div>

                <TabsContent value="pending" className="mt-0">
                  <DataTable
                    columns={columns}
                    data={teamPending}
                    onUpdate={fetchTeamLeaves}
                  />
                </TabsContent>
                <TabsContent value="approved" className="mt-0">
                  <LeaveTable
                    leaves={teamApproved}
                    isLoading={isTeamLoading}
                    showEmployee={true}
                  />
                </TabsContent>
                <TabsContent value="rejected" className="mt-0">
                  <LeaveTable
                    leaves={teamRejected}
                    isLoading={isTeamLoading}
                    showEmployee={true}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </PageWrapper>
    </>
  );
}

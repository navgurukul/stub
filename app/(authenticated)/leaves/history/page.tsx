"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

import { format, parseISO } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { API_PATHS } from "@/lib/constants";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { LeaveTable } from "./_components/LeaveTable";
import { DataTable } from "./_components/data-table";
import { columns } from "./_components/columns";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-role";
import { ROLES } from "@/lib/rbac-constants";

// TypeScript interfaces for API response
interface LeaveRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  managerId: number;
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
  state: "pending" | "approved" | "rejected";
  startDate: string;
  endDate: string;
  durationType: "full_day" | "half_day";
  halfDaySegment: "first_half" | "second_half" | null;
  hours: number;
  reason: string;
  // requestedAt: string;
  updatedAt: string;
  decidedByUserId: number | null;
}

export default function LeaveHistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [teamLeaveHistory, setTeamLeaveHistory] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [mainTab, setMainTab] = useState<string>("my-leaves");
  const isAdmin = useRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

  const fetchLeaveData = useCallback(
    async (
      endpoint: string,
      setData: (data: LeaveRequest[]) => void,
      setLoading: (loading: boolean) => void
    ) => {
      setLoading(true);
      try {
        const response = await apiClient.get(endpoint);
        const data = Array.isArray(response.data) ? response.data : [];
        setData(data);
      } catch (error) {
        console.error("Failed to load leave history", error);
        toast.error("Failed to load leave history", {
          description: "Unable to fetch leave requests. Please try again.",
        });
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch leave requests from API
  useEffect(() => {
    fetchLeaveData(
      API_PATHS.LEAVES_REQUESTS_GET,
      setLeaveHistory,
      setIsLoading
    );
  }, [fetchLeaveData]);

  // Fetch team leave requests from API
  useEffect(() => {
    fetchLeaveData(
      API_PATHS.LEAVES_TEAM_REQUESTS_GET,
      setTeamLeaveHistory,
      setIsTeamLoading
    );
  }, [fetchLeaveData]);

  // Refetch team leave requests after approval/rejection
  const refetchTeamLeaveRequests = useCallback(() => {
    fetchLeaveData(
      API_PATHS.LEAVES_TEAM_REQUESTS_GET,
      setTeamLeaveHistory,
      setIsTeamLoading
    );
  }, [fetchLeaveData]);

  // Export special leaves CSV
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const endpoint = isAdmin
        ? API_PATHS.LEAVES_TEAM_REQUESTS_GET
        : API_PATHS.LEAVES_REQUESTS_GET;

      const response = await apiClient.get(endpoint);
      const data = Array.isArray(response.data) ? response.data : [];

      const excluded = ["Wellness Leave", "Casual Leave"];

      let records = data.filter((rec: any) => !excluded.includes(rec.leaveType?.name));

      if (selectedMonth !== "all") {
        records = records.filter((rec: any) => {
          try {
            return format(parseISO(rec.startDate), "yyyy-MM") === selectedMonth;
          } catch (e) {
            return false;
          }
        });
      }

      if (!records.length) {
        toast("No special leaves found for the selected filters.");
        return;
      }

      const rows: string[][] = [];
      rows.push([
        "Employee Name",
        "Leave Type",
        "Leave Dates",
        "Category",
        "Reason",
        "Approval Status",
        "Approver Name",
        "Approval Date",
      ]);
      (window as any).__EXPORT_RECORDS = records;
      let localAuth: any = null;
      try {
        const raw = localStorage.getItem("AUTH") || localStorage.getItem("auth") || localStorage.getItem("user");
        localAuth = raw ? JSON.parse(raw) : null;
      } catch (e) {
      }

      const approverIdSet = new Set<number>();
      records.forEach((r: any) => {
        const id =
          r.decidedByUserId ??
          r.decided_by_user_id ??
          r.approverId ??
          r.approver_id ??
          r.decidedBy?.id ??
          null;
        if (id) approverIdSet.add(Number(id));
      });

      const approverMap: Record<number, string> = {};
      const localId = localAuth ? (localAuth.id ?? localAuth.userId ?? localAuth.user?.id) : null;
      if (localId) {
        approverMap[Number(localId)] = localAuth.name ?? localAuth.fullName ?? localAuth.email ?? "";
        approverIdSet.delete(Number(localId)); 
      }

      if (approverIdSet.size) {
        await Promise.all(
          Array.from(approverIdSet).map(async (id) => {
            try {
              const resp = await apiClient.get(`/users/${id}`); 
              const u = resp.data;
              approverMap[id] = u?.name || u?.fullName || u?.email || "";
            } catch {
              approverMap[id] = "";
            }
          })
        );
      }
      records.forEach((rec: any) => {
        const employeeName = rec.user?.name ?? rec.user?.fullName ?? rec.user?.email ?? "";
        const leaveType = rec.leaveType?.name ?? "";
        const start = rec.startDate ? format(parseISO(rec.startDate), "yyyy-MM-dd") : "";
        const end = rec.endDate ? format(parseISO(rec.endDate), "yyyy-MM-dd") : "";
        const leaveDates = start && end ? (start === end ? start : `${start} to ${end}`) : start || end || "";
        const category = rec.leaveType?.code ?? "";
        const reason = (rec.reason ?? "").replace(/\r?\n/g, " ");
        const approvalStatus =
          rec.state === "approved" ? "Approved" : rec.state === "rejected" ? "Rejected" : "Pending";
        const approverNameFromFields =
          rec.decidedBy?.name ||
          rec.decidedByName ||
          rec.decider?.name ||
          rec.approvedBy?.name ||
          rec.approvedByName ||
          rec.approverName ||
          rec.approver?.name ||
          "";
        const approverId =
          rec.decidedByUserId ??
          rec.decided_by_user_id ??
          rec.approverId ??
          rec.approver_id ??
          rec.decidedBy?.id ??
          null;
        let approverName = approverNameFromFields || (approverId ? approverMap[Number(approverId)] : "") || "";

        if (!approverName && approverId && localAuth) {
          const localId = localAuth.id ?? localAuth.userId ?? localAuth.user?.id;
          if (Number(localId) === Number(approverId)) {
            approverName = localAuth.name ?? localAuth.fullName ?? localAuth.email ?? "";
          }
        }

        const approvalDate = rec.updatedAt && rec.state !== "pending" ? format(parseISO(rec.updatedAt), "yyyy-MM-dd") : "";

        rows.push([
          employeeName,
          leaveType,
          leaveDates,
          category,
          reason,
          approvalStatus,
          approverName,
          approvalDate,
        ]);
      });
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `special-leaves-${selectedMonth === "all" ? "all" : selectedMonth}.csv`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Special leaves exported");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export special leaves. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [isAdmin, selectedMonth]);

  // Generate month options from both leave history and team leave history data
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    [...leaveHistory, ...teamLeaveHistory].forEach((record) => {
      const date = parseISO(record.startDate);
      const monthYear = format(date, "yyyy-MM");
      months.add(monthYear);
    });
    return Array.from(months)
      .sort()
      .reverse()
      .map((monthYear) => ({
        value: monthYear,
        label: format(parseISO(`${monthYear}-01`), "MMMM yyyy"),
      }));
  }, [leaveHistory, teamLeaveHistory]);

  // Generic filter function for leave records by selected month
  const filterLeavesByMonth = useCallback(
    (leaves: LeaveRequest[]) => {
      if (selectedMonth === "all") return leaves;

      return leaves.filter((record) => {
        const recordMonth = format(parseISO(record.startDate), "yyyy-MM");
        return recordMonth === selectedMonth;
      });
    },
    [selectedMonth]
  );

  // Filter leave records by selected month
  const filteredLeaves = useMemo(
    () => filterLeavesByMonth(leaveHistory),
    [leaveHistory, filterLeavesByMonth]
  );

  // Filter team leave records by selected month
  const filteredTeamLeaves = useMemo(
    () => filterLeavesByMonth(teamLeaveHistory),
    [teamLeaveHistory, filterLeavesByMonth]
  );

  // Generic function to separate leaves by state
  const separateLeavesByState = useCallback((leaves: LeaveRequest[]) => {
    return {
      pending: leaves.filter((leave) => leave.state === "pending"),
      approved: leaves.filter((leave) => leave.state === "approved"),
      rejected: leaves.filter((leave) => leave.state === "rejected"),
    };
  }, []);

  // Separate leaves by state (client-side split)
  const {
    pending: pendingLeaves,
    approved: approvedLeaves,
    rejected: rejectedLeaves,
  } = useMemo(
    () => separateLeavesByState(filteredLeaves),
    [filteredLeaves, separateLeavesByState]
  );

  // Separate team leaves by state
  const {
    pending: teamPendingLeaves,
    approved: teamApprovedLeaves,
    rejected: teamRejectedLeaves,
  } = useMemo(
    () => separateLeavesByState(filteredTeamLeaves),
    [filteredTeamLeaves, separateLeavesByState]
  );

  return (
    <>
      <AppHeader
        crumbs={[{ label: "Leave History" }]}
      />
      <PageWrapper>
        <Card className="mx-auto min-w-[120px] sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl overflow-x-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">Leave History</CardTitle>
                <p className="text-muted-foreground text-sm">
                  View and manage your historical leave requests and their
                  status.
                </p>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <div className="mt-2">
                    <Button onClick={handleExport} disabled={isExporting}>
                      Special Leaves Export
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <TabsList>
                <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
                <TabsTrigger value="team-management">
                  Team Management
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-leaves" className="mt-4">
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">
                      Pending ({pendingLeaves.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      Approved ({approvedLeaves.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      Rejected ({rejectedLeaves.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="mt-4">
                    <LeaveTable leaves={pendingLeaves} isLoading={isLoading} />
                  </TabsContent>
                  <TabsContent value="approved" className="mt-4">
                    <LeaveTable leaves={approvedLeaves} isLoading={isLoading} />
                  </TabsContent>
                  <TabsContent value="rejected" className="mt-4">
                    <LeaveTable leaves={rejectedLeaves} isLoading={isLoading} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="team-management" className="mt-4">
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">
                      Pending ({teamPendingLeaves.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      Approved ({teamApprovedLeaves.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      Rejected ({teamRejectedLeaves.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="mt-4">
                    <DataTable
                      columns={columns}
                      data={teamPendingLeaves}
                      onUpdate={refetchTeamLeaveRequests}
                    />
                  </TabsContent>
                  <TabsContent value="approved" className="mt-4">
                    <LeaveTable
                      leaves={teamApprovedLeaves}
                      isLoading={isTeamLoading}
                    />
                  </TabsContent>
                  <TabsContent value="rejected" className="mt-4">
                    <LeaveTable
                      leaves={teamRejectedLeaves}
                      isLoading={isTeamLoading}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageWrapper>
    </>
  );
}

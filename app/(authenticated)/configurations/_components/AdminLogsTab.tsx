"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, AlertTriangle, ShieldAlert, X, ChevronDown, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoadingState } from "@/components/ui/table-loading-state";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { AuditLog } from "@/lib/config";
import { AppPagination } from "@/components/ui/app-pagination";

export function AdminLogsTab() {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<number, { name: string; email: string }>>({});

  // Filters & Pagination State
  const [adminEmailSearch, setAdminEmailSearch] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const ALL_ACTION_TYPES = [
    "role_assigned",
    "role_updated",
    "role_revoked",
    "project_created",
    "project_edited",
    "project_status_changed",
    "timesheet_deleted",
    "timesheet_created",
    "timesheet_edited",
    "leave_applied",
    "leave_balance_allocated_updated",
    "leave_modified",
    "leave_deleted",
    "comp_off_modified",
  ];

  const availableActionTypes = useMemo(() => {
    const set = new Set<string>();
    ALL_ACTION_TYPES.forEach((a) => set.add(a));
    logs.forEach((log) => {
      if (log.action) {
        set.add(log.action);
      }
    });
    return Array.from(set);
  }, [logs]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        if (!currentUser?.orgId) return;
        const response = await apiClient.get(API_PATHS.USERS_ROLE, {
          params: { limit: 1000 },
        });
        const list = Array.isArray(response.data?.data) ? response.data.data : [];
        const map: Record<number, { name: string; email: string }> = {};
        list.forEach((u: any) => {
          const id = u.id || u.userId;
          if (id) {
            map[id] = { name: u.name, email: u.email };
          }
        });
        setUsersMap(map);
      } catch (err) {
        console.error("Error fetching users for logs mapping:", err);
      }
    };
    fetchAllUsers();
  }, [currentUser]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(API_PATHS.AUDIT_LOGS, {
        params: { limit: 1000 },
      });

      if (response.data) {
        const rawData = response.data;
        let list: any[] = [];

        if (Array.isArray(rawData)) {
          list = rawData;
        } else if (rawData && Array.isArray(rawData.data)) {
          list = rawData.data;
        }

        setLogs(list);
      }
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      const msg = err.response?.data?.message || err.message || "Failed to fetch audit logs.";
      setError(msg);
      toast.error("Failed to load admin logs", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Action type filter (multi-select)
      if (selectedActions.length > 0 && !selectedActions.includes(log.action)) {
        return false;
      }
      const actorEmail = (log.performedBy || log.actor)?.email || "";
      if (adminEmailSearch && !actorEmail.toLowerCase().includes(adminEmailSearch.toLowerCase())) {
        return false;
      }
      // 3. Date range filter
      if (fromDate) {
        const logDate = new Date(log.createdAt).getTime();
        const fromTime = fromDate.getTime();
        if (logDate < fromTime) return false;
      }
      if (toDate) {
        const logDate = new Date(log.createdAt).getTime();
        const toTime = toDate.getTime() + 86400000;
        if (logDate > toTime) return false;
      }
      return true;
    });
  }, [logs, selectedActions, adminEmailSearch, fromDate, toDate]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((page - 1) * limit, page * limit);
  }, [filteredLogs, page, limit]);

  const total = filteredLogs.length;
  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  const formatActionName = (action?: string) => {
    if (!action) return "SYSTEM EVENT";
    const lower = action.toLowerCase();
    if (lower === "role_assigned" || lower === "role assigned") return "Role Assigned";
    if (lower === "role_updated" || lower === "role updated" || lower === "role_modified" || lower === "role modified") return "Role Updated";
    if (lower === "role_revoked" || lower === "role revoked" || lower === "role_deleted" || lower === "role deleted") return "Role Revoked";
    if (lower === "project_created" || lower === "project created") return "Project Created";
    if (lower === "project_edited" || lower === "project edited" || lower === "project_modified" || lower === "project modified") return "Project Edited";
    if (lower === "project_status_changed" || lower === "project status changed") return "Project Status Changed";

    const clean = action.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return clean;
  };

  // Helper for action badge colors
  const getActionBadgeStyle = (action?: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("ADD")) {
      return "bg-[var(--color-green-bg)] text-[var(--color-green-text)] border-[var(--color-green-text)]/30 hover:bg-[var(--color-green-bg)]";
    }
    if (act.includes("DELETE") || act.includes("REVOKE") || act.includes("REJECT")) {
      return "bg-[var(--color-red-bg)] text-[var(--color-red-text)] border-[var(--color-red-text)]/30 hover:bg-[var(--color-red-bg)]";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PATCH")) {
      return "bg-[var(--color-orange-bg)] text-[var(--color-orange-text)] border-[var(--color-orange-text)]/30 hover:bg-[var(--color-orange-bg)]";
    }
    if (act.includes("SYNC")) {
      return "bg-[var(--color-purple-bg)] text-[var(--color-purple-text)] border-[var(--color-purple-text)]/30 hover:bg-[var(--color-purple-bg)]";
    }
    return "bg-[var(--color-blue-bg)] text-[var(--color-blue-text)] border-[var(--color-blue-text)]/30 hover:bg-[var(--color-blue-bg)]";
  };

  // Helper to format prev/next states into clean text (non-JSON format)
  const formatStateText = (state: any) => {
    if (!state) return "None";
    if (typeof state !== "object") return String(state);
    const entries = Object.entries(state);
    if (entries.length === 0) return "None";
    return entries
      .map(([k, v]) => {
        const cleanKey = k.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${cleanKey}: ${valStr}`;
      })
      .join("\n");
  };



  const getTargetEmail = (log: AuditLog) => {
    const target = log.targetUser || (log.targetUserId ? usersMap[log.targetUserId] : null);
    return (target && typeof target === "object" && "email" in target)
      ? target.email
      : (log.targetUserId ? `User ID: ${log.targetUserId}` : "—");
  };

  const formatStatePreview = (state: any) => {
    if (!state) return "—";
    if (typeof state !== "object") return String(state);
    const entries = Object.entries(state);
    if (entries.length === 0) return "—";
    if (entries.length === 1) {
      return `${entries[0][0]}: ${entries[0][1]}`;
    }
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  };


  return (
    <Card className="w-full border-2 border-border rounded-base bg-background shadow-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Admin Logs</CardTitle>
        <CardDescription>
          View system-wide activity, change tracking, and audit logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Panel */}
        <div className="flex flex-wrap items-center gap-3 pb-2">
          {/* Admin Email Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Filter by admin email..."
              value={adminEmailSearch}
              onChange={(e) => {
                setAdminEmailSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9 rounded-lg border border-[#e4e4e7] bg-[#f9f9fb] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#a1a1aa] h-9 w-full text-sm"
            />
            {adminEmailSearch && (
              <button
                onClick={() => {
                  setAdminEmailSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Action Type Multi-Select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center justify-between gap-2 border border-[#e4e4e7] bg-white text-neutral-900 hover:bg-neutral-50 h-9 rounded-lg text-sm px-3">
                <span>
                  {selectedActions.length === 0
                    ? "All Action Types"
                    : `Filter Actions (${selectedActions.length})`}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-white border border-[#e4e4e7] rounded-lg shadow-md z-50">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 rounded cursor-pointer border-b border-neutral-100 pb-2 mb-1"
                  onClick={() => {
                    setSelectedActions([]);
                    setPage(1);
                  }}
                >
                  <Checkbox
                    checked={selectedActions.length === 0}
                    onCheckedChange={() => { }}
                  />
                  <span className="text-xs font-semibold text-neutral-900">All Action Types</span>
                </div>
                {availableActionTypes.map((act) => {
                  const isChecked = selectedActions.includes(act);
                  return (
                    <div
                      key={act}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 rounded cursor-pointer"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedActions(selectedActions.filter((x) => x !== act));
                        } else {
                          setSelectedActions([...selectedActions, act]);
                        }
                        setPage(1);
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => { }}
                      />
                      <span className="text-xs font-medium text-neutral-700">{formatActionName(act)}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* From Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 min-w-[120px] justify-start text-sm font-normal border border-[#e4e4e7] bg-white rounded-lg px-3 hover:bg-neutral-50 ${
                  !fromDate ? "text-neutral-500" : "text-neutral-900"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-neutral-400" />
                {fromDate ? format(fromDate, "d MMM yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-[#e4e4e7] rounded-lg shadow-md z-50 bg-white" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => {
                  setFromDate(date);
                  setPage(1);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* To Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 min-w-[120px] justify-start text-sm font-normal border border-[#e4e4e7] bg-white rounded-lg px-3 hover:bg-neutral-50 ${
                  !toDate ? "text-neutral-500" : "text-neutral-900"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-neutral-400" />
                {toDate ? format(toDate, "d MMM yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-[#e4e4e7] rounded-lg shadow-md z-50 bg-white" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => {
                  setToDate(date);
                  setPage(1);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear/Reset Button */}
          {(adminEmailSearch || selectedActions.length > 0 || fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdminEmailSearch("");
                setSelectedActions([]);
                setFromDate(undefined);
                setToDate(undefined);
                setPage(1);
              }}
              className="text-neutral-500 hover:text-neutral-800 text-xs px-2 h-9"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <TableLoadingState
              columns={[
                { header: "", skeletonWidth: "w-4" },
                { header: "Timestamp", skeletonWidth: "w-40" },
                { header: "Admin email", skeletonWidth: "w-44" },
                { header: "Action type", skeletonWidth: "w-32" },
                { header: "Target", skeletonWidth: "w-44" },
                { header: "Before", skeletonWidth: "w-32" },
                { header: "After", skeletonWidth: "w-32" },
              ]}
              rowCount={8}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-200 rounded-base bg-red-50 text-red-700">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-bold">Error Loading Logs</p>
            <p className="text-sm mt-1 text-center max-w-md">{error}</p>
            <Button size="sm" className="mt-4" onClick={fetchLogs}>
              Retry
            </Button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-base bg-background/50 text-center">
            <ShieldAlert className="h-10 w-10 text-muted mb-2" />
            <h3 className="text-lg font-bold">No administrative actions recorded yet.</h3>
          </div>
        ) : (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary-background">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-bold text-foreground">Timestamp</TableHead>
                  <TableHead className="font-bold text-foreground">Admin email</TableHead>
                  <TableHead className="font-bold text-foreground">Action type</TableHead>
                  <TableHead className="font-bold text-foreground">Target</TableHead>
                  <TableHead className="font-bold text-foreground">Before</TableHead>
                  <TableHead className="font-bold text-foreground">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const actor = log.performedBy || log.actor;
                  const adminEmail = actor?.email || "System";
                  const targetEmail = getTargetEmail(log);

                  return (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="hover:bg-secondary-background/50 cursor-pointer"
                        onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                            className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-neutral-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-neutral-500" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.createdAt ? (
                            <>
                              <div className="font-medium">
                                {new Date(log.createdAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{adminEmail}</TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeStyle(log.action)}>
                            {formatActionName(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>{targetEmail}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={formatStatePreview(log.prev)}>
                          {formatStatePreview(log.prev)}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate" title={formatStatePreview(log.next)}>
                          {formatStatePreview(log.next)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50">
                          <TableCell colSpan={7} className="p-4 border-t border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  Before State (Prev)
                                </div>
                                <div className="p-3 bg-white border border-border rounded-lg text-xs font-sans overflow-auto max-h-60 shadow-sm whitespace-pre-wrap text-neutral-800 leading-relaxed">
                                  {formatStateText(log.prev)}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  After State (Next)
                                </div>
                                <div className="p-3 bg-white border border-border rounded-lg text-xs font-sans overflow-auto max-h-60 shadow-sm whitespace-pre-wrap text-neutral-800 leading-relaxed">
                                  {formatStateText(log.next)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <AppPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          loading={loading}
          itemLabel="log"
          itemLabelPlural="logs"
        />
      </CardContent>
    </Card>
  );
}

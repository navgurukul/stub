"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, AlertTriangle, ShieldCheck, UserMinus, ShieldAlert, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableLoadingState } from "@/components/ui/table-loading-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { AppPagination } from "@/components/ui/app-pagination";

import { RoleUser } from "@/lib/config";

export function RoleManagementTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [assigningUser, setAssigningUser] = useState<RoleUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const [sortField, setSortField] = useState<string>("email");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [revokingUser, setRevokingUser] = useState<RoleUser | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isConfirmAssignOpen, setIsConfirmAssignOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-neutral-400/70" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-neutral-900" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-neutral-900" />
    );
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
        sortBy: sortField,
        sortOrder: sortOrder,
      };

      if (searchTerm) {
        params.q = searchTerm;
        params.search = searchTerm;
      }

      const response = await apiClient.get(API_PATHS.USERS_ROLE, { params });

      if (response.data) {
        const list = Array.isArray(response.data.data) ? response.data.data : [];
        const sortedList = [...list].sort((a, b) => {
          let valA: string | number = "";
          let valB: string | number = "";

          switch (sortField) {
            case "id": {
              const numA = Number(a.id ?? a.userId ?? 0);
              const numB = Number(b.id ?? b.userId ?? 0);
              return sortOrder === "asc" ? numA - numB : numB - numA;
            }
            case "name":
              valA = a.name || "";
              valB = b.name || "";
              break;
            case "email":
              valA = a.email || "";
              valB = b.email || "";
              break;
            case "department":
              valA = a.employeeDepartment?.name || a.department || "";
              valB = b.employeeDepartment?.name || b.department || "";
              break;
            case "manager":
              valA = a.manager?.name || a.managerName || a.reportingManager || "";
              valB = b.manager?.name || b.managerName || b.reportingManager || "";
              break;
            case "role":
              valA = a.role || "";
              valB = b.role || "";
              break;
            case "assignedBy":
              valA = a.assignedBy || a.assignedByName || "";
              valB = b.assignedBy || b.assignedByName || "";
              break;
            case "lastUpdated":
              valA = a.lastUpdated || a.updatedAt || "";
              valB = b.lastUpdated || b.updatedAt || "";
              const dateA = valA ? new Date(valA).getTime() : 0;
              const dateB = valB ? new Date(valB).getTime() : 0;
              return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            default:
              return 0;
          }

          return sortOrder === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        });
        setUsers(sortedList);
        setTotal(Number(response.data.total) || list.length);
      }
    } catch (err: any) {
      console.error("Error fetching user roles:", err);
      const msg = err.response?.data?.message || err.message || "Failed to fetch user roles.";
      setError(msg);
      toast.error("Failed to load users", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, sortField, sortOrder, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, isMounted]);

  // Sync PnC Database
  const handleSyncPnc = async () => {
    setIsSyncing(true);
    try {
      await apiClient.post(API_PATHS.SYNC_GOOGLE_SHEET);
      toast.success("PnC Database Synced", {
        description: "Successfully synchronized user profiles from PnC records.",
      });
      fetchUsers();
    } catch (err: any) {
      console.error("PnC sync error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to sync database.";
      toast.error("Sync failed", { description: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  const executeRoleChange = async (userId: number | undefined, role: string, isRevocation = false) => {
    if (!userId) {
      toast.error("Action failed", { description: "User ID is missing." });
      return;
    }
    setIsSubmitting(true);
    try {
      const endpoint = API_PATHS.ADMIN_USER_ROLE.replace("{userId}", String(userId));
      const payload = {
        role: role.toLowerCase(),
      };

      await apiClient.patch(endpoint, payload);

      toast.success(isRevocation ? "Role Revoked" : "Role Assigned", {
        description: `Successfully updated role to ${formatRoleName(role)}.`,
      });

      setIsAssignOpen(false);
      setIsConfirmAssignOpen(false);
      setIsRevokeOpen(false);
      setAssigningUser(null);
      setRevokingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Error updating user role:", err);
      const msg = err.response?.data?.message || err.message || "Failed to update role.";
      toast.error("Action failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatRoleName = (role?: string) => {
    if (!role) return "Employee";
    const clean = role.toLowerCase().replace(/_/g, " ");
    return clean.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getRoleBadgeStyle = (role?: string) => {
    const norm = (role || "").toLowerCase();
    if (norm === "super_admin" || norm === "superadmin") {
      return "bg-[var(--color-pink-bg)] text-[var(--color-pink-text)] border-[var(--color-pink-text)]/30 hover:bg-[var(--color-pink-bg)]";
    }
    if (norm === "admin") {
      return "bg-[var(--color-orange-bg)] text-[var(--color-orange-text)] border-[var(--color-orange-text)]/30 hover:bg-[var(--color-orange-bg)]";
    }
    if (norm === "manager") {
      return "bg-[var(--color-blue-bg)] text-[var(--color-blue-text)] border-[var(--color-blue-text)]/30 hover:bg-[var(--color-blue-bg)]";
    }
    return "bg-[var(--color-gray-bg)] text-[var(--color-gray-text)] border-[var(--color-gray-text)]/30 hover:bg-[var(--color-gray-bg)]";
  };

  const isRoleElevated = (role?: string) => {
    const norm = (role || "").toLowerCase();
    return norm === "admin" || norm === "super_admin" || norm === "manager";
  };

  return (
    <Card className="w-full border-2 border-border rounded-base bg-background shadow-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Role Management</CardTitle>
        <CardDescription>
          Search employees, assign specific permissions, and manage roles within the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Panel */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9 rounded-lg border border-[#e4e4e7] bg-[#f9f9fb] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#a1a1aa] h-10 w-full"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSyncPnc}
            disabled={isSyncing}
            className="flex-shrink-0 h-10 border border-[#e4e4e7] rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
          >
            {isSyncing ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync with PnC Database
          </Button>
        </div>

        {/* Roles Table */}
        {loading ? (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <TableLoadingState
              columns={[
                { header: "User ID", skeletonWidth: "w-16" },
                { header: "Name", skeletonWidth: "w-32" },
                { header: "Email", skeletonWidth: "w-44" },
                { header: "Department", skeletonWidth: "w-24" },
                { header: "Reporting Manager", skeletonWidth: "w-32" },
                { header: "Current Role", skeletonWidth: "w-20" },
                { header: "Assigned By", skeletonWidth: "w-20" },
                { header: "Last Updated", skeletonWidth: "w-24" },
                { header: "Actions", skeletonWidth: "w-20" },
              ]}
              rowCount={8}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-200 rounded-base bg-red-50 text-red-700">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-bold">Error Loading Data</p>
            <p className="text-sm mt-1 text-center max-w-md">{error}</p>
            <Button size="sm" className="mt-4" onClick={fetchUsers}>
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-base bg-background/50 text-center">
            <ShieldAlert className="h-10 w-10 text-muted mb-2" />
            <h3 className="text-lg font-bold">No Users Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn't find any users matching your criteria. Try adjusting your search query.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary-background">
                <TableRow>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center">
                      <span>User ID</span>
                      {renderSortIcon("id")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      <span>Name</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      <span>Email</span>
                      {renderSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center">
                      <span>Department</span>
                      {renderSortIcon("department")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("manager")}
                  >
                    <div>
                      <div className="flex items-center">
                        <span>Reporting Manager</span>
                        {renderSortIcon("manager")}
                      </div>
                      <div className="text-[10px] font-normal text-muted-foreground block -mt-0.5">Synced from PnC sheet</div>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center">
                      <span>Current Role</span>
                      {renderSortIcon("role")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("assignedBy")}
                  >
                    <div className="flex items-center">
                      <span>Assigned By</span>
                      {renderSortIcon("assignedBy")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-foreground cursor-pointer select-none hover:bg-neutral-100/50 transition-colors"
                    onClick={() => handleSort("lastUpdated")}
                  >
                    <div className="flex items-center">
                      <span>Last Updated</span>
                      {renderSortIcon("lastUpdated")}
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => {
                  const initials = getInitials(item.name);
                  const isSelf = currentUser && currentUser.id === (item.id || item.userId);
                  const canRevoke = isRoleElevated(item.role) && !isSelf;

                  return (
                    <TableRow key={item.id || item.userId} className="hover:bg-secondary-background/50">
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.id || item.userId || "—"}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-foreground text-background text-xs font-bold border border-border">
                            {initials}
                          </div>
                          <span>{item.name} {isSelf && <span className="text-[10px] text-muted-foreground font-normal">(You)</span>}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.employeeDepartment?.name || item.department || "—"}</TableCell>
                      <TableCell>
                        {item.manager?.name || item.managerName || item.reportingManager ? (
                          <span className="font-medium">{item.manager?.name || item.managerName || item.reportingManager}</span>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-50 flex items-center gap-1.5 w-fit font-medium">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>No manager assigned</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.role ? (
                          <Badge className={getRoleBadgeStyle(item.role)}>
                            {formatRoleName(item.role)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{item.assignedBy || item.assignedByName || "—"}</TableCell>
                      <TableCell>
                        {item.lastUpdated || item.updatedAt
                          ? new Date(item.lastUpdated || item.updatedAt!).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setAssigningUser(item);
                              setSelectedRole((item.role || "EMPLOYEE").toUpperCase());
                              setIsAssignOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Assign Role</span>
                          </Button>
                          {canRevoke && (
                            <Button
                              size="xs"
                              variant="neutral"
                              onClick={() => {
                                setRevokingUser(item);
                                setIsRevokeOpen(true);
                              }}
                              className="text-red-600 hover:bg-red-50 border-red-200 flex items-center gap-1"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Revoke</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
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
          itemLabel="user"
          itemLabelPlural="users"
        />

        {/* Dialog: Assign Role */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-base border-2 border-border shadow-shadow bg-background text-foreground">
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>
                Select a new system access level for <strong>{assigningUser?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">User Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="border-2 border-border rounded-[4px] bg-background text-foreground">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-border rounded-[4px] bg-background text-foreground">
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="neutral" onClick={() => setIsAssignOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (selectedRole.toLowerCase() === assigningUser?.role?.toLowerCase()) {
                    setIsAssignOpen(false);
                    return;
                  }
                  setIsConfirmAssignOpen(true);
                }}
                disabled={isSubmitting}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Confirmation Assign */}
        <Dialog open={isConfirmAssignOpen} onOpenChange={setIsConfirmAssignOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-base border-2 border-border shadow-shadow bg-background text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Confirm Role Assignment
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to update the role of <strong>{assigningUser?.name}</strong> to <strong>{formatRoleName(selectedRole)}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="neutral" onClick={() => setIsConfirmAssignOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => assigningUser && executeRoleChange(assigningUser.id || assigningUser.userId, selectedRole, false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner className="mr-2" /> : null}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Confirm Revoke */}
        <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-base border-2 border-border shadow-shadow bg-background text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <UserMinus className="h-5 w-5" /> Revoke Permissions
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke elevated administrative privileges for <strong>{revokingUser?.name}</strong>?
                This will demote their role to <strong>Employee</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="neutral" onClick={() => setIsRevokeOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => revokingUser && executeRoleChange(revokingUser.id || revokingUser.userId, "EMPLOYEE", true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner className="mr-2" /> : null}
                Revoke Privileges
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

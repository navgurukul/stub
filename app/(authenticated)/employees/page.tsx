"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { RoleGate } from "@/app/_components/RoleGate";
import { ROLES } from "@/lib/rbac-constants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import {
  EmployeeFilters,
  EmployeesTable,
  EmptyState,
  LoadingState,
  Employee,
} from "./_components";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { AppPagination } from "@/components/ui/app-pagination";

interface EmployeesResponse {
  data: Employee[];
  page: number;
  limit: number;
  total: number;
}

export default function EmployeeDatabasePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [managerFilter, setManagerFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch employees from API
  useEffect(() => {
    if (authLoading) return;
    fetchEmployees();
  }, [page, managerFilter, searchTerm, user?.orgId, authLoading]);

  const fetchEmployees = async (): Promise<void> => {
    if (authLoading) return;

    if (!user?.orgId) {
      toast.error("Organization ID not found", {
        description: "Please sign in again or contact admin.",
      });
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        orgId: user.orgId,
        page,
        limit,
      };

      if (managerFilter !== "all") {
        params.managerId = parseInt(managerFilter);
      }

      if (searchTerm) {
        params.q = searchTerm;
      }

      const response = await apiClient.get<EmployeesResponse>(
        API_PATHS.EMPLOYEES,
        { params }
      );

      if (response.data) {
        const employeesData = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setEmployees(employeesData);
        setTotal(response.data.total || 0);

        console.log("Employees fetched successfully:", employeesData.length);
      }
    } catch (error: unknown) {
      console.error("Error fetching employees:", error);
      const errorMessage =
        (
          error as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        ).response?.data?.message ||
        (error as { message?: string }).message ||
        "Failed to fetch employees. Please try again.";
      toast.error("Failed to load employees", {
        description: errorMessage,
      });
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (): void => {
    setSearchTerm(searchInput);
    setPage(1); // Reset to first page on new search
  };

  const handleSearchKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = (): void => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  const handleManagerFilterChange = (value: string): void => {
    setManagerFilter(value);
    setPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (newPage: number): void => {
    setPage(newPage);
  };

  const handleSyncGoogleSheet = async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const response = await apiClient.post(API_PATHS.SYNC_GOOGLE_SHEET);

      toast.success("Google Sheet data synced successfully!", {
        description: "Employee data has been synchronized with the database.",
      });

      // Refresh the employee list after successful sync
      await fetchEmployees();
    } catch (error: unknown) {
      console.error("Error syncing Google Sheet data:", error);
      const errorMessage =
        (
          error as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        ).response?.data?.message ||
        (error as { message?: string }).message ||
        "Failed to sync Google Sheet data. Please try again.";
      toast.error("Sync failed", {
        description: errorMessage,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;


  return (
    <>
      <AppHeader
        crumbs={[
          { label: "Employee Database" },
        ]}
      />
      <PageWrapper>
        <div className="flex w-full justify-center p-4">
          <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-4xl xl:max-w-6xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    Employee Database
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Search and view employee information across your
                    organization
                  </CardDescription>
                </div>
                <RoleGate requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} hideOnUnauthorized>
                  <Button
                    variant="noShadow"
                    onClick={handleSyncGoogleSheet}
                    disabled={isSyncing || loading}
                    className="shrink-0"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        isSyncing ? "animate-spin" : ""
                      }`}
                    />
                    {isSyncing ? "Syncing..." : "Sync Google Sheet Data"}
                  </Button>
                </RoleGate>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Filter Controls */}
                <EmployeeFilters
                  searchInput={searchInput}
                  onSearchInputChange={setSearchInput}
                  onSearch={handleSearch}
                  onClearSearch={handleClearSearch}
                  onSearchKeyPress={handleSearchKeyPress}
                  managerFilter={managerFilter}
                  onManagerFilterChange={handleManagerFilterChange}
                />

                {/* Employees Table */}
                {loading ? (
                  <LoadingState />
                ) : employees.length === 0 ? (
                  <EmptyState />
                ) : (
                  <EmployeesTable employees={employees} />
                )}

                <AppPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  limit={limit}
                  onPageChange={handlePageChange}
                  loading={loading}
                  itemLabel="employee"
                  itemLabelPlural="employees"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}

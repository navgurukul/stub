"use client";

import { useState, useEffect } from "react";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { EmptyState } from "./_components/EmptyState";
import { LoadingState } from "./_components/LoadingState";
import { ProjectFilters } from "./_components/ProjectFilters";
import { ProjectsTable, Project } from "./_components/ProjectsTable";
import { NewProjectSheet } from "./_components/NewProjectSheet";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { RoleProtectedRoute } from "@/app/_components/RoleProtectedRoute";
import { ROLES } from "@/lib/rbac-constants";

export default function ProjectManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);


  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handleEditProject = (projectId: string) => {
    console.log("Edit project clicked:", projectId);
    const project = projects.find((p) => String(p.id) === String(projectId)) || null;
    if (!project) {
      console.warn("Project not found in current list, opening empty form");
    }
    setEditingProject(project);
    setIsSheetOpen(true);
  };

  // Fetch projects from API
  useEffect(() => {
    if (authLoading) return;
    fetchProjects();
  }, [statusFilter, searchTerm, user?.orgId, authLoading, page, limit]);

  const fetchProjects = async (): Promise<void> => {
    // Don't fetch if auth is still loading
    if (authLoading) return;

    // Guard against missing orgId
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

      // Add status filter if not "all"
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      // Add search term if provided
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get(API_PATHS.PROJECTS, { params });

      if (response.data) {
        const items = Array.isArray(response.data.data) ? response.data.data : [];
        setProjects(items);
        if (typeof response.data.total !== "undefined") {
          setTotal(Number(response.data.total) || items.length);
        } else {
          setTotal((prev) => Math.max(prev, (page - 1) * limit + items.length));
        }
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch projects. Please try again.";
      toast.error("Failed to load projects", {
        description: errorMessage,
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput);
  };

  const handleSearchKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = (): void => {
    setPage(1);
    setSearchInput("");
    setSearchTerm("");
  };

  const handleStatusChange = (value: string): void => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleProjectCreated = (): void => {
    fetchProjects();
  };

  return (
    <RoleProtectedRoute
      requiredRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN]}
    >
      <AppHeader
        crumbs={[
          { label: "Project Management" },
        ]}
      />
      <PageWrapper>
        <div className="flex w-full justify-center p-4">
          <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-4xl xl:max-w-6xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    Project Management
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Manage and organize all projects in your organization
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingProject(null);
                    setIsSheetOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Filter Controls */}
                <ProjectFilters
                  statusFilter={statusFilter}
                  onStatusChange={handleStatusChange}
                  searchInput={searchInput}
                  onSearchInputChange={setSearchInput}
                  onSearch={handleSearch}
                  onClearSearch={handleClearSearch}
                  onSearchKeyPress={handleSearchKeyPress}
                />

                {/* Projects Table */}
                {loading ? (
                  <LoadingState />
                ) : projects.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ProjectsTable projects={projects} onEditProject={handleEditProject} />
                )}

                {/* Pagination */}
                {showPagination && !loading && projects.length > 0 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => page > 1 && setPage(page - 1)}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {pageNumbers.map((pageNum, index) =>
                        pageNum === "ellipsis" ? (
                          <div
                            key={`ellipsis-${index}`}
                            className="items-center md:flex hidden"
                          >
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          </div>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            page < totalPages && setPage(page + 1)
                          }
                          className={
                            page === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}

                {/* Results Summary */}
                {!loading && projects.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1}-
                    {Math.min(page * limit, total || projects.length)} of{" "}
                    {total || projects.length} project
                    {(total || projects.length) !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <NewProjectSheet
          open={isSheetOpen}
          initialProject={editingProject}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) setEditingProject(null);
          }}
          onSuccess={() => {
            handleProjectCreated();
            setEditingProject(null);
          }}
        />
      </PageWrapper>
    </RoleProtectedRoute>
  );
}

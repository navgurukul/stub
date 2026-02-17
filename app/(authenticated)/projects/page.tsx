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
  const [limit, setLimit] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);

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
          <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
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
                <div onClick={() => console.log("div clicked", projects)}>
                  {loading ? (
                    <LoadingState />
                  ) : projects.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ProjectsTable projects={projects} onEditProject={handleEditProject} />
                  )}
                </div>

                {/* Results Summary + Pagination */}
                {!loading && (projects.length > 0 || total > 0) && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const start = total === 0 ? 0 : (page - 1) * limit + 1;
                        const end = Math.min(page * limit, Math.max(total, projects.length));
                        const totalDisplay = total || projects.length;
                        return `Showing ${start}-${end} of ${totalDisplay} project${totalDisplay !== 1 ? "s" : ""}`;
                      })()}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        Previous
                      </Button>

                      <div className="px-2 text-sm">{page}</div>

                      <Button
                        size="sm"
                        onClick={() => {
                          const totalPages = Math.max(1, Math.ceil((total || projects.length) / limit));
                          setPage((p) => Math.min(totalPages, p + 1));
                        }}
                        disabled={page * limit >= (total || projects.length)}
                      >
                        Next
                      </Button>
                    </div>
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

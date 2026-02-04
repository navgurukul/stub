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
  }, [statusFilter, searchTerm, user?.orgId, authLoading]);

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
        setProjects(
          Array.isArray(response.data.data) ? response.data.data : []
        );
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
    setSearchInput("");
    setSearchTerm("");
  };

  const handleStatusChange = (value: string): void => {
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
          { label: "Dashboard", href: "/" },
          { label: "Admin", href: "/admin/dashboard" },
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

                {/* Results Summary */}
                {!loading && projects.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Showing {projects.length} project
                    {projects.length !== 1 ? "s" : ""}
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

"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { ProjectsTable } from "./ProjectsTable";
import type { Project } from "@/lib/project-types";
import { NewProjectSheet } from "./NewProjectSheet";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { AppPagination } from "@/components/ui/app-pagination";

export function ProjectManagementTab() {
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  // Status toggle confirmation states
  const [confirmToggleProject, setConfirmToggleProject] = useState<Project | null>(null);
  const [isToggleConfirmOpen, setIsToggleConfirmOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;



  const handleEditProject = (projectId: string) => {
    const project = projects.find((p) => String(p.id) === String(projectId)) || null;
    setEditingProject(project);
    setIsSheetOpen(true);
  };

  const handleToggleStatusClick = (project: Project) => {
    setConfirmToggleProject(project);
    setIsToggleConfirmOpen(true);
  };

  const executeToggleStatus = async () => {
    if (!confirmToggleProject || !user?.orgId) return;
    setIsTogglingStatus(true);
    try {
      const currentStatus = confirmToggleProject.status.toLowerCase();
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      const payload = {
        orgId: user.orgId,
        name: confirmToggleProject.name,
        code: confirmToggleProject.code || confirmToggleProject.name.slice(0, 50),
        status: newStatus,
        departmentId: confirmToggleProject.department?.id,
        projectManagerId: confirmToggleProject.projectManager?.id,
        startDate: confirmToggleProject.startDate,
        endDate: confirmToggleProject.endDate,
        budgetCurrency: confirmToggleProject.budgetCurrency || "INR",
        budgetAmountMinor: confirmToggleProject.budgetAmountMinor !== undefined && confirmToggleProject.budgetAmountMinor !== null
          ? Number(confirmToggleProject.budgetAmountMinor)
          : (confirmToggleProject.budgetAmount !== undefined && confirmToggleProject.budgetAmount !== null
            ? Number(confirmToggleProject.budgetAmount)
            : 0),
        slackChannelId: (confirmToggleProject as any).slackChannelId || null,
        discordChannelId: (confirmToggleProject as any).discordChannelId || null,
      };

      const response = await apiClient.patch(
        `${API_PATHS.PROJECTS}/${confirmToggleProject.id}`,
        payload
      );

      if (response && (response.status === 200 || response.status === 201 || response.status === 204)) {
        toast.success(`Project status updated to ${newStatus.toUpperCase()}`, {
          description: `Successfully toggled "${confirmToggleProject.name}" status.`,
        });
        setIsToggleConfirmOpen(false);
        setConfirmToggleProject(null);
        fetchProjects();
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to toggle project status. Please try again.";
      toast.error("Action failed", { description: errorMessage });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const fetchProjects = async (): Promise<void> => {
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

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

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

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, searchTerm, user?.orgId, authLoading, page]);

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

  const handleStatusChange = (value: string): void => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleProjectCreated = (): void => {
    fetchProjects();
  };

  return (
    <Card className="w-full border-2 border-border rounded-base bg-background shadow-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Project Management</CardTitle>
            <CardDescription>
              Manage and organize all projects in your organization
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setEditingProject(null);
              setIsSheetOpen(true);
            }}
            className="flex-shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Panel */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search projects..."
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

            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 border border-[#e4e4e7] bg-white rounded-lg text-sm text-neutral-900 focus:ring-0">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects Table */}
        {loading ? (
          <LoadingState />
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border border-border rounded-[4px] overflow-hidden">
            <ProjectsTable
              projects={projects}
              onEditProject={handleEditProject}
              onToggleStatus={handleToggleStatusClick}
            />
          </div>
        )}

        <AppPagination
          page={page}
          totalPages={totalPages}
          total={total || projects.length}
          limit={limit}
          onPageChange={setPage}
          loading={loading}
          itemLabel="project"
          itemLabelPlural="projects"
        />
      </CardContent>

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

      <Dialog open={isToggleConfirmOpen} onOpenChange={setIsToggleConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-base border-2 border-border shadow-shadow bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of project <strong>{confirmToggleProject?.name}</strong> to{" "}
              <strong>{confirmToggleProject?.status.toLowerCase() === "active" ? "Inactive" : "Active"}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="neutral"
              onClick={() => {
                setIsToggleConfirmOpen(false);
                setConfirmToggleProject(null);
              }}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={executeToggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

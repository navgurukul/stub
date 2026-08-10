"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RoleProtectedRoute } from "@/app/_components/RoleProtectedRoute";
import { ROLES } from "@/lib/rbac-constants";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleManagementTab } from "./_components/RoleManagementTab";
import { AdminLogsTab } from "./_components/AdminLogsTab";
import { AttendanceTab } from "./_components/AttendanceTab";
import { ProjectManagementTab } from "@/app/(authenticated)/projects/_components/ProjectManagementTab";
import { useAuth } from "@/hooks/use-auth";
import { rbacService } from "@/lib/rbac-service";

function ConfigurationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultTab = "role-management";
  const activeTab = searchParams.get("tab") || defaultTab;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/configurations?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="inline-flex h-auto items-center justify-start rounded-lg border border-border bg-secondary-background p-1 text-muted-foreground w-auto overflow-x-auto gap-1">
          <TabsTrigger
            value="role-management"
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-transparent transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Role Management
          </TabsTrigger>
          <TabsTrigger
            value="admin-logs"
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-transparent transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Admin Logs
          </TabsTrigger>
          <TabsTrigger
            value="project-management"
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-transparent transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Project Management
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-transparent transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="role-management">
          <RoleManagementTab />
        </TabsContent>

        <TabsContent value="admin-logs">
          <AdminLogsTab />
        </TabsContent>

        <TabsContent value="project-management">
          <ProjectManagementTab />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Configurations main entry page
export default function ConfigurationsPage() {
  return (
    <RoleProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppHeader
        crumbs={[
          { label: "Configurations" }
        ]}
      />
      <PageWrapper>
        <Suspense fallback={
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Configurations</h2>
                <p className="text-muted-foreground">Loading settings...</p>
              </div>
            </div>
          </div>
        }>
          <ConfigurationsContent />
        </Suspense>
      </PageWrapper>
    </RoleProtectedRoute>
  );
}

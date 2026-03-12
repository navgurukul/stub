"use client";

import { RoleProtectedRoute } from "@/app/_components/RoleProtectedRoute";
import { ROLES } from "@/lib/rbac-constants";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { LayoutDashboard, Users, FolderKanban, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <RoleProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppHeader
        crumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Dashboard" },
        ]}
      />
      <PageWrapper>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">---</div>
                <p className="text-xs text-muted-foreground">
                  Placeholder data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">---</div>
                <p className="text-xs text-muted-foreground">
                  Placeholder data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Activities Today
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">---</div>
                <p className="text-xs text-muted-foreground">
                  Placeholder data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Status
                </CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">---</div>
                <p className="text-xs text-muted-foreground">
                  Placeholder data
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Overview of recent user activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px] rounded-base bg-background/50 border-2 border-dashed border-border">
                  <p className="text-muted-foreground">
                    Activity chart placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px] rounded-base bg-background/50 border-2 border-dashed border-border">
                  <p className="text-muted-foreground">
                    Quick actions placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Content */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                  Leave requests and comp-off applications awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[200px] rounded-base bg-background/50 border-2 border-dashed border-border">
                  <p className="text-muted-foreground">
                    Pending requests list placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>
                  Important system alerts and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[200px] rounded-base bg-background/50 border-2 border-dashed border-border">
                  <p className="text-muted-foreground">
                    Notifications placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </RoleProtectedRoute>
  );
}

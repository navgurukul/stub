"use client";

import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { CompOffRequestForm } from "./_components/CompOffRequestForm";
import { RoleProtectedRoute } from "@/app/_components/RoleProtectedRoute";
import { ROLES } from "@/lib/rbac-constants";

export default function CompOffPage() {
  return (
    <>
      <RoleProtectedRoute
        requiredRoles={[ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}
      >
        <AppHeader
          crumbs={[
            { label: "Comp-Off Request" },
          ]}
        />
        <PageWrapper>
          <div className="flex w-full justify-center p-4">
            <CompOffRequestForm />
          </div>
        </PageWrapper>
      </RoleProtectedRoute>
    </>
  );
}

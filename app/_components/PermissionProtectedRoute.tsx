"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { rbacService } from "@/lib/rbac-service";
import { Permission } from "@/lib/rbac-constants";
import { UnauthorizedPage } from "./UnauthorizedPage";
import { Spinner } from "@/components/ui/spinner";

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required permissions - user must have at least one (OR logic by default)
   */
  requiredPermissions: Permission | Permission[];
  /**
   * If true, user must have ALL permissions; if false, user needs ANY permission (default: false)
   */
  requireAllPermissions?: boolean;
  /**
   * Custom unauthorized message
   */
  unauthorizedMessage?: string;
  /**
   * Redirect path for unauthorized access (if not provided, shows unauthorized page)
   */
  redirectTo?: string;
}

/**
 * PermissionProtectedRoute Component
 * Protects routes requiring specific permissions
 */
export function PermissionProtectedRoute({
  children,
  requiredPermissions,
  requireAllPermissions = false,
  unauthorizedMessage,
  redirectTo,
}: PermissionProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  // Check authorization
  const isAuthorized =
    isAuthenticated &&
    (requireAllPermissions
      ? rbacService.hasAllPermissions(user, permissions)
      : rbacService.hasAnyPermission(user, permissions));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Not authenticated, will be handled by ProtectedRoute wrapper
      return;
    }

    if (!isLoading && isAuthenticated && !isAuthorized && redirectTo) {
      // Redirect to specified path
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, isAuthorized, redirectTo, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 inline-block " />
          <p className="mt-4 text-sm text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User not authorized
  if (!isAuthorized) {
    return (
      <UnauthorizedPage
        description={
          unauthorizedMessage ||
          `You don't have the required permission to access this page. Please contact your administrator if you believe this is an error.`
        }
      />
    );
  }

  // Authorized, render children
  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { rbacService } from "@/lib/rbac-service";
import { Role } from "@/lib/rbac-constants";
import { UnauthorizedPage } from "./UnauthorizedPage";
import { Spinner } from "@/components/ui/spinner";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required roles - user must have at least one (OR logic by default)
   */
  requiredRoles: Role | Role[];
  /**
   * If true, user must have ALL roles; if false, user needs ANY role (default: false)
   */
  requireAllRoles?: boolean;
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
 * RoleProtectedRoute Component
 * Protects routes requiring specific roles
 */
export function RoleProtectedRoute({
  children,
  requiredRoles,
  requireAllRoles = false,
  unauthorizedMessage,
  redirectTo,
}: RoleProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  // Check authorization
  const isAuthorized =
    isAuthenticated &&
    (requireAllRoles
      ? rbacService.hasAllRoles(user, roles)
      : rbacService.hasAnyRole(user, roles));

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !isLoading) {
      console.log("🔐 RoleProtectedRoute Check:", {
        isAuthenticated,
        isAuthorized,
        userRoles: user?.roles,
        requiredRoles: roles,
        requireAllRoles,
      });
    }
  }, [
    isLoading,
    isAuthenticated,
    isAuthorized,
    user?.roles,
    roles,
    requireAllRoles,
  ]);

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
          <Spinner className="size-8 inline-block" />
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
          `You don't have the required role to access this page. Please contact your administrator if you believe this is an error.`
        }
      />
    );
  }

  // Authorized, render children
  return <>{children}</>;
}

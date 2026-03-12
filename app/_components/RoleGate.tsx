"use client";

import { ReactNode } from "react";
import { useRole } from "@/hooks/use-role";
import { Role } from "@/lib/rbac-constants";

interface RoleGateProps {
  children: ReactNode;
  /**
   * Required role(s) to display children
   */
  requiredRoles: Role | Role[];
  /**
   * If true and array provided, user must have all roles (default: false = OR logic)
   */
  requireAll?: boolean;
  /**
   * Optional fallback content to show when unauthorized
   */
  fallback?: ReactNode;
  /**
   * If true, returns null instead of fallback when unauthorized (default: false)
   */
  hideOnUnauthorized?: boolean;
}

/**
 * RoleGate Component
 * Conditionally render children based on user role
 */
export function RoleGate({
  children,
  requiredRoles,
  requireAll = false,
  fallback = null,
  hideOnUnauthorized = false,
}: RoleGateProps) {
  const hasRole = useRole(requiredRoles, requireAll);

  if (!hasRole) {
    return hideOnUnauthorized ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

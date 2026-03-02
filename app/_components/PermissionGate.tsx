"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/use-permission";
import { Permission } from "@/lib/rbac-constants";

interface PermissionGateProps {
  children: ReactNode;
  /**
   * Required permission(s) to display children
   */
  requiredPermissions: Permission | Permission[];
  /**
   * If true and array provided, user must have all permissions (default: false = OR logic)
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
 * PermissionGate Component
 * Conditionally render children based on user permission
 */
export function PermissionGate({
  children,
  requiredPermissions,
  requireAll = false,
  fallback = null,
  hideOnUnauthorized = false,
}: PermissionGateProps) {
  const hasPermission = usePermission(requiredPermissions, requireAll);

  if (!hasPermission) {
    return hideOnUnauthorized ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

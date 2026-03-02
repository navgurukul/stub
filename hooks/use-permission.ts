"use client";

import { useAuthorization } from "./use-authorization";
import { Permission } from "@/lib/rbac-constants";

/**
 * usePermission Hook
 * Check permission in components
 *
 * @param permission - Single permission or array of permissions to check
 * @param requireAll - If true and array provided, user must have all permissions (default: false = OR logic)
 * @returns boolean indicating if user has required permission(s)
 */
export function usePermission(
  permission: Permission | Permission[],
  requireAll: boolean = false
): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuthorization();

  if (Array.isArray(permission)) {
    return requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  }

  return hasPermission(permission);
}

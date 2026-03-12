"use client";

import { useAuthorization } from "./use-authorization";
import { Role } from "@/lib/rbac-constants";

/**
 * useRole Hook
 * Check role membership in components
 *
 * @param role - Single role or array of roles to check
 * @param requireAll - If true and array provided, user must have all roles (default: false = OR logic)
 * @returns boolean indicating if user has required role(s)
 */
export function useRole(
  role: Role | Role[],
  requireAll: boolean = false
): boolean {
  const { hasRole, hasAnyRole, hasAllRoles } = useAuthorization();

  if (Array.isArray(role)) {
    return requireAll ? hasAllRoles(role) : hasAnyRole(role);
  }

  return hasRole(role);
}

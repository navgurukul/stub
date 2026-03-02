"use client";

import { useMemo } from "react";
import { useAuth } from "./use-auth";
import { rbacService } from "@/lib/rbac-service";
import { Role, Permission } from "@/lib/rbac-constants";

/**
 * useAuthorization Hook
 * Comprehensive authorization state and utilities
 */
export function useAuthorization() {
  const { user, isLoading } = useAuth();

  const roles = useMemo(() => rbacService.getUserRoles(user), [user]);

  const permissions = useMemo(
    () => rbacService.getUserPermissions(user),
    [user]
  );

  const hasRole = useMemo(
    () => (role: Role) => rbacService.hasRole(user, role),
    [user]
  );

  const hasAnyRole = useMemo(
    () => (requiredRoles: Role[]) => rbacService.hasAnyRole(user, requiredRoles),
    [user]
  );

  const hasAllRoles = useMemo(
    () => (requiredRoles: Role[]) => rbacService.hasAllRoles(user, requiredRoles),
    [user]
  );

  const hasMinimumRole = useMemo(
    () => (minimumRole: Role) => rbacService.hasMinimumRole(user, minimumRole),
    [user]
  );

  const hasPermission = useMemo(
    () => (permission: Permission) => rbacService.hasPermission(user, permission),
    [user]
  );

  const hasAnyPermission = useMemo(
    () => (requiredPermissions: Permission[]) =>
      rbacService.hasAnyPermission(user, requiredPermissions),
    [user]
  );

  const hasAllPermissions = useMemo(
    () => (requiredPermissions: Permission[]) =>
      rbacService.hasAllPermissions(user, requiredPermissions),
    [user]
  );

  const isAuthorized = useMemo(
    () =>
      (options: {
        roles?: Role[];
        permissions?: Permission[];
        requireAllRoles?: boolean;
        requireAllPermissions?: boolean;
      }) =>
        rbacService.isAuthorized(user, options),
    [user]
  );

  return {
    user,
    roles,
    permissions,
    isLoading,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasMinimumRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthorized,
  };
}

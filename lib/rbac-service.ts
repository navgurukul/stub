/**
 * RBAC Service
 * Core authorization logic for role and permission checking
 */

import { Role, Permission, ROLE_HIERARCHY } from "./rbac-constants";
import { UserData } from "./token-service";

export class RBACService {
  /**
   * Normalize role string to match frontend constants
   * Handles backend sending roles in different formats (snake_case, camelCase, etc.)
   */
  private normalizeRole(role: string): string {
    // Convert to uppercase and replace underscores/hyphens with nothing
    return role.toUpperCase().replace(/[_-]/g, '');
  }

  /**
   * Check if user roles array contains the required role
   * Handles case-insensitive and format-insensitive matching
   */
  private userHasRole(userRoles: string[], targetRole: Role): boolean {
    const normalizedTarget = this.normalizeRole(targetRole);
    return userRoles.some((userRole) => {
      const normalizedUserRole = this.normalizeRole(userRole);
      return normalizedUserRole === normalizedTarget;
    });
  }

  /**
   * Check if user has a specific role
   */
  hasRole(user: UserData | null, role: Role): boolean {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }
    return this.userHasRole(user.roles, role);
  }

  /**
   * Check if user has any of the specified roles (OR logic)
   */
  hasAnyRole(user: UserData | null, roles: Role[]): boolean {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }
    return roles.some((role) => this.userHasRole(user.roles!, role));
  }

  /**
   * Check if user has all of the specified roles (AND logic)
   */
  hasAllRoles(user: UserData | null, roles: Role[]): boolean {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }
    return roles.every((role) => this.userHasRole(user.roles!, role));
  }

  /**
   * Check if user has a role at or above a minimum hierarchy level
   */
  hasMinimumRole(user: UserData | null, minimumRole: Role): boolean {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    const minimumLevel = ROLE_HIERARCHY[minimumRole];
    const userMaxLevel = Math.max(
      ...user.roles.map((role) => {
        // Find matching role in hierarchy by normalized comparison
        const normalizedUserRole = this.normalizeRole(role);
        const matchingRole = Object.keys(ROLE_HIERARCHY).find(
          (hierarchyRole) =>
            this.normalizeRole(hierarchyRole) === normalizedUserRole
        ) as Role | undefined;
        return matchingRole ? ROLE_HIERARCHY[matchingRole] : 0;
      })
    );

    return userMaxLevel >= minimumLevel;
  }

  /**
   * Normalize permission string to match frontend constants
   */
  private normalizePermission(permission: string): string {
    // Convert to uppercase and replace underscores/hyphens with underscores (standard format)
    return permission.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Check if user permissions array contains the required permission
   */
  private userHasPermission(
    userPermissions: string[],
    targetPermission: Permission
  ): boolean {
    const normalizedTarget = this.normalizePermission(targetPermission);
    return userPermissions.some((userPerm) => {
      const normalizedUserPerm = this.normalizePermission(userPerm);
      return normalizedUserPerm === normalizedTarget;
    });
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(user: UserData | null, permission: Permission): boolean {
    if (!user || !user.permissions || user.permissions.length === 0) {
      return false;
    }
    return this.userHasPermission(user.permissions, permission);
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   */
  hasAnyPermission(user: UserData | null, permissions: Permission[]): boolean {
    if (!user || !user.permissions || user.permissions.length === 0) {
      return false;
    }
    return permissions.some((permission) =>
      this.userHasPermission(user.permissions!, permission)
    );
  }

  /**
   * Check if user has all of the specified permissions (AND logic)
   */
  hasAllPermissions(
    user: UserData | null,
    permissions: Permission[]
  ): boolean {
    if (!user || !user.permissions || user.permissions.length === 0) {
      return false;
    }
    return permissions.every((permission) =>
      this.userHasPermission(user.permissions!, permission)
    );
  }

  /**
   * Check complex authorization combining roles and permissions
   * @param user - User data
   * @param roles - Required roles (optional)
   * @param permissions - Required permissions (optional)
   * @param requireAllRoles - If true, user must have all roles; if false, any role (default: false)
   * @param requireAllPermissions - If true, user must have all permissions; if false, any permission (default: false)
   */
  isAuthorized(
    user: UserData | null,
    options: {
      roles?: Role[];
      permissions?: Permission[];
      requireAllRoles?: boolean;
      requireAllPermissions?: boolean;
    }
  ): boolean {
    const {
      roles,
      permissions,
      requireAllRoles = false,
      requireAllPermissions = false,
    } = options;

    // If no requirements specified, authorization passes
    if (!roles && !permissions) {
      return true;
    }

    let roleCheck = true;
    let permissionCheck = true;

    // Check role requirements
    if (roles && roles.length > 0) {
      roleCheck = requireAllRoles
        ? this.hasAllRoles(user, roles)
        : this.hasAnyRole(user, roles);
    }

    // Check permission requirements
    if (permissions && permissions.length > 0) {
      permissionCheck = requireAllPermissions
        ? this.hasAllPermissions(user, permissions)
        : this.hasAnyPermission(user, permissions);
    }

    // Both role and permission checks must pass
    return roleCheck && permissionCheck;
  }

  /**
   * Get highest role level for user
   */
  getHighestRoleLevel(user: UserData | null): number {
    if (!user || !user.roles || user.roles.length === 0) {
      return 0;
    }

    return Math.max(
      ...user.roles.map((role) => ROLE_HIERARCHY[role as Role] || 0)
    );
  }

  /**
   * Get all user roles
   */
  getUserRoles(user: UserData | null): Role[] {
    if (!user || !user.roles) {
      return [];
    }
    return user.roles as Role[];
  }

  /**
   * Get all user permissions
   */
  getUserPermissions(user: UserData | null): Permission[] {
    if (!user || !user.permissions) {
      return [];
    }
    return user.permissions as Permission[];
  }
}

// Export singleton instance
export const rbacService = new RBACService();

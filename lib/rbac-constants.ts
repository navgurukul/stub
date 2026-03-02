/**
 * RBAC Constants
 * Defines roles, permissions, and hierarchy for Role-Based Access Control
 */

// =============================================================================
// Role Definitions
// =============================================================================

export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy mapping (higher number = more privileges)
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.EMPLOYEE]: 1,
  [ROLES.MANAGER]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.SUPER_ADMIN]: 4,
} as const;

// =============================================================================
// Permission Definitions
// =============================================================================

// Timesheet Permissions
export const TIMESHEET_PERMISSIONS = {
  SUBMIT_OWN_TIMESHEET: "SUBMIT_OWN_TIMESHEET",
  VIEW_OWN_TIMESHEET: "VIEW_OWN_TIMESHEET",
  APPROVE_TEAM_TIMESHEET: "APPROVE_TEAM_TIMESHEET",
  VIEW_ALL_TIMESHEETS: "VIEW_ALL_TIMESHEETS",
} as const;

// Leave Permissions
export const LEAVE_PERMISSIONS = {
  APPLY_LEAVE: "APPLY_LEAVE",
  VIEW_OWN_LEAVES: "VIEW_OWN_LEAVES",
  APPROVE_TEAM_LEAVES: "APPROVE_TEAM_LEAVES",
  MANAGE_ALL_LEAVES: "MANAGE_ALL_LEAVES",
  CONFIGURE_LEAVE_TYPES: "CONFIGURE_LEAVE_TYPES",
} as const;

// User Management Permissions
export const USER_PERMISSIONS = {
  VIEW_USERS: "VIEW_USERS",
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
  MANAGE_USER_ROLES: "MANAGE_USER_ROLES",
} as const;

// Project Permissions
export const PROJECT_PERMISSIONS = {
  VIEW_ASSIGNED_PROJECTS: "VIEW_ASSIGNED_PROJECTS",
  VIEW_ALL_PROJECTS: "VIEW_ALL_PROJECTS",
  CREATE_PROJECT: "CREATE_PROJECT",
  UPDATE_PROJECT: "UPDATE_PROJECT",
  DELETE_PROJECT: "DELETE_PROJECT",
  ASSIGN_PROJECT: "ASSIGN_PROJECT",
} as const;

// Department Permissions
export const DEPARTMENT_PERMISSIONS = {
  VIEW_DEPARTMENTS: "VIEW_DEPARTMENTS",
  MANAGE_DEPARTMENTS: "MANAGE_DEPARTMENTS",
} as const;

// System Permissions
export const SYSTEM_PERMISSIONS = {
  ACCESS_ADMIN_DASHBOARD: "ACCESS_ADMIN_DASHBOARD",
  MANAGE_ACCESS_CONTROL: "MANAGE_ACCESS_CONTROL",
  VIEW_SYSTEM_REPORTS: "VIEW_SYSTEM_REPORTS",
  CONFIGURE_SYSTEM: "CONFIGURE_SYSTEM",
} as const;

// Combined permissions object
export const PERMISSIONS = {
  ...TIMESHEET_PERMISSIONS,
  ...LEAVE_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...DEPARTMENT_PERMISSIONS,
  ...SYSTEM_PERMISSIONS,
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// =============================================================================
// Common Role-Permission Mappings (for reference)
// =============================================================================

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.EMPLOYEE]:
    "View own data, submit timesheets, apply for leaves, view assigned projects",
  [ROLES.MANAGER]:
    "All Employee capabilities plus manage team members, approve leave requests, view team reports",
  [ROLES.ADMIN]:
    "All Manager capabilities plus manage organization users, configure system settings, manage departments and projects",
  [ROLES.SUPER_ADMIN]:
    "All Admin capabilities plus manage admin users, system-wide configuration, access control management",
} as const;

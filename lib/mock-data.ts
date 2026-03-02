/**
 * Mock Data Service
 * Centralized location for all mock/placeholder data used across the application.
 * This data will be replaced with actual API calls in production.
 */

import { AllocatedLeave } from "@/app/(authenticated)/leaves/application/_components/AllocatedLeavesTable";

// =============================================================================
// User Mock Data
// =============================================================================

export interface MockUser {
  email: string;
  name: string;
  department: string;
}

/**
 * Mock user data for development and testing
 * In production, this will be fetched from auth context
 */
export const MOCK_USER: MockUser = {
  email: "john.doe@company.com",
  name: "John Doe",
  department: "Engineering",
};

// =============================================================================
// Leave Management Mock Data
// =============================================================================

export interface LeaveTypeOption {
  value: string;
  label: string;
}

export interface DurationTypeOption {
  value: string;
  label: string;
}

export interface LeaveHistoryRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedDate: string;
}

/**
 * Available leave types for leave application
 * In production, this will be fetched from backend API
 */
export const MOCK_LEAVE_TYPES: LeaveTypeOption[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

/**
 * Duration types for leave requests
 * In production, this may be fetched from backend API
 */
export const MOCK_DURATION_TYPES: DurationTypeOption[] = [
  { value: "full_day", label: "Full Day" },
  { value: "half_day", label: "Half Day" },
];

/**
 * User's allocated leave balances
 * In production, this will be fetched from backend API
 */
export const MOCK_ALLOCATED_LEAVES: AllocatedLeave[] = [
  {
    leaveType: "Annual Leave",
    balance: 12,
    booked: 6,
    pending: 2,
    allocated: 20,
  },
  {
    leaveType: "Sick Leave",
    balance: 8,
    booked: 2,
    pending: 0,
    allocated: 10,
  },
  {
    leaveType: "Casual Leave",
    balance: 7,
    booked: 3,
    pending: 2,
    allocated: 12,
  },
  {
    leaveType: "Maternity Leave",
    balance: 90,
    booked: 0,
    pending: 0,
    allocated: 90,
  },
  {
    leaveType: "Paternity Leave",
    balance: 15,
    booked: 0,
    pending: 0,
    allocated: 15,
  },
];

/**
 * Mock leave history records
 * In production, this will be fetched from backend API
 */
export const MOCK_LEAVE_HISTORY: LeaveHistoryRecord[] = [
  {
    id: "1",
    leaveType: "Annual Leave",
    startDate: "2025-11-15",
    endDate: "2025-11-17",
    duration: "3 Days (Full Day)",
    reason: "Family vacation",
    status: "pending",
    appliedDate: "2025-10-28",
  },
  {
    id: "2",
    leaveType: "Sick Leave",
    startDate: "2025-10-20",
    endDate: "2025-10-20",
    duration: "1 Day (Full Day)",
    reason: "Medical appointment",
    status: "approved",
    appliedDate: "2025-10-19",
  },
  {
    id: "3",
    leaveType: "Casual Leave",
    startDate: "2025-10-10",
    endDate: "2025-10-10",
    duration: "0.5 Days (Half Day)",
    reason: "Personal work",
    status: "approved",
    appliedDate: "2025-10-08",
  },
  {
    id: "4",
    leaveType: "Annual Leave",
    startDate: "2025-09-25",
    endDate: "2025-09-27",
    duration: "3 Days (Full Day)",
    reason: "Extended weekend trip",
    status: "approved",
    appliedDate: "2025-09-10",
  },
  {
    id: "5",
    leaveType: "Sick Leave",
    startDate: "2025-09-15",
    endDate: "2025-09-15",
    duration: "1 Day (Full Day)",
    reason: "Flu symptoms",
    status: "rejected",
    appliedDate: "2025-09-15",
  },
  {
    id: "6",
    leaveType: "Casual Leave",
    startDate: "2025-08-28",
    endDate: "2025-08-29",
    duration: "2 Days (Full Day)",
    reason: "Attending wedding",
    status: "approved",
    appliedDate: "2025-08-15",
  },
  {
    id: "7",
    leaveType: "Annual Leave",
    startDate: "2025-08-05",
    endDate: "2025-08-09",
    duration: "5 Days (Full Day)",
    reason: "Summer vacation",
    status: "approved",
    appliedDate: "2025-07-20",
  },
  {
    id: "8",
    leaveType: "Casual Leave",
    startDate: "2025-12-01",
    endDate: "2025-12-01",
    duration: "1 Day (Full Day)",
    reason: "Holiday shopping",
    status: "pending",
    appliedDate: "2025-10-28",
  },
];

// =============================================================================
// Activity Tracker Mock Data
// =============================================================================

export interface DepartmentOption {
  value: string;
  label: string;
}

export interface ProjectOption {
  value: string;
  label: string;
}

/**
 * Available departments for activity tracking
 * In production, this will be fetched from backend API
 */
export const MOCK_WORKING_DEPARTMENTS: DepartmentOption[] = [
  { value: "engineering", label: "Engineering" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "hr", label: "Human Resources" },
];

/**
 * Available projects for activity tracking
 * In production, this will be fetched from backend API
 */
export const MOCK_PROJECTS: ProjectOption[] = [
  { value: "project-a", label: "Project Alpha" },
  { value: "project-b", label: "Project Beta" },
  { value: "project-c", label: "Project Gamma" },
];

// =============================================================================
// Mock Data Service Functions
// =============================================================================

/**
 * Service object for accessing mock data
 * Provides a consistent API that can be easily replaced with real API calls
 */
export const mockDataService = {
  // User data
  getCurrentUser: (): MockUser => MOCK_USER,

  // Leave management
  getLeaveTypes: (): LeaveTypeOption[] => MOCK_LEAVE_TYPES,
  getDurationTypes: (): DurationTypeOption[] => MOCK_DURATION_TYPES,
  getAllocatedLeaves: (): AllocatedLeave[] => MOCK_ALLOCATED_LEAVES,
  getLeaveHistory: (): LeaveHistoryRecord[] => MOCK_LEAVE_HISTORY,

  // Activity tracker
  getWorkingDepartments: (): DepartmentOption[] => MOCK_WORKING_DEPARTMENTS,
  getProjects: (): ProjectOption[] => MOCK_PROJECTS,
};

/**
 * Type exports for use in components
 */
export type { AllocatedLeave };

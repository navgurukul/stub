export interface LogUser {
  id: number;
  name: string;
  email: string;
}

export interface AuditLog {
  id: number;
  action: string;
  performedBy?: LogUser | null;
  actor?: LogUser | null;
  targetUser?: LogUser | null;
  targetUserId?: number | null;
  prev?: any;
  next?: any;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface RoleUser {
  id?: number;
  userId?: number;
  name: string;
  email: string;
  employeeDepartment?: {
    id: number;
    name: string;
    code: string | null;
  } | null;
  department?: string;
  manager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  managerName?: string;
  reportingManager?: string | null;
  role: string;
  roles?: string[];
  assignedBy?: string;
  assignedByName?: string;
  lastUpdated?: string;
  updatedAt?: string;
}

export interface SalarySummaryRow {
  userId: number;
  email: string;
  employmentType: string | null;
  joiningDate: string | null;
  exitDate: string | null;
  status: string;
  expectedAttendance: number;
  cycle: string;
  totalHours: number;
  totalWorkingDays: number;
  earnLeave: number;
  specialLeave: number;
  compOffLeaves: number;
  weekOff: number;
  totalPayableDays: number;
  lwp: number;
}


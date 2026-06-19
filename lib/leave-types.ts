export interface RawLeaveType {
  id: number;
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
  description?: string;
  maxPerRequestHours?: number;
}

export interface RawLeaveBalance {
  leaveTypeId: number;
  balanceHours: number;
  leaveType?: RawLeaveType;
}

export interface LeaveTypeWithBalance {
  id: number;
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
  description?: string;
  maxPerRequestHours?: number;
  balanceHours: number;
}

export interface LeaveRequest {
  id: number;
  user: { id: number; name: string; email: string };
  managerId: number;
  leaveType: { id: number; name: string; code: string };
  state: "pending" | "approved" | "rejected";
  startDate: string;
  endDate: string;
  durationType: "full_day" | "half_day";
  halfDaySegment: "first_half" | "second_half" | null;
  hours: number;
  reason: string;
  requestedAt: string;
  updatedAt: string;
  decidedByUserId: number | null;
}

export interface LeaveBalanceItem {
  id: number;
  userId?: number;
  leaveTypeId: number;
  balanceHours: number;
  pendingHours: number;
  bookedHours: number;
  allocatedHours: number;
  asOfDate: string;
  leaveType: {
    id: number;
    code: string;
    name: string;
    paid: boolean;
    requiresApproval: boolean;
  };
}

export type LeavesMainTab = "leaves" | "my_reportees" | "all_org";

export interface PersistedLeavesState {
  activeMainTab?: LeavesMainTab;
  isTeamEmployeeBalanceView?: boolean;
  teamEmployeeEmail?: string;
}

export interface FileUploadFieldProps {
  label: string;
  accept: string;
  multiple?: boolean;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export interface NewLeaveRequestDialogProps {
  userEmail: string;
  onSuccess: (submittedDate: string) => void;
  forceOpen?: boolean;
  prefilledDate?: string;
}



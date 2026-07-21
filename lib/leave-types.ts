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

export interface LeaveTypeOption {
  id: number;
  name: string;
  code?: string;
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

export interface LeaveBalancesResponse {
  userId: number;
  balances: LeaveBalanceItem[];
}

export interface LeaveSummary {
  availableEarnedLeaves: number;
  totalAllocatedEarnedLeaves: number;
  pending: number;
  approved: number;
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

export interface LeaveTableProps {
  leaves: LeaveRequest[];
  isLoading: boolean;
  showEmployee?: boolean;
  canDeleteApprovedRequests?: boolean;
  onUpdate?: () => void;
}

export interface LeaveBalanceTableProps {
  balances: LeaveBalanceItem[];
  isLoading: boolean;
}

export interface LeaveHistoryTableProps {
  leaveHistory: LeaveRequest[];
  isLoading: boolean;
  balances: LeaveBalanceItem[];
}

export interface AdminEmployeeLeaveBalanceTableProps {
  sortedAdminEmployeeBalances: LeaveBalanceItem[];
  editingAllocatedBalance: LeaveBalanceItem | null;
  editingAllocatedHours: string;
  isUpdatingAllocated: boolean;
  canEditTeamPendingRequests: boolean;
  setEditingAllocatedHours: (value: string) => void;
  setEditingAllocatedBalance: (value: LeaveBalanceItem | null) => void;
  handleUpdateAllocatedBalance: () => Promise<void>;
}

export interface AdminEmployeeLeaveHistoryTableProps {
  adminEmployeeHistory: LeaveRequest[];
}

export interface TeamEmployeeLeaveBalanceTableProps {
  sortedTeamEmployeeBalances: LeaveBalanceItem[];
  editingAllocatedBalance: LeaveBalanceItem | null;
  editingAllocatedHours: string;
  isUpdatingAllocated: boolean;
  canEditTeamPendingRequests: boolean;
  setEditingAllocatedHours: (value: string) => void;
  setEditingAllocatedBalance: (value: LeaveBalanceItem | null) => void;
  handleUpdateAllocatedBalance: () => Promise<void>;
}

export interface AllocatedLeave {
  leaveType: string;
  balance: number;
  booked: number;
  pending: number;
  allocated: number;
}

export interface AllocatedLeavesTableProps {
  leaves: AllocatedLeave[];
  isLoading?: boolean;
}



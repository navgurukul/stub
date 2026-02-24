import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DATE_FORMATS } from "@/lib/constants";
import { LoadingState } from "./LoadingState";

interface LeaveRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  managerId: number;
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
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

interface LeaveTableProps {
  leaves: LeaveRequest[];
  isLoading: boolean;
}

// Helper function to format duration
const formatDuration = (leave: LeaveRequest) => {
  if (leave.durationType === "half_day") {
    const segment =
      leave.halfDaySegment === "first_half" ? "First Half" : "Second Half";
    return `Half Day (${segment})`;
  }
  const days = leave.hours / 8;
  return days === 1 ? "1 Day" : `${days} Days`;
};

export function LeaveTable({ leaves, isLoading }: LeaveTableProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (leaves.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No leave records found for the selected period.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Leave Type</TableHead>
          <TableHead>Applied Date</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaves.map((leave) => (
          <TableRow key={leave.id}>
            <TableCell className="font-medium">
              {leave.leaveType.name}
            </TableCell>
            <TableCell>
              {format(parseISO(leave.requestedAt), DATE_FORMATS.DISPLAY)}
            </TableCell>
            <TableCell>
              {format(parseISO(leave.startDate), DATE_FORMATS.DISPLAY)}
            </TableCell>
            <TableCell>
              {format(parseISO(leave.endDate), DATE_FORMATS.DISPLAY)}
            </TableCell>
            <TableCell>{formatDuration(leave)}</TableCell>
            <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

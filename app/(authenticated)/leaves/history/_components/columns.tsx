"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Ban, Check, CircleCheck, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DATE_FORMATS, API_PATHS } from "@/lib/constants";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export type LeaveRequest = {
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
};

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

// Actions cell component with approval/rejection logic
function ActionsCell({
  leave,
  onUpdate,
  isBulkOperationInProgress,
}: {
  leave: LeaveRequest;
  onUpdate?: () => void;
  isBulkOperationInProgress?: boolean;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await apiClient.post(`${API_PATHS.LEAVES_APPROVE}/${leave.id}/approve`);
      toast.success("Leave request approved", {
        description: `Leave request for ${leave.user.name} has been approved.`,
      });
      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error approving leave request:", error);
      toast.error("Failed to approve leave request", {
        description: "Unable to approve the leave request. Please try again.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await apiClient.post(`${API_PATHS.LEAVES_REJECT}/${leave.id}/reject`);
      toast.success("Leave request rejected", {
        description: `Leave request for ${leave.user.name} has been rejected.`,
      });
      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      toast.error("Failed to reject leave request", {
        description: "Unable to reject the leave request. Please try again.",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const isLoading = isApproving || isRejecting;
  const isDisabled = isLoading || isBulkOperationInProgress;

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        onClick={handleApprove}
        disabled={isDisabled}
        size="xs"
        title={isBulkOperationInProgress ? "Bulk operation in progress" : ""}
      >
        {isApproving ? <Spinner /> : <Check />}
      </Button>
      <Button
        variant="neutral"
        onClick={handleReject}
        disabled={isDisabled}
        size="xs"
        title={isBulkOperationInProgress ? "Bulk operation in progress" : ""}
      >
        {isRejecting ? <Spinner /> : <Ban />}
      </Button>
    </div>
  );
}

export const columns: ColumnDef<LeaveRequest>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "user.name",
    header: "Employee",
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "leaveType.name",
    header: "Leave Type",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.leaveType.name}</div>
    ),
  },
  {
    accessorKey: "requestedAt",
    header: "Applied Date",
    cell: ({ row }) => {
      return format(
        parseISO(row.getValue("requestedAt")),
        DATE_FORMATS.DISPLAY
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      return format(parseISO(row.getValue("startDate")), DATE_FORMATS.DISPLAY);
    },
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => {
      return format(parseISO(row.getValue("endDate")), DATE_FORMATS.DISPLAY);
    },
  },
  {
    accessorKey: "hours",
    header: "Duration",
    cell: ({ row }) => {
      return formatDuration(row.original);
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.getValue("reason")}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const leave = row.original;
      const meta = table.options.meta as {
        onUpdate?: () => void;
        isBulkOperationInProgress?: boolean;
      };
      return (
        <ActionsCell
          leave={leave}
          onUpdate={meta?.onUpdate}
          isBulkOperationInProgress={meta?.isBulkOperationInProgress}
        />
      );
    },
  },
];

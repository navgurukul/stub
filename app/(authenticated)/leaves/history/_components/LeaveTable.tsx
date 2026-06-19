"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { DATE_FORMATS, API_PATHS } from "@/lib/constants";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/utils";
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
  requestedAt: string;
  updatedAt: string;
  decidedByUserId: number | null;
}

interface LeaveTableProps {
  leaves: LeaveRequest[];
  isLoading: boolean;
  showEmployee?: boolean;
  canDeleteApprovedRequests?: boolean;
  onUpdate?: () => void;
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

export function LeaveTable({
  leaves,
  isLoading,
  showEmployee = false,
  canDeleteApprovedRequests = false,
  onUpdate,
}: LeaveTableProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [leaveToDelete, setLeaveToDelete] = useState<LeaveRequest | null>(null);

  const handleDelete = async (leave: LeaveRequest) => {
    setDeletingId(leave.id);
    try {
      const path = API_PATHS.LEAVES_ADMIN_REQUEST_DELETE.replace(
        "{id}",
        String(leave.id)
      );
      await apiClient.delete(path);
      toast.success("Leave request deleted", {
        description: `Approved leave request for ${leave.user.name} has been deleted.`,
      });
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error deleting leave request:", error);
      toast.error("Failed to delete leave request", {
        description: extractErrorMessage(error, "Unable to delete the approved leave request. Please try again."),
      });
    } finally {
      setDeletingId(null);
    }
  };

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
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Leave Type</TableHead>
            <TableHead>Applied Date</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Duration</TableHead>
            {canDeleteApprovedRequests && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaves.map((leave) => (
            <TableRow key={leave.id}>
              {showEmployee && (
                <TableCell className="font-medium">
                  <div>{leave.user.name}</div>
                  <div className="text-xs text-muted-foreground">{leave.user.email}</div>
                </TableCell>
              )}
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
              {canDeleteApprovedRequests && (
                <TableCell className="text-right">
                  <Button
                    variant="neutral"
                    size="xs"
                    onClick={() => setLeaveToDelete(leave)}
                    disabled={deletingId === leave.id}
                    title="Delete approved request"
                  >
                    {deletingId === leave.id ? <Spinner /> : <Trash2 />}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={Boolean(leaveToDelete)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setLeaveToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete Leave Request?</DialogTitle>
            <DialogDescription>
              {leaveToDelete
                ? `Are you sure you want to delete approved leave request for ${leaveToDelete.user.name}?`
                : "Are you sure you want to delete this approved leave request?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="neutral"
              onClick={() => setLeaveToDelete(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!leaveToDelete) return;
                await handleDelete(leaveToDelete);
                setLeaveToDelete(null);
              }}
              disabled={!leaveToDelete || deletingId !== null}
            >
              {deletingId !== null ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

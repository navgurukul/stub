"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_FORMATS, API_PATHS, VALIDATION } from "@/lib/constants";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { extractErrorMessage } from "@/lib/utils";
import type { LeaveRequest, LeaveTypeOption } from "@/lib/leave-types";
import { isCompOffLeaveType } from "@/lib/leave-helpers";

const formatDuration = (leave: LeaveRequest) => {
  if (leave.durationType === "half_day") {
    const segment =
      leave.halfDaySegment === "first_half" ? "First Half" : "Second Half";
    return `Half Day (${segment})`;
  }
  const days = leave.hours / 8;
  return days === 1 ? "1 Day" : `${days} Days`;
};

function ActionsCell({
  leave,
  onUpdate,
  isBulkOperationInProgress,
  canEditPendingRequests,
  canDeleteApprovedRequests,
  hasMultipleSelectedRows,
}: {
  leave: LeaveRequest;
  onUpdate?: () => void;
  isBulkOperationInProgress?: boolean;
  canEditPendingRequests?: boolean;
  canDeleteApprovedRequests?: boolean;
  hasMultipleSelectedRows?: boolean;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"approve" | "reject" | null>(null);
  const [validatingAction, setValidatingAction] = useState<"approve" | "reject" | null>(null);
  const [wasPreValidated, setWasPreValidated] = useState(false);
  const [isPolicyAcknowledged, setIsPolicyAcknowledged] = useState(false);
  const leavePolicyUrl = process.env.NEXT_PUBLIC_LEAVE_POLICY_URL?.trim() ?? "";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingLeaveTypes, setIsLoadingLeaveTypes] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);

  const [leaveTypeId, setLeaveTypeId] = useState(String(leave.leaveType?.id ?? ""));
  const [startDate, setStartDate] = useState(leave.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(leave.endDate?.slice(0, 10) ?? "");
  const [durationType, setDurationType] = useState<"full_day" | "half_day">(
    leave.durationType
  );
  const [halfDaySegment, setHalfDaySegment] = useState<"first_half" | "second_half" | "">(
    leave.halfDaySegment ?? ""
  );

  useEffect(() => {
    if (!isEditOpen || !canEditPendingRequests) {
      return;
    }

    let isMounted = true;

    const loadLeaveTypes = async () => {
      setIsLoadingLeaveTypes(true);
      try {
        const response = await apiClient.get(API_PATHS.LEAVES_TYPES);
        const source =
          response.data?.leaveTypes ??
          response.data?.data?.leaveTypes ??
          response.data?.data ??
          response.data;

        const mapped = Array.isArray(source)
          ? source
            .map((type: any) => ({
              id: Number(type?.id),
              name: String(type?.name ?? ""),
              code: type?.code ? String(type.code) : undefined,
            }))
            .filter((type) => Number.isFinite(type.id) && type.id > 0 && type.name)
          : [];

        if (isMounted) {
          setLeaveTypes(mapped);

          if (!leaveTypeId && mapped.length > 0) {
            setLeaveTypeId(String(mapped[0].id));
          }
        }
      } catch {
        if (isMounted) {
          setLeaveTypes([]);
          toast.error("Failed to load leave types");
        }
      } finally {
        if (isMounted) {
          setIsLoadingLeaveTypes(false);
        }
      }
    };

    loadLeaveTypes();

    return () => {
      isMounted = false;
    };
  }, [isEditOpen, canEditPendingRequests, leaveTypeId]);

  const resetEditForm = () => {
    setLeaveTypeId(String(leave.leaveType?.id ?? ""));
    setStartDate(leave.startDate?.slice(0, 10) ?? "");
    setEndDate(leave.endDate?.slice(0, 10) ?? "");
    setDurationType(leave.durationType);
    setHalfDaySegment(leave.halfDaySegment ?? "");
  };

  const handlePreActionCheck = async (action: "approve" | "reject") => {
    setValidatingAction(action);
    try {
      await apiClient.post(`${API_PATHS.LEAVES_APPROVE}/${leave.id}/${action}?validate=true`);
      setWasPreValidated(true);
      setConfirmingAction(action);
    } catch (error) {
      toast.error(`Failed to ${action} leave request`, {
        description: extractErrorMessage(error, `Failed to validate ${action} action`),
      });
    } finally {
      setValidatingAction(null);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      if (!wasPreValidated) {
        await apiClient.post(`${API_PATHS.LEAVES_APPROVE}/${leave.id}/approve`);
      }
      toast.success("Leave request approved", {
        description: `Leave request for ${leave.user.name} has been approved.`,
      });
      if (onUpdate) {
        onUpdate();
      }
      setWasPreValidated(false);
      setConfirmingAction(null);
      return true;
    } catch (error) {
      toast.error("Failed to approve leave request", {
        description: extractErrorMessage(error, "Unable to approve the leave request. Please try again."),
      });
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      if (!wasPreValidated) {
        await apiClient.post(`${API_PATHS.LEAVES_REJECT}/${leave.id}/reject`);
      }
      toast.success("Leave request rejected", {
        description: `Leave request for ${leave.user.name} has been rejected.`,
      });
      if (onUpdate) {
        onUpdate();
      }
      setWasPreValidated(false);
      setConfirmingAction(null);
    } catch (error) {
      toast.error("Failed to reject leave request", {
        description: extractErrorMessage(error, "Unable to reject the leave request. Please try again."),
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Please fill all required fields");
      return;
    }

    if (endDate < startDate) {
      toast.error("Invalid date range", {
        description: "End date must be on or after the start date.",
      });
      return;
    }

    if (durationType === "half_day" && !halfDaySegment) {
      toast.error("Select half-day segment", {
        description: "Please choose first or second half.",
      });
      return;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
      1;
    const hours = durationType === "half_day" ? days * 4 : days * 8;

    if (days <= 0 || Number.isNaN(hours)) {
      toast.error("Invalid leave duration");
      return;
    }

    const payload: Record<string, unknown> = {
      leaveTypeId: Number(leaveTypeId),
      startDate,
      endDate,
      durationType,
      hours,
    };

    if (durationType === "half_day") {
      payload.halfDaySegment = halfDaySegment;
    }

    setIsSavingEdit(true);
    try {
      const path = API_PATHS.LEAVES_ADMIN_REQUEST_UPDATE.replace(
        "{id}",
        String(leave.id)
      );

      await apiClient.patch(path, payload);

      toast.success("Leave request updated", {
        description: `Pending request for ${leave.user.name} has been updated.`,
      });

      setIsEditOpen(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      toast.error("Failed to update leave request", {
        description: extractErrorMessage(error, "Unable to update this leave request. If this date is a weekend or holiday, please select a valid working day and try again."),
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const path = API_PATHS.LEAVES_ADMIN_REQUEST_DELETE.replace(
        "{id}",
        String(leave.id)
      );
      await apiClient.delete(path);

      toast.success("Leave request deleted", {
        description: `Approved leave request for ${leave.user.name} has been deleted.`,
      });

      setIsDeleteOpen(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error deleting leave request:", error);
      toast.error("Failed to delete leave request", {
        description: extractErrorMessage(error, "Unable to delete the approved leave request. Please try again."),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isApproving || isRejecting || isSavingEdit || validatingAction !== null;
  const isDisabled = isLoading || isBulkOperationInProgress || isDeleting;
  const canShowPendingActions = leave.state === "pending";
  const canShowApprovedDelete =
    leave.state === "approved" &&
    Boolean(canDeleteApprovedRequests) &&
    !isCompOffLeaveType(leave.leaveType);

  if (hasMultipleSelectedRows || (!canShowPendingActions && !canShowApprovedDelete)) {
    return null;
  }

  if (canShowApprovedDelete) {
    return (
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogTrigger asChild>
          <Button
            variant="neutral"
            size="xs"
            disabled={Boolean(isBulkOperationInProgress) || isDeleting}
            title={
              isBulkOperationInProgress
                ? "Bulk operation in progress"
                : "Delete approved request"
            }
          >
            {isDeleting ? <Spinner /> : <Trash2 />}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete Leave Request?</DialogTitle>
            <DialogDescription>
              {`Are you sure you want to delete approved leave request for ${leave.user.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="neutral"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
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
    );
  }

  return (
    <div className="flex gap-2">
      {canEditPendingRequests && !isCompOffLeaveType(leave.leaveType) && (
        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetEditForm();
            }
            setIsEditOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              title={
                isBulkOperationInProgress
                  ? "Bulk operation in progress"
                  : "Edit request"
              }
              disabled={Boolean(isBulkOperationInProgress)}
            >
              <Pencil />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Edit Pending Leave</DialogTitle>
              <DialogDescription>
                Update leave details for {leave.user.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-1">
              <div className="grid gap-2">
                <Label htmlFor={`leave-type-${leave.id}`}>Leave Type</Label>
                <Select value={leaveTypeId || undefined} onValueChange={setLeaveTypeId}>
                  <SelectTrigger id={`leave-type-${leave.id}`}>
                    <SelectValue
                      placeholder={
                        isLoadingLeaveTypes
                          ? "Loading leave types..."
                          : "Select leave type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`start-date-${leave.id}`}>Start Date</Label>
                  <Input
                    id={`start-date-${leave.id}`}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`end-date-${leave.id}`}>End Date</Label>
                  <Input
                    id={`end-date-${leave.id}`}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`duration-${leave.id}`}>Duration</Label>
                  <Select
                    value={durationType}
                    onValueChange={(value) => {
                      const next = value as "full_day" | "half_day";
                      setDurationType(next);
                      if (next !== "half_day") {
                        setHalfDaySegment("");
                      }
                    }}
                  >
                    <SelectTrigger id={`duration-${leave.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_day">Full Day</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {durationType === "half_day" && (
                  <div className="grid gap-2">
                    <Label htmlFor={`half-day-${leave.id}`}>Half Day Segment</Label>
                    <Select
                      value={halfDaySegment || undefined}
                      onValueChange={(value) =>
                        setHalfDaySegment(value as "first_half" | "second_half")
                      }
                    >
                      <SelectTrigger id={`half-day-${leave.id}`}>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_half">First Half</SelectItem>
                        <SelectItem value="second_half">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="neutral"
                onClick={() => {
                  resetEditForm();
                  setIsEditOpen(false);
                }}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit || isLoadingLeaveTypes}>
                {isSavingEdit ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog
        open={confirmingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingAction(null);
            setIsPolicyAcknowledged(false);
            if (wasPreValidated) {
              if (onUpdate) {
                onUpdate();
              }
              setWasPreValidated(false);
            }
          }
        }}
      >
        <div className="flex gap-2">
          <Button
            variant="default"
            disabled={isDisabled}
            onClick={() => handlePreActionCheck("approve")}
            size="xs"
            title={isBulkOperationInProgress ? "Bulk operation in progress" : "Approve leave"}
          >
            {isApproving || validatingAction === "approve" ? <Spinner /> : <Check />}
          </Button>

          <Button
            variant="neutral"
            onClick={() => handlePreActionCheck("reject")}
            disabled={isDisabled}
            size="xs"
            className="text-red-600 hover:bg-red-50 border-red-200"
            title={isBulkOperationInProgress ? "Bulk operation in progress" : "Reject leave"}
          >
            {isRejecting || validatingAction === "reject" ? <Spinner /> : <X />}
          </Button>
        </div>

        <DialogContent className="sm:max-w-[460px] [&_[data-slot=dialog-close]>svg]:text-red-600">
          <DialogTitle className="sr-only">
            {confirmingAction === "approve" ? "Approve" : "Reject"} Leave Request
          </DialogTitle>

          <div className="flex items-start gap-3 py-1">
            <Checkbox
              id={`leave-policy-ack-${leave.id}`}
              checked={isPolicyAcknowledged}
              onCheckedChange={(checked) => setIsPolicyAcknowledged(checked === true)}
              disabled={isApproving || isRejecting}
            />
            <Label
              htmlFor={`leave-policy-ack-${leave.id}`}
              className="text-sm font-normal leading-relaxed text-muted-foreground"
            >
              <span>
                I confirm that I have read the{' '}
                {leavePolicyUrl ? (
                  <a
                    href={leavePolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Leave Policy
                  </a>
                ) : (
                  'Leave Policy'
                )}
                {' '}and that this leave request complies with the organisation's Leave Policy.
              </span>
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="neutral"
              onClick={() => setConfirmingAction(null)}
              disabled={isApproving || isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!isPolicyAcknowledged || isApproving || isRejecting}
              className={confirmingAction === "reject" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              onClick={async () => {
                if (confirmingAction === "approve") {
                  const success = await handleApprove();
                  if (success) setConfirmingAction(null);
                } else if (confirmingAction === "reject") {
                  await handleReject();
                  setConfirmingAction(null);
                }
              }}
            >
              {isApproving || isRejecting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> {confirmingAction === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : (
                confirmingAction === "approve" ? "Approve" : "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        disabled={!row.getCanSelect()}
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
      return format(parseISO(row.getValue("requestedAt")), DATE_FORMATS.DISPLAY);
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
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => {
      const state = row.original.state;
      const stateConfig =
        state === "pending"
          ? { label: "Pending", className: "bg-[#bfa452] text-white" }
          : state === "approved"
            ? { label: "Approved", className: "bg-[#a5b68c] text-white" }
            : { label: "Rejected", className: "bg-[#bb3b1e] text-white" };

      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stateConfig.className}`}
        >
          {stateConfig.label}
        </span>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const leave = row.original;
      const meta = table.options.meta as {
        onUpdate?: () => void;
        isBulkOperationInProgress?: boolean;
        canEditPendingRequests?: boolean;
        canDeleteApprovedRequests?: boolean;
        hasMultipleSelectedRows?: boolean;
      };
      return (
        <ActionsCell
          leave={leave}
          onUpdate={meta?.onUpdate}
          isBulkOperationInProgress={meta?.isBulkOperationInProgress}
          canEditPendingRequests={meta?.canEditPendingRequests}
          canDeleteApprovedRequests={meta?.canDeleteApprovedRequests}
          hasMultipleSelectedRows={meta?.hasMultipleSelectedRows}
        />
      );
    },
  },
];

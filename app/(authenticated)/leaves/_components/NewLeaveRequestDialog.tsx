"use client";

import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle, Plus } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { mockDataService } from "@/lib/mock-data";
import {
  checkLeaveConflictWithTimesheet,
  invalidateMonthlyTimesheetCache,
} from "@/lib/leave-timesheet-validator";
import { cn } from "@/lib/utils";

interface LeaveTypeWithBalance {
  id: number;
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
  balanceHours: number;
}

const formSchema = z
  .object({
    leaveType: z.string().min(1, "Please select a leave type."),
    reason: z
      .string()
      .min(
        VALIDATION.MIN_LEAVE_REASON_LENGTH,
        `Please provide at least ${VALIDATION.MIN_LEAVE_REASON_LENGTH} characters.`
      ),
    startDate: z.date({ message: "Start date is required." }),
    endDate: z.date({ message: "End date is required." }),
    durationType: z.string().min(1, "Please select a duration type."),
    halfDaySegment: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

interface NewLeaveRequestDialogProps {
  userEmail: string;
  onSuccess: () => void;
}

export function NewLeaveRequestDialog({
  userEmail,
  onSuccess,
}: NewLeaveRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeWithBalance[]>([]);
  const [selectedDurationType, setSelectedDurationType] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const durationTypes = mockDataService.getDurationTypes();

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    async function fetchLeaveTypes() {
      try {
        const res = await apiClient.get(API_PATHS.LEAVES_BALANCES);
        const balances = Array.isArray(res.data?.balances)
          ? res.data.balances
          : [];
        const mapped = balances
          .filter((b: any) => (b.balanceHours ?? 0) > 0)
          .map((b: any) => ({
            id: b.leaveType?.id ?? b.leaveTypeId,
            code: b.leaveType?.code,
            name: b.leaveType?.name,
            paid: b.leaveType?.paid,
            requiresApproval: b.leaveType?.requiresApproval,
            balanceHours: b.balanceHours ?? 0,
          }));
        if (isMounted) setLeaveTypes(mapped);
      } catch {
        if (isMounted) setLeaveTypes([]);
      }
    }
    fetchLeaveTypes();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "",
      reason: "",
      startDate: undefined,
      endDate: undefined,
      durationType: "",
      halfDaySegment: "",
    },
  });

  const validateLeaveConflict = useCallback(
    async (startDate?: Date, endDate?: Date, durationType?: string) => {
      if (!startDate || !endDate || !durationType) {
        setValidationError(null);
        return;
      }
      setIsValidating(true);
      setValidationError(null);
      try {
        const result = await checkLeaveConflictWithTimesheet(
          startDate,
          endDate,
          durationType as "full_day" | "half_day"
        );
        if (result.hasConflict) {
          setValidationError(result.message || "Conflict detected");
        } else {
          setValidationError(null);
        }
      } catch {
        setValidationError(null);
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchDurationType = form.watch("durationType");

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      form.setValue("startDate", dateRange.from);
      form.setValue("endDate", dateRange.to);
    } else if (dateRange?.from && !dateRange?.to) {
      form.setValue("startDate", dateRange.from);
      form.setValue("endDate", dateRange.from);
    }
  }, [dateRange, form]);

  useEffect(() => {
    const id = setTimeout(() => {
      validateLeaveConflict(watchStartDate, watchEndDate, watchDurationType);
    }, 500);
    return () => clearTimeout(id);
  }, [watchStartDate, watchEndDate, watchDurationType, validateLeaveConflict]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const selectedLeaveType = leaveTypes.find(
        (t) => t.code === values.leaveType
      );
      if (!selectedLeaveType) {
        toast.error("Invalid leave type selected");
        setIsSubmitting(false);
        return;
      }

      const conflict = await checkLeaveConflictWithTimesheet(
        values.startDate,
        values.endDate,
        values.durationType as "full_day" | "half_day"
      );
      if (conflict.hasConflict) {
        toast.error("Conflict with timesheet entries", {
          description: conflict.message,
        });
        setIsSubmitting(false);
        return;
      }

      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      const days =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      const hours =
        values.durationType === "full_day" ? days * 8 : days * 4;

      const payload: Record<string, unknown> = {
        leaveTypeId: selectedLeaveType.id,
        startDate: format(values.startDate, DATE_FORMATS.API),
        endDate: format(values.endDate, DATE_FORMATS.API),
        hours,
        reason: values.reason,
        durationType: values.durationType,
      };
      if (values.durationType === "half_day" && values.halfDaySegment) {
        payload.halfDaySegment = values.halfDaySegment;
      }

      const response = await apiClient.post(
        API_PATHS.LEAVES_REQUESTS_POST,
        payload
      );
      if (response.status === 200 || response.status === 201) {
        toast.success("Leave request submitted successfully!");
        invalidateMonthlyTimesheetCache(
          values.startDate.getFullYear(),
          values.startDate.getMonth() + 1
        );
        if (values.startDate.getMonth() !== values.endDate.getMonth()) {
          invalidateMonthlyTimesheetCache(
            values.endDate.getFullYear(),
            values.endDate.getMonth() + 1
          );
        }
        form.reset({
          leaveType: "",
          reason: "",
          startDate: undefined,
          endDate: undefined,
          durationType: "",
          halfDaySegment: "",
        });
        setSelectedDurationType("");
        setValidationError(null);
        setDateRange(undefined);
        setOpen(false);
        onSuccess();
      }
    } catch (error: unknown) {
      const msg =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : error instanceof Error
          ? error.message
          : "Failed to submit leave request.";
      toast.error("Submission failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  const priority = ["casual leave", "wellness leave"];
  const sortedLeaveTypes = [...leaveTypes].sort((a, b) => {
    const aKey = (a.name || "").toLowerCase();
    const bKey = (b.name || "").toLowerCase();
    const ai = priority.findIndex((p) => aKey.includes(p));
    const bi = priority.findIndex((p) => bKey.includes(p));
    return (
      (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
      aKey.localeCompare(bKey)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>
            Fill in the details below to submit your application
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-2"
          >
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="— Select leave type —" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.code}>
                          {type.name} — {Math.floor(type.balanceHours / 8)} remaining
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Leave</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide a reason for your leave request..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Leave Date Range</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, DATE_FORMATS.DISPLAY)}{" "}
                                –{" "}
                                {format(dateRange.to, DATE_FORMATS.DISPLAY)}
                              </>
                            ) : (
                              format(dateRange.from, DATE_FORMATS.DISPLAY)
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 border-0"
                      align="start"
                    >
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range)}
                        numberOfMonths={2}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedDurationType(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {durationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDurationType === "half_day" && (
              <FormField
                control={form.control}
                name="halfDaySegment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Half Day Segment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select half day segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first_half">First Half</SelectItem>
                        <SelectItem value="second_half">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="noShadow"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isValidating || !!validationError}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isValidating
                  ? "Validating..."
                  : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

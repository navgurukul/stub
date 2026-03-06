"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { mockDataService } from "@/lib/mock-data";
import {
  checkLeaveConflictWithTimesheet,
  invalidateMonthlyTimesheetCache,
  isNonWorkingDay,
} from "@/lib/leave-timesheet-validator";

// TypeScript interfaces for API response
interface LeaveTypeResponse {
  id: number;
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
  description?: string;
  maxPerRequestHours?: number;
  balanceHours?: number;
}

const formSchema = z
  .object({
    employeeEmail: z.string().email(),
    leaveType: z.string().min(1, "Please select a leave type."),
    reason: z
      .string()
      .min(
        VALIDATION.MIN_LEAVE_REASON_LENGTH,
        `Please provide at least ${VALIDATION.MIN_LEAVE_REASON_LENGTH} characters for the reason.`
      ),
    startDate: z.date({
      message: "Start date is required.",
    }),
    endDate: z.date({
      message: "End date is required.",
    }),
    durationType: z.string().min(1, "Please select a duration type."),
    halfDaySegment: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.durationType === "half_day") {
        return data.startDate.getTime() === data.endDate.getTime();
      }
      return true;
    },
    {
      message: "Half-day leave must be for a single day only.",
      path: ["endDate"],
    }
  );

interface LeaveApplicationFormProps {
  userEmail: string;
  fetchLeaves: () => Promise<void>;
}

export function LeaveApplicationForm({
  userEmail,
  fetchLeaves,
}: LeaveApplicationFormProps) {
  // Get mock data from centralized service (duration types)
  const durationTypes = mockDataService.getDurationTypes();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeResponse[]>([]);
  const [selectedDurationType, setSelectedDurationType] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Calendar disabled matcher: only block extremely old dates (optional).
  // Removed non-working-day logic so users can pick any date.
  const disabledDates = (date: Date) => {
    // Disable dates before 1900 as a sanity guard
    if (date < new Date("1900-01-01")) return true;
    return false;
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchLeaveTypes() {
      try {
        const res = await apiClient.get(API_PATHS.LEAVES_BALANCES);
        const balances = Array.isArray(res.data?.balances)
          ? res.data.balances
          : Array.isArray(res.data)
          ? res.data
          : [];
        const filtered = balances
          .filter((b: any) => (b.balanceHours ?? 0) > 0)
          .map((b: any) => {
            const lt = b.leaveType || {};
            return {
              id: lt.id ?? b.leaveTypeId,
              code: lt.code,
              name: lt.name,
              paid: lt.paid,
              requiresApproval: lt.requiresApproval,
              description: lt.description,
              maxPerRequestHours: lt.maxPerRequestHours,
              balanceHours: b.balanceHours,
            } as LeaveTypeResponse;
          });

        if (isMounted) {
          setLeaveTypes(filtered);
        }
      } catch (error) {
        try {
          const res2 = await apiClient.get(API_PATHS.LEAVES_TYPES);
          const types = Array.isArray(res2.data) ? res2.data : [];
          if (isMounted) setLeaveTypes(types);
        } catch (err) {
          console.error("Error fetching leave types/balances:", error, err);
          if (isMounted) setLeaveTypes([]);
        }
      }
    }

    fetchLeaveTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeEmail: userEmail,
      leaveType: "",
      reason: "",
      startDate: undefined,
      endDate: undefined,
      durationType: "",
      halfDaySegment: "",
    },
  });

  // Real-time validation when dates or duration type change
  const validateLeaveConflict = useCallback(
    async (startDate?: Date, endDate?: Date, durationType?: string) => {
      // Only validate if we have all required fields
      if (!startDate || !endDate || !durationType) {
        setValidationError(null);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const conflictResult = await checkLeaveConflictWithTimesheet(
          startDate,
          endDate,
          durationType as "full_day" | "half_day"
        );

        if (conflictResult.hasConflict) {
          setValidationError(conflictResult.message || "Conflict detected");
        } else {
          setValidationError(null);
        }
      } catch (error) {
        console.error("Validation error:", error);
        // Don't block user on validation errors
        setValidationError(null);
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  // Watch form fields for real-time validation
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchDurationType = form.watch("durationType");

  // Sync date range with form fields
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      form.setValue("startDate", dateRange.from);
      form.setValue("endDate", dateRange.to);
    } else if (dateRange?.from && !dateRange?.to) {
      // Single day selection
      form.setValue("startDate", dateRange.from);
      form.setValue("endDate", dateRange.from);
    }
  }, [dateRange, form]);

  useEffect(() => {
    // Debounce validation to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      validateLeaveConflict(watchStartDate, watchEndDate, watchDurationType);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchStartDate, watchEndDate, watchDurationType, validateLeaveConflict]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Find the selected leave type to get its ID
      const selectedLeaveType = leaveTypes.find(
        (type) => type.code === values.leaveType
      );

      if (!selectedLeaveType) {
        toast.error("Invalid leave type selected");
        setIsSubmitting(false);
        return;
      }

      // Check for conflicts with existing timesheet entries
      const conflictResult = await checkLeaveConflictWithTimesheet(
        values.startDate,
        values.endDate,
        values.durationType as "full_day" | "half_day"
      );

      if (conflictResult.hasConflict) {
        toast.error("Conflict with timesheet entries", {
          description: conflictResult.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Calculate hours based on duration type
      const startDate = new Date(values.startDate);
      const endDate = new Date(values.endDate);
      const daysDifference =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      let hours = 0;
      if (values.durationType === "full_day") {
        hours = daysDifference * 8; // Assuming 8 hours per full day
      } else if (values.durationType === "half_day") {
        hours = 4; // Half day is 4 hours
      }

      // Transform form data to match API payload structure
      const payload: {
        leaveTypeId: number;
        startDate: string;
        endDate: string;
        hours: number;
        reason: string;
        durationType: string;
        halfDaySegment?: string;
      } = {
        leaveTypeId: selectedLeaveType.id,
        startDate: format(values.startDate, DATE_FORMATS.API),
        endDate: format(values.endDate, DATE_FORMATS.API),
        hours: hours,
        reason: values.reason,
        durationType: values.durationType,
      };

      // Add halfDaySegment only if durationType is half_day
      if (values.durationType === "half_day" && values.halfDaySegment) {
        payload.halfDaySegment = values.halfDaySegment;
      }

      const response = await apiClient.post(
        API_PATHS.LEAVES_REQUESTS_POST,
        payload
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("Leave application submitted successfully!", {
          description: "Your leave request has been sent for approval.",
        });

        await fetchLeaves();

        // Invalidate cache for affected months
        const startMonth = values.startDate.getMonth() + 1;
        const startYear = values.startDate.getFullYear();
        const endMonth = values.endDate.getMonth() + 1;
        const endYear = values.endDate.getFullYear();

        invalidateMonthlyTimesheetCache(startYear, startMonth);
        if (startYear !== endYear || startMonth !== endMonth) {
          invalidateMonthlyTimesheetCache(endYear, endMonth);
        }

        form.reset({
          employeeEmail: userEmail,
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
      }
    } catch (error) {
      console.error("Error submitting leave application:", error);

      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : error instanceof Error
          ? error.message
          : "Failed to submit leave application. Please try again.";

      toast.error("Submission failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const priority = ["casual leave", "wellness leave"];

  const sortedLeaveTypes = [...leaveTypes].sort((a, b) => {
    const aKey = (a.name || "").toLowerCase().trim();
    const bKey = (b.name || "").toLowerCase().trim();

    const aIdx = priority.findIndex((p) => aKey === p || aKey.includes(p));
    const bIdx = priority.findIndex((p) => bKey === p || bKey.includes(p));

    const ai = aIdx === -1 ? Number.POSITIVE_INFINITY : aIdx;
    const bi = bIdx === -1 ? Number.POSITIVE_INFINITY : bIdx;

    if (ai !== bi) return ai - bi;

    return aKey.localeCompare(bKey);
  });

  return (
    <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
      <CardHeader>
        <CardTitle className="text-2xl mb-2">Leave Application</CardTitle>
        <CardDescription className="text-muted-foreground">
          Submit your leave request by filling out the form below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Leave Details Section */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedLeaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.code}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the type of leave you are applying for
                    </FormDescription>
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
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a detailed reason for your leave request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Leave Date Range</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="noShadow"
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
                                  - {format(dateRange.to, DATE_FORMATS.DISPLAY)}
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
                          onSelect={(range) => {
                            setDateRange(range);
                            // If half-day is selected, ensure single day selection
                            if (
                              selectedDurationType === "half_day" &&
                              range?.from
                            ) {
                              setDateRange({
                                from: range.from,
                                to: range.from,
                              });
                            }
                          }}
                          numberOfMonths={2}
                          disabled={disabledDates}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {selectedDurationType === "half_day"
                        ? "Select a single day for half-day leave"
                        : "Click to select start date, then click end date for range"}
                    </FormDescription>
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

                        // When half-day is selected, set end date to match start date
                        if (value === "half_day") {
                          const startDate = form.getValues("startDate");
                          if (startDate) {
                            form.setValue("endDate", startDate);
                          }
                        }
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
                    <FormDescription>
                      Specify whether this is a full day or half day leave
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Half Day Segment field */}
              {selectedDurationType === "half_day" && (
                <FormField
                  control={form.control}
                  name="halfDaySegment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Half Day Segment</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select half day segment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="first_half">First Half</SelectItem>
                          <SelectItem value="second_half">
                            Second Half
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select which half of the day you&apos;ll be taking leave
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || isValidating || !!validationError}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isValidating
                  ? "Validating..."
                  : "Submit Leave Application"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

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
import { Calendar as CalendarIcon, Check, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { isNonWorkingDay } from "@/lib/leave-timesheet-validator";
import { useRole } from "@/hooks/use-role";
import { ROLES } from "@/lib/rbac-constants";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type {
  ApiErrorLike,
  CompOffRequestFormProps,
  CompOffRequestPayload,
  EmployeeApiRecord,
  Employee,
  QueryParams,
  TimesheetDayRecord,
} from "@/lib/compofftype";
import {
  extractErrorMessage,
  toEmployeeRecords,
  toFiniteNumber,
  toTimesheetDays,
} from "@/lib/compofftype";

const formSchema = z.object({
  userId: z.number().int().positive("Please select a valid employee."),
  workDate: z.date({
    message: "Work date is required.",
  }),
  duration: z.enum(["half_day", "full_day"], {
    message: "Please select a duration type.",
  }),
  notes: z
    .string()
    .min(
      VALIDATION.MIN_LEAVE_REASON_LENGTH,
      `Please provide at least ${VALIDATION.MIN_LEAVE_REASON_LENGTH} characters for the notes.`
    ),
});

export function CompOffRequestForm({ onSuccess, scope = "reportees" }: CompOffRequestFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [loadedHolidayMonths, setLoadedHolidayMonths] = useState<Set<string>>(
    new Set()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { user } = useAuth();

  const isAdminOrSuper = useRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const isManager = useRole(ROLES.MANAGER);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: undefined,
      workDate: undefined,
      duration: undefined,
      notes: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const getMonthKey = (year: number, month: number) => `${year}-${month}`;
  const normalizeDateKey = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    return value.length >= 10 ? value.slice(0, 10) : null;
  };

  const loadHolidaysForMonth = async (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const monthKey = getMonthKey(year, month);

    if (loadedHolidayMonths.has(monthKey)) return;

    try {
      const response = await apiClient.get(API_PATHS.MONTHLY_TIMESHEET, {
        params: { year, month },
      });

      const days = toTimesheetDays(response.data?.days || response.data?.data?.days);
      setHolidayDates((prev) => {
        const next = new Set(prev);
        days.forEach((day) => {
          if (day?.isHoliday !== true) return;
          const normalized = normalizeDateKey(day?.date);
          if (normalized) next.add(normalized);
        });
        return next;
      });
      setLoadedHolidayMonths((prev) => {
        const next = new Set(prev);
        next.add(monthKey);
        return next;
      });
    } catch (error: unknown) {
    }
  };
  const checkHolidayForDate = async (date: Date): Promise<boolean> => {
    const dateKey = format(date, DATE_FORMATS.API);
    if (holidayDates.has(dateKey)) return true;
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const response = await apiClient.get(API_PATHS.MONTHLY_TIMESHEET, {
        params: { year, month },
      });

      const days = toTimesheetDays(response.data?.days || response.data?.data?.days);
      return days.some((day) => {
        if (day?.isHoliday !== true) return false;
        return normalizeDateKey(day?.date) === dateKey;
      });
    } catch {
      return false;
    }
  };

  // Date matching function: Only allow non-working days and holidays
  // For Admin/Super Admin/Manager: allow future off-days
  // For regular employees: disable future dates
  const disableInvalidDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only restrict future dates for regular employees
    if (!isAdminOrSuper && !isManager && date > today) return true;

    // Rule 1: Check if it's a non-working day (Sunday or 2nd/4th Saturday)
    const isNonWorking = isNonWorkingDay(date);

    // Rule 1: Check if it's a holiday (using pre-loaded data from state)
    const dateKey = format(date, DATE_FORMATS.API);
    const isHolidayDate = holidayDates.has(dateKey);

    // Rule 2: Disable if it's neither a non-working day nor a holiday
    // (i.e., disable regular working days)
    return !isNonWorking && !isHolidayDate;
  };

  // Preload holidays for initial calendar render; other months are loaded on navigation.
  useEffect(() => {
    const today = new Date();
    void loadHolidaysForMonth(today);

    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    void loadHolidaysForMonth(prevMonthDate);
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    void loadHolidaysForMonth(nextMonthDate);
  }, []);

  // Fetch employees from API
  useEffect(() => {
    async function fetchEmployees() {
      if (!user?.id) return;

      setIsLoadingEmployees(true);
      try {
        const fetchAllPages = async (extraParams: QueryParams = {}) => {
          let page = 1;
          const accumulated: EmployeeApiRecord[] = [];

          while (true) {
            const response = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, page },
            });

            const pageData = toEmployeeRecords(response.data?.data);
            accumulated.push(...pageData);

            const total = response.data?.total ?? response.data?.data?.total;
            const limit = response.data?.limit ?? response.data?.data?.limit;

            // If API doesn't provide pagination meta, break after first page
            if (!total || !limit) break;

            if (accumulated.length >= total) break;
            page += 1;
          }

          return accumulated;
        };
        const trySingleRequest = async (extraParams: QueryParams = {}) => {
          try {
            const respAll = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, all: true },
            });
            const fullList = toEmployeeRecords(respAll.data?.data);
            if (fullList.length > 0) {
              const count = fullList.length;
              const total = respAll.data.total ?? respAll.data.data?.total ?? count;
              if (count >= total) return fullList;

            }
          } catch {
          }

          try {
            const resp = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, page: 1, limit: 10000 },
            });

            const list = toEmployeeRecords(resp.data?.data);
            const total = resp.data?.total ?? resp.data?.data?.total ?? list.length;

            if (list.length >= total) {
              return list;
            }
          } catch {
          }

        
          return await fetchAllPages(extraParams);
        };

        const toEmployeeList = (allUsers: EmployeeApiRecord[]): Employee[] => {
          const shouldRestrictToReportees = scope === "reportees" && Boolean(user?.id);
          const managerUserId = Number(user?.id);

          const employeeList = (allUsers || [])
            .filter((emp) => emp && emp.id !== undefined && emp.id !== null)
            .filter((emp) => {
              if (!shouldRestrictToReportees) return true;
              const managerId =
                toFiniteNumber(emp?.managerId) ??
                toFiniteNumber(emp?.manager?.id) ??
                toFiniteNumber(emp?.reportingManagerId);

              return managerId !== null && managerId === managerUserId;
            })
            .map((emp) => ({
              id: Number(emp.id),
              name: emp.name || emp.email || `User ${emp.id}`,
              email: emp.email || "",
            }))
            .filter((emp: Employee) => emp.name && !emp.name.includes("#"));

          employeeList.sort((a: Employee, b: Employee) =>
            a.name.localeCompare(b.name)
          );
          return employeeList;
        };

        const selfEmployee: Employee = {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
        };

        if (isAdminOrSuper && scope === "all") {
          const allUsers = await trySingleRequest();
          const employeeList = toEmployeeList(allUsers || []);
          setEmployees(employeeList);
          form.resetField("userId");
          return;
        }

        if (isManager || scope === "reportees") {
          const allUsers = await trySingleRequest({ managerId: user.id });
          const employeeList = toEmployeeList(allUsers || []);
          setEmployees(employeeList);
          form.resetField("userId");
          return;
        }

        setEmployees([selfEmployee]);
        form.resetField("userId");
      } catch (error: unknown) {
        toast.error("Failed to load employees", {
          description: "Unable to fetch employee list. Please try again.",
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    fetchEmployees();
  }, [user?.id, user?.name, user?.email, isAdminOrSuper, isManager, form, scope]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Final validation: Ensure the date is a holiday or non-working day
      const isNonWorking = isNonWorkingDay(values.workDate);
      const dateKey = format(values.workDate, DATE_FORMATS.API);
      const isHolidayDate = await checkHolidayForDate(values.workDate);

      if (!isNonWorking && !isHolidayDate) {
        toast.error("Invalid work date", {
          description:
            "Comp-Off requests can only be submitted for holidays or non-working days (weekends).",
        });
        setIsSubmitting(false);
        return;
      }

      const payload: CompOffRequestPayload = {
        userId: values.userId,
        workDate: dateKey,
        duration: values.duration,
        notes: values.notes,
      };

      const response = await apiClient.post(API_PATHS.COMPOFF_REQUEST, payload);

      if (response.status === 200 || response.status === 201) {
        toast.success("Comp-Off request submitted successfully!", {});
        form.reset();
        onSuccess?.();
      }
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(
        error,
        "Failed to submit comp-off request. Please try again."
      );
      toast.error("Submission failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Selection Section */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="text-lg font-semibold">Employee Information</h3>
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => {
                  const selectedEmployee = employees.find(
                    (employee) => employee.id === field.value
                  );

                  return (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Popover
                        open={employeeComboboxOpen}
                        onOpenChange={setEmployeeComboboxOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="noShadow"
                              role="combobox"
                              aria-expanded={employeeComboboxOpen}
                              className={cn(
                                "flex h-10 w-full items-center justify-between rounded-base border-2 border-border bg-main px-3 py-2 text-sm font-base text-main-foreground ring-offset-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus:outline-hidden focus:ring-2 focus:ring-black focus:ring-offset-2"
                              )}
                              // Disable selection for regular employees (they can only request for themselves).
                              disabled={
                                isLoadingEmployees || employees.length === 0
                              }
                            >
                              <span className="truncate text-left">
                                {selectedEmployee
                                  ? `${selectedEmployee.name} (${selectedEmployee.email})`
                                  : isLoadingEmployees
                                  ? "Loading employees..."
                                  : "Select employee"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="border-0 p-0"
                          style={{ width: "var(--radix-popover-trigger-width)" }}
                          align="start"
                        >
                          <Command>
                            <CommandInput
                              placeholder="Search employee..."
                              value={employeeSearchValue}
                              onValueChange={setEmployeeSearchValue}
                            />
                            <CommandList className="max-h-60 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              <CommandEmpty>No employee found.</CommandEmpty>
                              <CommandGroup>
                                {employees.map((employee) => {
                                  const label = `${employee.name} (${employee.email})`;

                                  return (
                                    <CommandItem
                                      key={employee.id}
                                      value={label}
                                      onSelect={() => {
                                        field.onChange(employee.id);
                                        setEmployeeComboboxOpen(false);
                                        setEmployeeSearchValue("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === employee.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">{label}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {!(!isAdminOrSuper && isManager && !isLoadingEmployees && employees.length === 0) && (
                        <FormDescription>
                          Select the employee for whom this comp-off is being requested
                        </FormDescription>
                      )}
                      {!isAdminOrSuper &&
                        isManager &&
                        !isLoadingEmployees &&
                        employees.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No reportees found. If this seems incorrect, please contact your manager.
                          </p>
                        )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Comp-Off Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Comp-Off Details</h3>

              <FormField
                control={form.control}
                name="workDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Work Date</FormLabel>
                    <Popover modal open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                          type="button"
                            variant="noShadow"
                            className="w-full justify-start text-left font-normal text-main-foreground
                                active:bg-gray-200
    active:scale-[0.98]
    transition-all"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, DATE_FORMATS.DISPLAY)
                            ) : (
                              <span>Select date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 border-0!"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCalendarOpen(false);
                          }}
                          onMonthChange={(month) => {
                            void loadHolidaysForMonth(month);
                            void loadHolidaysForMonth(
                              new Date(month.getFullYear(), month.getMonth() - 1, 1)
                            );
                            void loadHolidaysForMonth(
                              new Date(month.getFullYear(), month.getMonth() + 1, 1)
                            );
                          }}
                          disabled={disableInvalidDates}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select a past or current holiday/non-working day when
                      overtime work was performed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full_day">Full Day</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specify whether this is a full day or half day comp-off
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide details about the overtime work performed..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Explain why overtime work was required
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Comp-Off Request"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

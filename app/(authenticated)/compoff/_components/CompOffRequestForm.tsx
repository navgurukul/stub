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
import { Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { API_PATHS, DATE_FORMATS, VALIDATION } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { isNonWorkingDay } from "@/lib/leave-timesheet-validator";
import { useRole } from "@/hooks/use-role";
import { ROLES } from "@/lib/rbac-constants";

const formSchema = z.object({
  userId: z.number().int().positive("Please select a valid employee."),
  workDate: z
    .date({
      message: "Work date is required.",
    })
    .refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= today;
      },
      {
        message: "Comp-Off cannot be requested for future dates.",
      }
    ),
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

interface Employee {
  id: number;
  name: string;
  email: string;
}

export function CompOffRequestForm() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
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

  // Date matching function: Only allow non-working days and holidays, disable future dates
  const disableInvalidDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Rule 3: Prevent selection of future dates
    if (date > today) return true;

    // Rule 1: Check if it's a non-working day (Sunday or 2nd/4th Saturday)
    const isNonWorking = isNonWorkingDay(date);

    // Rule 1: Check if it's a holiday (using pre-loaded data from state)
    const dateKey = format(date, DATE_FORMATS.API);
    const isHolidayDate = holidayDates.has(dateKey);

    // Rule 2: Disable if it's neither a non-working day nor a holiday
    // (i.e., disable regular working days)
    return !isNonWorking && !isHolidayDate;
  };

  // Proactively load holiday data for the current and previous months
  useEffect(() => {
    async function loadHolidays() {
      try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        // Load current month holidays
        const currentMonthData = await apiClient.get(
          API_PATHS.MONTHLY_TIMESHEET,
          {
            params: { year: currentYear, month: currentMonth },
          }
        );

        // Also load previous month in case user needs to select dates from it
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const prevMonthData = await apiClient.get(API_PATHS.MONTHLY_TIMESHEET, {
          params: { year: prevYear, month: prevMonth },
        });

        // Extract holiday dates from both months
        const holidays = new Set<string>();

        const processMonthData = (data: any) => {
          const days = data?.days || data?.data?.days || [];
          days.forEach((day: any) => {
            if (day.isHoliday === true) {
              holidays.add(day.date);
            }
          });
        };

        processMonthData(currentMonthData.data);
        processMonthData(prevMonthData.data);

        setHolidayDates(holidays);
      } catch (error: any) {
        console.error("Error loading holidays:", error);
        // Silently fail - calendar will still work with non-working days
      }
    }

    loadHolidays();
  }, []);

  // Fetch employees from API
  useEffect(() => {
    async function fetchEmployees() {
      if (!user?.id) return;

      setIsLoadingEmployees(true);
      try {
        const fetchAllPages = async (extraParams: Record<string, any> = {}) => {
          let page = 1;
          const accumulated: any[] = [];

          while (true) {
            const response = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, page },
            });

            const pageData = response.data?.data || [];
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
        const trySingleRequest = async (extraParams: Record<string, any> = {}) => {
          try {
            const respAll = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, all: true },
            });
            if (respAll.data && Array.isArray(respAll.data.data)) {
              const count = respAll.data.data.length;
              const total = respAll.data.total ?? respAll.data.data?.total ?? count;
              if (count >= total) return respAll.data.data;

            }
          } catch (e) {
          }

          try {
            const resp = await apiClient.get(API_PATHS.EMPLOYEES, {
              params: { ...extraParams, page: 1, limit: 10000 },
            });

            const list = resp.data?.data || [];
            const total = resp.data?.total ?? resp.data?.data?.total ?? list.length;

            if (list.length >= total) {
              return list;
            }
          } catch (e) {
          }

        
          return await fetchAllPages(extraParams);
        };

        if (isAdminOrSuper) {
          const allUsers = await trySingleRequest();
          const employeeList = (allUsers || [])
            .filter((emp: any) => emp && emp.id) 
            .map((emp: any) => ({
              id: emp.id,
              name: emp.name || emp.email || `User ${emp.id}`, 
              email: emp.email || '',
            }))
            .filter((emp: Employee) => emp.name && !emp.name.includes('#'));
          
          employeeList.sort((a: Employee, b: Employee) => a.name.localeCompare(b.name));
          setEmployees(employeeList);
        } else if (isManager) {
          const allUsers = await trySingleRequest({ managerId: user.id });
          const employeeList = (allUsers || [])
            .filter((emp: any) => emp && emp.id) 
            .map((emp: any) => ({
              id: emp.id,
              name: emp.name || emp.email || `User ${emp.id}`, 
              email: emp.email || '',
            }))
            .filter((emp: Employee) => emp.name && !emp.name.includes('#')); 
          
          employeeList.sort((a: Employee, b: Employee) => a.name.localeCompare(b.name));
          setEmployees(employeeList);
        } else {
          // Regular employee: only themselves
          const self = {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
          };
          setEmployees([self]);
          // Preselect the current user and disable changing
          form.setValue("userId", user.id);
        }
      } catch (error: any) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to load employees", {
          description: "Unable to fetch employee list. Please try again.",
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    fetchEmployees();
  }, [user?.id, isAdminOrSuper, isManager]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Final validation: Ensure the date is a holiday or non-working day
      const isNonWorking = isNonWorkingDay(values.workDate);
      const dateKey = format(values.workDate, DATE_FORMATS.API);
      const isHolidayDate = holidayDates.has(dateKey);

      if (!isNonWorking && !isHolidayDate) {
        toast.error("Invalid work date", {
          description:
            "Comp-Off requests can only be submitted for holidays or non-working days (weekends).",
        });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        userId: values.userId,
        workDate: dateKey,
        duration: values.duration,
        notes: values.notes,
      };

      const response = await apiClient.post(API_PATHS.COMPOFF_REQUEST, payload);

      if (response.status === 200 || response.status === 201) {
        toast.success("Comp-Off request submitted successfully!", {
          description:
            "Your compensatory time off request has been sent for approval.",
        });

        form.reset();
      }
    } catch (error: any) {
      console.error("Error submitting comp-off request:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit comp-off request. Please try again.";

      toast.error("Submission failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
      <CardHeader>
        <CardTitle className="text-2xl mb-2">Comp-Off Request</CardTitle>
        <CardDescription className="text-muted-foreground">
          Request compensatory time off for overtime work performed on holidays
          or non-working days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Selection Section */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="text-lg font-semibold">Employee Information</h3>
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      // Disable selection for regular employees (they can only request for themselves).
                      disabled={isLoadingEmployees || (!isAdminOrSuper && !isManager)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingEmployees
                                ? "Loading employees..."
                                : "Select employee"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.id.toString()}
                          >
                            {employee.name} ({employee.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the employee for whom this comp-off is being
                      requested
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="noShadow"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, DATE_FORMATS.DISPLAY)
                            ) : (
                              <span>Pick a date</span>
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
                          onSelect={field.onChange}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
      </CardContent>
    </Card>
  );
}

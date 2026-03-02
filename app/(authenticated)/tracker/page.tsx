"use client";

import { useState, useEffect } from "react";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS, VALIDATION, WORK_DAYS_NEEDED } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  checkTimesheetConflictWithLeave,
  invalidateMonthlyTimesheetCache,
  isNonWorkingDay,
} from "@/lib/leave-timesheet-validator";

export default function TrackerPage() {
  // Get authenticated user data
  const { user, isLoading, refreshUser } = useAuth();

  // Get mock data from centralized service

  const [departments, setDepartments] = useState<
    { id: number; name: string; code: string; description?: string | null }[]
  >([]);

  const [projectsByDept, setProjectsByDept] = useState<
    Record<string, { id: number; name: string; code: string }[]>
  >({});

  const [projectSearchQuery, setProjectSearchQuery] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isLoading) return;
    const orgId = user?.orgId;
    if (!orgId) return;

    const fetchDepartments = async () => {
      try {
        const res = await apiClient.get(API_PATHS.DEPARTMENTS, {
          params: { orgId },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setDepartments(list);
      } catch (error: any) {
        console.error("Failed to load departments:", error);
        toast.error("Failed to load departments", {
          description:
            error.response?.data?.message ||
            error.message ||
            "Please try again.",
        });
      }
    };

    fetchDepartments();
  }, [isLoading, user?.orgId]);

  const disableInvalidDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Disable future dates
    if (d.getTime() > today.getTime()) return true;

    const backfillRemaining = user?.backfill?.remaining ?? 0;
    if (backfillRemaining === 0) {
     
      return d.getTime() !== today.getTime();
    }

    const workDaysNeeded = WORK_DAYS_NEEDED;
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - 1);

    let found = 0;
    while (found < workDaysNeeded) {
      if (!isNonWorkingDay(cursor)) {
        found++;
        if (found >= workDaysNeeded) break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    const earliestAllowed = new Date(cursor);
    earliestAllowed.setHours(0, 0, 0, 0);

    if (d.getTime() < earliestAllowed.getTime()) return true;

    return false;
  };

  const fetchProjectsForDepartment = async (deptCode: string) => {
    if (isLoading) return;
    const orgId = user?.orgId;
    if (!orgId || !deptCode) return;
    if (projectsByDept[deptCode]?.length) return;

    const dept = departments.find((d) => d.code === deptCode);
    if (!dept?.id) return;

    try {
      let allProjects: { id: number; name: string; code: string }[] = [];
      let page = 1;
      let hasMore = true;

      // Fetch all pages
      while (hasMore) {
        const res = await apiClient.get(API_PATHS.PROJECTS, {
          params: { orgId, departmentId: dept.id, page, limit: 100 },
        });
        
        const responseData = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const projects = Array.isArray(responseData) ? responseData : responseData.data || [];
        
        allProjects = [...allProjects, ...projects];
        const total = res.data?.total || projects.length;
        const limit = res.data?.limit || 100;
        hasMore = allProjects.length < total;
        page++;
      }

      setProjectsByDept((prev) => ({ ...prev, [deptCode]: allProjects }));
    } catch (error: any) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects", {
        description:
          error.response?.data?.message || error.message || "Please try again.",
      });
    }
  };

  const formSchema = z.object({
    activityDate: z
      .date()
      .refine(
        (date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Check if date is in the future
         const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() > today.getTime()) return false;

          
          return true;
        },
        {
          message: "Future dates are not allowed.",
        }
      )
      .refine(
        (date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selectedDate = new Date(date);
          selectedDate.setHours(0, 0, 0, 0);

          // If backfill remaining is zero, only allow today
          const backfillRemaining = user?.backfill?.remaining ?? 0;
          if (backfillRemaining === 0) {
            return selectedDate.getTime() === today.getTime();
          }

          // Otherwise, maintain existing 3-day window logic
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() >= threeDaysAgo.getTime() && d.getTime() <= today.getTime();

        },
        {
          message:
            "Activity can only be added for the last 3 days (including today). You may have exhausted your backfill limit.",
        }
      ),
    projectEntries: z
      .array(
        z.object({
          currentWorkingDepartment: z
            .string()
            .min(1, "Please select a working department."),
          hoursSpent: z
            .number()
            .min(
              VALIDATION.MIN_HOURS_PER_ENTRY,
              `Minimum ${VALIDATION.MIN_HOURS_PER_ENTRY} hours required.`
            )
            .max(
              VALIDATION.MAX_HOURS_PER_ENTRY,
              `Maximum ${VALIDATION.MAX_HOURS_PER_ENTRY} hours allowed per entry.`
            ),
          projectId: z.string().min(1, "Please select a project."),
          taskDescription: z
            .string()
            .min(
              VALIDATION.MIN_TASK_DESCRIPTION_LENGTH,
              `Please provide at least ${VALIDATION.MIN_TASK_DESCRIPTION_LENGTH} characters describing your task.`
            ),
        })
      )
      .min(1, "At least one project entry is required.")
      .refine(
        (entries) => {
          const totalHours = entries.reduce(
            (sum, entry) => sum + entry.hoursSpent,
            0
          );
          return totalHours <= VALIDATION.MAX_TOTAL_HOURS_PER_DAY;
        },
        {
          message: `Total hours per day cannot exceed ${VALIDATION.MAX_TOTAL_HOURS_PER_DAY} hours across all project entries.`,
        }
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityDate: new Date(),
      projectEntries: [
        {
          currentWorkingDepartment: "",
          hoursSpent: 0,
          projectId: "",
          taskDescription: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "projectEntries",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Calculate total hours
      const totalHours = values.projectEntries.reduce(
        (sum, entry) => sum + entry.hoursSpent,
        0
      );

      // Check for conflicts with existing leaves
      const conflictResult = await checkTimesheetConflictWithLeave(
        values.activityDate,
        totalHours
      );

      if (conflictResult.hasConflict) {
        toast.error("Conflict with leave application", {
          description: conflictResult.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Transform form data to match API schema
      const payload = {
        workDate: format(values.activityDate, DATE_FORMATS.API),
        notes: "",
        entries: values.projectEntries.map((entry) => ({
          projectId: parseInt(entry.projectId, 10),
          taskDescription: entry.taskDescription,
          hours: entry.hoursSpent,
        })),
      };

      // Validate that all required fields are properly mapped
      const isValid = payload.entries.every(
        (entry) =>
          typeof entry.projectId === "number" &&
          entry.taskDescription &&
          typeof entry.hours === "number"
      );

      if (!isValid) {
        toast.error("Validation failed", {
          description: "Please ensure all required fields are properly filled.",
        });
        setIsSubmitting(false);
        return;
      }

      // Send to backend API
      const response = await apiClient.post(
        API_PATHS.ACTIVITIES_SUBMIT,
        payload
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("Activity tracker submitted successfully!", {
          description: "Your activities have been recorded.",
        });

        // Invalidate cache for the submitted month
        const activityMonth = values.activityDate.getMonth() + 1;
        const activityYear = values.activityDate.getFullYear();
        invalidateMonthlyTimesheetCache(activityYear, activityMonth);

        // Refresh user data to update backfill count
        refreshUser();

        // Reset form to default values
        form.reset();
      }
    } catch (error: any) {
      console.error("Error submitting activity tracker:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit activity tracker. Please try again.";

      toast.error("Submission failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function addProjectEntry() {
  
    const lastIndex = fields.length - 1;
    const lastEntry = form.getValues(`projectEntries.${lastIndex}`);
    const isLastEntryComplete =
      lastEntry.currentWorkingDepartment &&
      lastEntry.projectId &&
      lastEntry.hoursSpent > 0 &&
      lastEntry.taskDescription.trim().length >= VALIDATION.MIN_TASK_DESCRIPTION_LENGTH;
    
    if (!isLastEntryComplete) {
      toast.error("Incomplete Entry", {
        description: "Please complete the current project entry before adding a new one.",
      });
      return;
    }

    append({
      currentWorkingDepartment: "",
      hoursSpent: 0,
      projectId: "",
      taskDescription: "",
    });
  }
  return (
    <>
      <AppHeader
        crumbs={[
          { label: "Activity Logger" },
        ]}
      />
      <PageWrapper>
        <div className="flex w-full justify-center p-4">
          <Card className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
            <CardHeader>
              <CardTitle className="text-2xl mb-2">Activity Logger</CardTitle>
              <CardDescription className="text-muted-foreground">
                Log your daily activities and manage your time effectively.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Activity Date Section */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="activityDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Activity Date</FormLabel>
                          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="noShadow"
                                  className={cn(
                                    "w-full md:w-[280px] justify-start text-left font-normal",
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
                              className="w-auto border-0! p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (!date) return;        
                                  field.onChange(date);
                                  setCalendarOpen(false);
                                }}

                                disabled={disableInvalidDates}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            {(user?.backfill?.remaining ?? 0) > 0
                              ? "Select a date for today or within the last three days (depending on available lifelines for logging activities.)"
                              : "Only today's date can be selected for tracking activities. Your backfill limit has been reached."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Project Entries Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Project Activities
                      </h3>
                    </div>

                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-4 border-2 border-border rounded-base space-y-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            Project Entry #{index + 1}
                          </h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="noShadow"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`projectEntries.${index}.currentWorkingDepartment`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Current Working Department
                                </FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue(
                                      `projectEntries.${index}.projectId`,
                                      ""
                                    );
                                    setProjectSearchQuery((prev) => ({ ...prev, [index]: "" }));
                                    fetchProjectsForDepartment(value);
                                  }}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem
                                        key={dept.id}
                                        value={dept.code}
                                      >
                                        {dept.name}
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
                            name={`projectEntries.${index}.projectId`}
                            render={({ field }) => {
                              const selectedDeptCode = form.watch(
                                `projectEntries.${index}.currentWorkingDepartment`
                              );
                              const projectOptions =
                                projectsByDept[selectedDeptCode] || [];
                              
                              const searchQuery = projectSearchQuery[index] || "";
                              const filteredProjects = projectOptions.filter((project) =>
                                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                project.code.toLowerCase().includes(searchQuery.toLowerCase())
                              );

                              return (
                                <FormItem>
                                  <FormLabel>Project</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select project" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <div className="px-2 pb-2">
                                        <Input
                                          placeholder="Search projects..."
                                          value={searchQuery}
                                          onChange={(e) => {
                                            setProjectSearchQuery((prev) => ({
                                              ...prev,
                                              [index]: e.target.value,
                                            }));
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-8"
                                        />
                                      </div>
                                      {filteredProjects.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          No projects found
                                        </div>
                                      ) : (
                                        filteredProjects.map((project) => (
                                          <SelectItem
                                            key={project.id}
                                            value={project.id.toString()}
                                          >
                                            {project.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`projectEntries.${index}.hoursSpent`}
                          render={({ field }) => {
                            const selectedDeptCode = form.watch(
                              `projectEntries.${index}.currentWorkingDepartment`
                            );
                            const selectedProjId = form.watch(
                              `projectEntries.${index}.projectId`
                            );
                            const projectOptionsLocal =
                              projectsByDept[selectedDeptCode] || [];
                            const selectedProject = projectOptionsLocal.find(
                              (p) => p.id.toString() === selectedProjId
                            );
                            const isAdHoc =
                              selectedProject?.name === "Ad-hoc tasks";
                            const perProjectMax = isAdHoc
                              ? 2
                              : VALIDATION.MAX_HOURS_PER_ENTRY;
                            return (
                              <FormItem>
                                <FormLabel>Hours Spent</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step={VALIDATION.HOURS_INPUT_STEP}
                                    min="0"
                                    max={perProjectMax}
                                    placeholder="0.0"
                                    {...field}
                                    value={
                                      field.value === undefined || field.value === null
                                          ? ""
                                          : typeof field.value === "number"
                                          ? String(field.value)
                                          : field.value
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const cleaned = raw.replace(/[^\d.]/g, "");
                                      const parts = cleaned.split(".");
                                      const intPart = parts[0].slice(0, 2);
                                      const fracPart = parts[1] ? parts[1].slice(0, 2) : undefined;
                                      const normalized =
                                        fracPart !== undefined ? `${intPart}.${fracPart}` : intPart;
                                      const num = normalized === "" ? 0 : parseFloat(normalized);
                                      let valueNum = Number.isFinite(num) ? num : 0;
                                      // enforce per-project cap (2 hours for Ad-hoc)
                                      if (isAdHoc && valueNum > 2) {
                                        valueNum = 2;
                                      }
                                      if (valueNum > VALIDATION.MAX_HOURS_PER_ENTRY) {
                                        valueNum = VALIDATION.MAX_HOURS_PER_ENTRY;
                                      }
                                      field.onChange(valueNum);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name={`projectEntries.${index}.taskDescription`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe your task, achievements, and progress made..."
                                  className="min-h-[100px] resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Provide a detailed description of your work
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Total Hours Validation Error */}
                  {form.formState.errors.projectEntries?.root && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Error</AlertTitle>
                      <AlertDescription>
                        {form.formState.errors.projectEntries.root.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4">
                    <Button
                      type="button"
                      variant="noShadow"
                      size="lg"
                      onClick={addProjectEntry}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Project Entry
                    </Button>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Submitting..."
                        : "Submit Activity Logger"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </>
  );
}

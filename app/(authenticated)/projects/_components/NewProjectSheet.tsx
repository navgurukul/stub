"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import type { Project } from "./ProjectsTable";

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
] as const;

const formSchema = z
  .object({
    name: z.string().min(3, "Project name must be at least 3 characters"),
    status: z.string().min(1, "Please select a project status"),
    departmentId: z.number().int().positive("Please select a department"),
    projectManagerId: z
      .number()
      .int()
      .positive("Please select a project manager"),
    // allow startDate to be empty when user doesn't pick a date
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    budgetAmount: z
      .number()
      .int()
      .nonnegative("Budget must be non-negative")
      .optional(),
    slackChannelId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Manager {
  id: number;
  name: string;
  email: string;
}

interface NewProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialProject?: Partial<Project> | null;
}

export function NewProjectSheet({
  open,
  onOpenChange,
  onSuccess,
  initialProject,
}: NewProjectSheetProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [managerSearchValue, setManagerSearchValue] = useState("");
  const [managerComboboxOpen, setManagerComboboxOpen] = useState(false);
  const [selectedManagerName, setSelectedManagerName] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      status: "active",
      departmentId: undefined,
      projectManagerId: undefined,
      startDate: undefined,
      endDate: undefined,
      budgetAmount: 0,
      slackChannelId: "",
    },
  });

  // Fetch departments
  useEffect(() => {
    if (!open || !user?.orgId) return;

    async function fetchDepartments() {
      setIsLoadingDepartments(true);
      try {
        const response = await apiClient.get(API_PATHS.DEPARTMENTS, {
          params: { orgId: user?.orgId },
        });

        const departmentList = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setDepartments(departmentList);
      } catch (error: any) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments", {
          description: "Unable to fetch department list. Please try again.",
        });
      } finally {
        setIsLoadingDepartments(false);
      }
    }

    fetchDepartments();
  }, [open, user?.orgId]);

  // Fetch managers with search filtering
  useEffect(() => {
    if (!open || !user?.orgId) return;

    // Only fetch if user has entered a search term
    if (!managerSearchValue.trim()) {
      setManagers([]);
      return;
    }

    const fetchManagers = async () => {
      setIsLoadingManagers(true);
      try {
        const params: Record<string, string | number> = {
          orgId: user.orgId || "",
          q: managerSearchValue.trim(),
        };

        const response = await apiClient.get(API_PATHS.MANAGERS, {
          params,
        });

        const managerList = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setManagers(managerList);
      } catch (error: any) {
        console.error("Error fetching managers:", error);
        setManagers([]);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchManagers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [open, managerSearchValue, user?.orgId]);
  useEffect(() => {
    if (!open) return;
    if (initialProject) {
      form.reset({
        name: initialProject.name || "",
        status: (initialProject.status as string) || "active",
        departmentId: (initialProject.department?.id as number) || undefined,
        projectManagerId: (initialProject.projectManager?.id as number) || undefined,
        startDate: initialProject.startDate ? new Date(initialProject.startDate as string) : undefined,
        endDate: initialProject.endDate ? new Date(initialProject.endDate as string) : undefined,
        budgetAmount:
          (initialProject.budgetAmountMinor as any) !== undefined
            ? (initialProject.budgetAmountMinor as any)
            : (initialProject.budgetAmount as any) || 0,
        slackChannelId: (initialProject as any).slackChannelId || "",
      });

      setSelectedManagerName(initialProject.projectManager?.name || "");
    } else {
      form.reset({
        name: "",
        status: "active",
        departmentId: undefined,
        projectManagerId: undefined,
        startDate: undefined,
        endDate: undefined,
        budgetAmount: 0,
        slackChannelId: "",
      });
      setSelectedManagerName("");
    }
  }, [open, initialProject]);

  const isEditing = initialProject?.id !== undefined && initialProject?.id !== null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user?.orgId) {
      toast.error("Organization ID not found. Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        orgId: user.orgId,
        name: values.name,
        code: values.name ? String(values.name).trim().slice(0, 50) : undefined,
        status: values.status,
        departmentId: values.departmentId,
        projectManagerId: values.projectManagerId,
        startDate: values.startDate ? format(values.startDate, DATE_FORMATS.API) : undefined,
        endDate: values.endDate ? format(values.endDate, DATE_FORMATS.API) : undefined,
        budgetCurrency: "INR",
        budgetAmountMinor: values.budgetAmount !== undefined && values.budgetAmount !== null ? values.budgetAmount : undefined,
      };

      let response;
      if (isEditing) {
        // Use PATCH to update
        response = await apiClient.patch(`${API_PATHS.PROJECTS}/${initialProject?.id}`, payload);
      } else {
        // Create
        response = await apiClient.post(API_PATHS.PROJECTS, payload);
      }

      if (response && (response.status === 200 || response.status === 201 || response.status === 204)) {
        toast.success(isEditing ? "Project updated successfully!" : "Project created successfully!", {
          description: isEditing ? "The project has been updated." : "The new project has been added to your organization.",
        });

        form.reset();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create/update project. Please try again.";
      toast.error(isEditing ? "Update failed" : "Creation failed", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Project" : "Create New Project"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Modify project details and save the changes." : "Add a new project to your organization. Fill in the required details below."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Form {...form}>
            <form
              id="new-project-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* Project Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Project Information</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        value={field.value?.toString()}
                        disabled={isLoadingDepartments}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingDepartments
                                  ? "Loading departments..."
                                  : "Select department"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem
                              key={dept.id}
                              value={dept.id.toString()}
                            >
                              {dept.name} ({dept.code})
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
                  name="projectManagerId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Project Manager</FormLabel>
                      <Popover
                        open={managerComboboxOpen}
                        onOpenChange={setManagerComboboxOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="noShadow"
                              role="combobox"
                              aria-expanded={managerComboboxOpen}
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? selectedManagerName
                                : "Select project manager"}
                              <ChevronsUpDown />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-(--radix-popover-trigger-width) overflow-y-auto p-0 border-0"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Type to search..."
                              value={managerSearchValue}
                              onValueChange={setManagerSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {isLoadingManagers
                                  ? "Loading..."
                                  : managerSearchValue.trim()
                                  ? "No managers found."
                                  : "Type to search managers..."}
                              </CommandEmpty>
                              <CommandGroup>
                                {managers.map((manager) => (
                                  <CommandItem
                                    key={manager.id}
                                    value={manager.id.toString()}
                                    onSelect={() => {
                                      field.onChange(manager.id);
                                      setManagerComboboxOpen(false);
                                      setManagerSearchValue("");
                                      setSelectedManagerName(manager.name);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === manager.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {manager.name} ({manager.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Budget & Integration Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Budget & Integration</h3>

                <FormField
                  control={form.control}
                  name="budgetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Amount (INR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter budget amount in paise"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slackChannelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slack Channel ID (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Slack channel ID"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link this project to a Slack channel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="neutral"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="new-project-form" disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Project"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
   );
 }

"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { VALIDATION } from "@/lib/constants";
import type { Project, Department, ProjectEntryCardProps } from "@/lib/tracker-types";

export function ProjectEntryCard({
  form,
  index,
  fieldCount,
  departments,
  projectsByDept,
  projectSearchQuery,
  hoursInput,
  onDepartmentChange,
  onProjectSearchChange,
  onHoursInputChange,
  onHoursBlur,
  onRemove,
}: ProjectEntryCardProps) {
  const selectedDeptCode = form.watch(
    `projectEntries.${index}.currentWorkingDepartment`
  );
  const selectedProjectId = form.watch(`projectEntries.${index}.projectId`);
  const isProjectEnabled = Boolean(selectedDeptCode);
  const isHoursAndDescriptionEnabled = Boolean(selectedProjectId);

  return (
    <div className="p-4 border-2 border-border rounded-base space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Project Entry #{index + 1}</h4>
        {fieldCount > 1 && (
          <Button
            type="button"
            variant="noShadow"
            size="sm"
            onClick={() => onRemove(index)}
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
              <FormLabel>Project Department</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  onDepartmentChange(index, value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the department for this project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.code}>
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
            const projectOptions = projectsByDept[selectedDeptCode] || [];
            const searchQuery = projectSearchQuery[index] || "";
            const filteredProjects = projectOptions.filter(
              (project) =>
                project.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                project.code.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!isProjectEnabled}
                >
                  <FormControl>
                    <SelectTrigger disabled={!isProjectEnabled}>
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) =>
                          onProjectSearchChange(index, e.target.value)
                        }
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
                        <SelectItem key={project.id} value={project.id.toString()}>
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
        render={({ field, fieldState }) => {
          const projectOptionsLocal = projectsByDept[selectedDeptCode] || [];
          const selectedProject = projectOptionsLocal.find(
            (p) => p.id.toString() === selectedProjectId
          );
          const isAdHoc = selectedProject?.name === "Ad-hoc tasks";
          const perProjectMax = isAdHoc
            ? 2
            : VALIDATION.MAX_HOURS_PER_ENTRY;

          const display =
            hoursInput[index] ??
            (field.value === undefined || field.value === null
              ? ""
              : String(field.value));
          const maxIntLen = String(perProjectMax).length;

          return (
            <FormItem>
              <FormLabel>Hours Spent</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0.0"
                  disabled={!isHoursAndDescriptionEnabled}
                  value={display}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9.]/g, "");
                    const dot = value.indexOf(".");
                    if (dot !== -1) {
                      value =
                        value.slice(0, dot + 1) +
                        value.slice(dot + 1).replace(/\./g, "");
                    }
                    value = value.replace(/^0+(?=\d)/, "");
                    const parts = value.split(".");
                    if (parts[0].length > maxIntLen) {
                      parts[0] = parts[0].slice(0, maxIntLen);
                      value = parts.join(".");
                    }
                    const intVal = parseInt(parts[0] || "0", 10);
                    if (!Number.isNaN(intVal) && intVal >= perProjectMax) {
                      value = String(perProjectMax);
                    } else if (parts[1]) {
                      value = `${parts[0]}.${parts[1].slice(0, 1)}`;
                    }
                    onHoursInputChange(index, value);
                  }}
                  onBlur={async () => {
                    field.onBlur();
                    onHoursBlur(index, perProjectMax, isAdHoc);
                    await form.trigger(`projectEntries.${index}.hoursSpent`);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isAdHoc
                  ? "Ad hoc task entries are limited to a maximum of 2 hours per day."
                  : "Maximum 12 hours total across all entries for the day."}
              </FormDescription>
              {(fieldState.isTouched || fieldState.isDirty) && <FormMessage />}
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name={`projectEntries.${index}.taskDescription`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Task Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe your task, achievements, and progress made..."
                className="min-h-[100px] resize-none"
                disabled={!isHoursAndDescriptionEnabled}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  form.trigger(`projectEntries.${index}.taskDescription`);
                }}
              />
            </FormControl>
            <FormDescription>
              Provide a detailed description of your work
            </FormDescription>
            {(fieldState.isTouched || fieldState.isDirty) && <FormMessage />}
          </FormItem>
        )}
      />
    </div>
  );
}

/**
 * ActivityEntryCard Component
 * Displays individual timesheet or leave entry details
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export interface TimesheetEntry {
  id: number;
  projectId: number;
  projectName: string;
  departmentId: number;
  departmentName: string;
  taskTitle: string | null;
  taskDescription: string;
  hours: number;
  tags: string[];
}

export interface LeaveEntry {
  requestId: number;
  state: "pending" | "approved" | "rejected";
  durationType: "full_day" | "half_day";
  halfDaySegment: "first_half" | "second_half" | null;
  hours: number;
  leaveType: {
    id: number;
    code: string;
    name: string;
  };
}

interface ActivityEntryCardProps {
  type: "timesheet" | "leave";
  entry: TimesheetEntry | LeaveEntry;
}

export function ActivityEntryCard({ type, entry }: ActivityEntryCardProps) {
  if (type === "timesheet") {
    const timesheetEntry = entry as TimesheetEntry;
    return (
      <Card className="bg-main">
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-base">
                  {timesheetEntry.projectName}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {timesheetEntry.departmentName}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <span className="text-lg">{timesheetEntry.hours}</span>
                <span className="text-muted-foreground">
                  {timesheetEntry.hours === 1 ? "hr" : "hrs"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                {timesheetEntry.taskDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Leave entry
  const leaveEntry = entry as LeaveEntry;

  return (
    <Card className="bg-subtle-background">
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-base">
                  {leaveEntry.leaveType.name}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {leaveEntry.durationType === "half_day"
                  ? `Half Day (${
                      leaveEntry.halfDaySegment === "first_half"
                        ? "First Half"
                        : "Second Half"
                    })`
                  : "Full Day"}
              </p>
            </div>
            <Badge
              variant={leaveEntry.state === "approved" ? "default" : "neutral"}
            >
              {leaveEntry.state.charAt(0).toUpperCase() +
                leaveEntry.state.slice(1)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

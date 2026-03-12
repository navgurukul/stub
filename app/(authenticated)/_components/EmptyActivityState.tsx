/**
 * EmptyActivityState Component
 * Shown when no activities exist for selected date or month
 */

import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyActivityStateProps {
  variant?: "date" | "month";
  canAddActivity?: boolean;
  canAddLeave?: boolean;
}

export function EmptyActivityState({
  variant = "date",
  canAddActivity = false,
  canAddLeave = false,
}: EmptyActivityStateProps) {
  const hasNoActions = !canAddActivity && !canAddLeave;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Calendar className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {variant === "date"
          ? hasNoActions
            ? "No actions available"
            : "No activities tracked"
          : "No activities this month"}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {variant === "date"
          ? hasNoActions
            ? "Activities can only be tracked within the last 3 days, and leaves cannot be applied for non-working days or future dates."
            : !canAddActivity && canAddLeave
            ? "Activities can only be tracked within the last 3 days. You can apply for leave for this date."
            : canAddActivity && !canAddLeave
            ? "You can track activities for this date. Leaves cannot be applied for non-working days."
            : "You haven't tracked any activities for this date. Start tracking your work or apply for leave."
          : "You haven't tracked any activities this month. Create your first entry to get started."}
      </p>
      {(canAddActivity || canAddLeave) && (
        <div className="flex gap-3">
          {canAddActivity && (
            <Link href="/tracker">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Activity
              </Button>
            </Link>
          )}
          {canAddLeave && (
            <Link href="/leaves/application">
              <Button variant={canAddActivity ? "neutral" : "default"}>
                <Plus className="mr-2 h-4 w-4" />
                Apply Leave
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

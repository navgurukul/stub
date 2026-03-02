/**
 * EmptyState Component
 * Displays message when no employees match current filters
 */

import { Users } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-heading font-semibold mb-2">
        No employees found
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Try adjusting your search or filter criteria to find what you&apos;re
        looking for.
      </p>
    </div>
  );
}

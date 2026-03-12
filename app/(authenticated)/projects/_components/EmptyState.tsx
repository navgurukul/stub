/**
 * EmptyState Component
 * Displays when no projects are found
 */

export function EmptyState() {
  return (
    <div className="rounded-base border-2 border-border">
    <div className="flex items-center justify-center h-[400px]">
      <div className="text-center">
        <p className="text-muted-foreground mb-2">No projects found</p>
        <p className="text-xs text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </div>
    </div>
    </div>
  );
}

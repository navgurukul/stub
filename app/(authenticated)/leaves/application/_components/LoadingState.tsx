/**
 * LoadingState Component
 * Displays skeleton loaders while allocated leaves data is being fetched
 */

import { TableLoadingState } from "@/components/ui/table-loading-state";

const ALLOCATED_LEAVES_TABLE_COLUMNS = [
  { header: "Leave Type", skeletonWidth: "w-32" },
  { header: "Balance", skeletonWidth: "w-16" },
  { header: "Booked", skeletonWidth: "w-16" },
  { header: "Pending", skeletonWidth: "w-16" },
];

export function LoadingState() {
  return (
    <div className="w-full">
      <TableLoadingState columns={ALLOCATED_LEAVES_TABLE_COLUMNS} rowCount={3} />
    </div>
  );
}

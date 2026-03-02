/**
 * LoadingState Component
 * Displays skeleton loaders while leave history data is being fetched
 */

import { TableLoadingState } from "@/components/ui/table-loading-state";

const LEAVE_TABLE_COLUMNS = [
  { header: "Leave Type", skeletonWidth: "w-32" },
  { header: "Start Date", skeletonWidth: "w-24" },
  { header: "End Date", skeletonWidth: "w-24" },
  { header: "Duration", skeletonWidth: "w-24" },
  { header: "Reason", skeletonWidth: "w-40" },
];

export function LoadingState() {
  return <TableLoadingState columns={LEAVE_TABLE_COLUMNS} />;
}

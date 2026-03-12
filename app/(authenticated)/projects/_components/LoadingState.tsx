/**
 * LoadingState Component
 * Displays skeleton loaders while project data is being fetched
 */

import { TableLoadingState } from "@/components/ui/table-loading-state";

const PROJECT_TABLE_COLUMNS = [
  { header: "Department", skeletonWidth: "w-32" },
  { header: "Project Name", skeletonWidth: "w-40" },
  { header: "PM Email", skeletonWidth: "w-40" },
  { header: "Budget", skeletonWidth: "w-32" },
  { header: "Status", skeletonWidth: "w-20" },
];

export function LoadingState() {
  return <TableLoadingState columns={PROJECT_TABLE_COLUMNS} />;
}

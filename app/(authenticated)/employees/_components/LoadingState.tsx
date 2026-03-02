/**
 * LoadingState Component
 * Displays skeleton loaders while employee data is being fetched
 */

import { TableLoadingState } from "@/components/ui/table-loading-state";

const EMPLOYEE_TABLE_COLUMNS = [
  { header: "Name", skeletonWidth: "w-32" },
  { header: "Email", skeletonWidth: "w-40" },
  { header: "Department", skeletonWidth: "w-24" },
  { header: "Employment Status", skeletonWidth: "w-20" },
  { header: "Work Location", skeletonWidth: "w-24" },
];

export function LoadingState() {
  return <TableLoadingState columns={EMPLOYEE_TABLE_COLUMNS} />;
}

/**
 * TableLoadingState Component
 * Shared skeleton loading state for table components
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableColumn {
  header: string;
  skeletonWidth: string;
}

interface TableLoadingStateProps {
  columns: TableColumn[];
  rowCount?: number;
}

export function TableLoadingState({
  columns,
  rowCount = 5,
}: TableLoadingStateProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((column, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className={`h-4 ${column.skeletonWidth}`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

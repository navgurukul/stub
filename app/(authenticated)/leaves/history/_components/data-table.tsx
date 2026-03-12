"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
// import { ChevronDown } from "lucide-react";

import * as React from "react";
import { Check, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuCheckboxItem,
//   DropdownMenuContent,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onUpdate?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onUpdate,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isBulkApproving, setIsBulkApproving] = React.useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = React.useState(false);

  const isBulkLoading = React.useMemo(
    () => isBulkApproving || isBulkRejecting,
    [isBulkApproving, isBulkRejecting]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      rowSelection,
    },
    meta: {
      onUpdate,
      isBulkOperationInProgress: isBulkLoading,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  const handleBulkApprove = async () => {
    const requestIds = selectedRows.map(
      (row) => (row.original as { id: number }).id
    );

    if (requestIds.length === 0) {
      toast.error("No requests selected", {
        description: "Please select at least one leave request to approve.",
      });
      return;
    }

    setIsBulkApproving(true);
    try {
      await apiClient.post(API_PATHS.LEAVES_BULK_APPROVE, {
        requestIds,
      });

      toast.success("Leave requests approved", {
        description: `Successfully approved ${requestIds.length} leave request${
          requestIds.length > 1 ? "s" : ""
        }.`,
      });

      table.resetRowSelection();

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error bulk approving leave requests:", error);
      toast.error("Failed to approve leave requests", {
        description:
          "Unable to approve the selected requests. Please try again.",
      });
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleBulkReject = async () => {
    const requestIds = selectedRows.map(
      (row) => (row.original as { id: number }).id
    );

    if (requestIds.length === 0) {
      toast.error("No requests selected", {
        description: "Please select at least one leave request to reject.",
      });
      return;
    }

    setIsBulkRejecting(true);
    try {
      await apiClient.post(API_PATHS.LEAVES_BULK_REJECT, {
        requestIds,
      });

      toast.success("Leave requests rejected", {
        description: `Successfully rejected ${requestIds.length} leave request${
          requestIds.length > 1 ? "s" : ""
        }.`,
      });

      table.resetRowSelection();

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error bulk rejecting leave requests:", error);
      toast.error("Failed to reject leave requests", {
        description:
          "Unable to reject the selected requests. Please try again.",
      });
    } finally {
      setIsBulkRejecting(false);
    }
  };

  return (
    <div className="w-full font-base text-main-foreground">
      {hasSelectedRows && (
        <div className="flex items-center justify-between py-3 px-4 bg-secondary-background rounded-md mb-4 border border-border">
          <div className="text-sm font-medium text-foreground">
            {selectedRows.length} request{selectedRows.length > 1 ? "s" : ""}{" "}
            selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleBulkApprove}
              disabled={isBulkLoading}
              size="sm"
            >
              {isBulkApproving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Approve Selected
                </>
              )}
            </Button>
            <Button
              variant="neutral"
              onClick={handleBulkReject}
              disabled={isBulkLoading}
              size="sm"
            >
              {isBulkRejecting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Rejecting...
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" /> Reject Selected
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {/* <div className="flex items-center justify-end py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="noShadow">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div> */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="font-heading">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="bg-secondary-background text-foreground"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead className="text-foreground" key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="bg-secondary-background text-foreground data-[state=selected]:bg-main data-[state=selected]:text-main-foreground"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="px-4 py-2" key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

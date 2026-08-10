import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageNumbers, AppPaginationProps } from "@/lib/pagination";

export function AppPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  loading = false,
  itemLabel = "item",
  itemLabelPlural = "items",
}: AppPaginationProps) {
  const showPagination = totalPages > 1;
  if (!showPagination || loading || total <= 0) return null;

  const pageNumbers = getPageNumbers(page, totalPages);
  const startRange = (page - 1) * limit + 1;
  const endRange = Math.min(page * limit, total);
  const label = total === 1 ? itemLabel : itemLabelPlural;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
      <div className="text-xs text-muted-foreground">
        Showing {startRange}-{endRange} of {total} {label}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => page > 1 && onPageChange(page - 1)}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pageNumbers.map((num, idx) =>
            num === "ellipsis" ? (
              <PaginationItem key={`ell-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={num}>
                <PaginationLink
                  onClick={() => onPageChange(num)}
                  isActive={page === num}
                  className="cursor-pointer"
                >
                  {num}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => page < totalPages && onPageChange(page + 1)}
              className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

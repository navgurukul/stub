"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "./LoadingState";

export interface AllocatedLeave {
  leaveType: string;
  balance: number;
  booked: number;
  pending: number;
  allocated: number;
}

interface AllocatedLeavesTableProps {
  leaves: AllocatedLeave[];
  isLoading?: boolean;
}

export function AllocatedLeavesTable({ leaves, isLoading = false }: AllocatedLeavesTableProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leave Type</TableHead>
             <TableHead className="text-center">Allocated</TableHead>
            <TableHead className="text-center">Balance</TableHead>
             <TableHead className="text-center">Pending Approval</TableHead>
            <TableHead className="text-center">Approved Leaves</TableHead>
           
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaves.map((leave) => (
            <TableRow key={leave.leaveType}>
              <TableCell className="font-medium">{leave.leaveType}</TableCell>
              <TableCell className="text-center">{leave.allocated}</TableCell>
              <TableCell className="text-center">{leave.balance}</TableCell>
               <TableCell className="text-center">{leave.pending}</TableCell>
              <TableCell className="text-center">{leave.booked}</TableCell>
             
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

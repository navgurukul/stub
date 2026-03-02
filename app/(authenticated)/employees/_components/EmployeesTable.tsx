/**
 * EmployeesTable Component
 * Displays employees in a table format
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  orgId: number;
  status: string;
  managerId: number | null;
  employeeDepartmentId: number;
  workLocationType: string;
  dateOfJoining: string;
  employmentType: string;
  employmentStatus: string;
  dateOfExit: string | null;
  slackId: string | null;
  alumniStatus: string | null;
  gender: string;
  discordId: string | null;
  rolePrimary: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  employeeDepartment: Department;
}

interface EmployeesTableProps {
  employees: Employee[];
}

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const getStatusVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "active") return "neutral";
    if (normalizedStatus === "inactive") return "default";
    return "neutral";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Employment Status</TableHead>
          <TableHead>Work Location</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.name}</TableCell>
            <TableCell className="max-w-xs truncate">
              {employee.email}
            </TableCell>
            <TableCell>{employee.employeeDepartment?.name || "-"}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(employee.employmentStatus)}>
                {employee.employmentStatus.charAt(0).toUpperCase() +
                  employee.employmentStatus.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>{employee.workLocationType}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

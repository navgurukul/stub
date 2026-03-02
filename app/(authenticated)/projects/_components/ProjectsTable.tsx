/**
 * ProjectsTable Component
 * Displays projects in a table format
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
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  department?: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  };
  projectManager?: {
    id: number;
    name: string;
    email: string;
  };
  budgetAmount?: string;
  budgetAmountMinor?: string;
  budgetCurrency?: string;
  startDate?: string;
  endDate?: string | null;
  members?: any[];
}

interface ProjectsTableProps {
  projects: Project[];
    onEditProject?: (projectId: string) => void; 
}

export function ProjectsTable({ projects,onEditProject }: ProjectsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Department</TableHead>
          <TableHead>Project Name</TableHead>
          <TableHead>PM Email</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Status</TableHead>
          <TableHead >Edit</TableHead> 
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            
            <TableCell className="font-medium">
              {project.department?.name || "-"}
            </TableCell>
            <TableCell>{project.name}</TableCell>
            <TableCell>{project.projectManager?.email || "-"}</TableCell>
            <TableCell>
              {project.budgetCurrency && (project.budgetAmount ?? project.budgetAmountMinor) ? (
                `${project.budgetCurrency} ${project.budgetAmount ?? project.budgetAmountMinor}`
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  project.status.toLowerCase() === "active"
                    ? "default"
                    : "neutral"
                }
                className={
                  project.status.toLowerCase() === "archived"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                    : ""
                }
              >
                {project.status.charAt(0).toUpperCase() +
                  project.status.slice(1)}
              </Badge>
            </TableCell>

            <TableCell className="py-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${project.name}`}
                onClick={() => onEditProject?.(String(project.id))}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

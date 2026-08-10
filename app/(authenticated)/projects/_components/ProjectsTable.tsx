import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, ProjectsTableProps } from "@/lib/project-types";


const ToggleSwitch = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-[24px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-0 disabled:opacity-50 ${
        checked ? "bg-foreground" : "bg-border"
      } p-[2px]`}
    >
      <span
        className={`pointer-events-none block h-[18px] w-[18px] rounded-full transition-all duration-200 ${
          checked ? "translate-x-[22px] bg-background" : "translate-x-[2px] bg-background"
        }`}
      />
    </button>
  );
};

const formatChannel = (channelId: string | null | undefined) => {
  if (!channelId || channelId.trim() === "") return "—";
  return channelId.startsWith("#") ? channelId : `#${channelId}`;
};

export function ProjectsTable({
  projects,
  onEditProject,
  onToggleStatus,
}: ProjectsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#e4e4e7] hover:bg-transparent">
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Project Name</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Department</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Status</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Project Manager</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Budget</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Slack Channel</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Discord Channel</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-left">Last Updated</TableHead>
          <TableHead className="font-bold text-foreground py-3.5 px-4 text-right pr-6">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const isStatusActive = project.status.toLowerCase() === "active";
          const budgetVal = project.budgetAmountMinor !== undefined && project.budgetAmountMinor !== null
            ? Number(project.budgetAmountMinor)
            : project.budgetAmount !== undefined && project.budgetAmount !== null
            ? Number(project.budgetAmount)
            : 0;

          return (
            <TableRow key={project.id} className="hover:bg-secondary-background/50 border-b border-[#e4e4e7]">
              <TableCell className="font-medium text-neutral-900 py-4 px-4 text-left">
                {project.name}
              </TableCell>
              <TableCell className="text-neutral-700 py-4 px-4 text-left">
                {project.department?.name || "—"}
              </TableCell>
              <TableCell className="py-4 px-4 text-left">
                <ToggleSwitch
                  checked={isStatusActive}
                  onChange={() => onToggleStatus?.(project)}
                />
              </TableCell>
              <TableCell className="text-neutral-700 py-4 px-4 text-left">
                {project.projectManager?.name || project.projectManager?.email || "—"}
              </TableCell>
              <TableCell className="font-medium text-neutral-900 py-4 px-4 text-left">
                ₹{budgetVal.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-neutral-700 py-4 px-4 text-left">
                <div className="max-w-[180px] overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
                  {formatChannel(project.slackChannelId)}
                </div>
              </TableCell>
              <TableCell className="text-neutral-700 py-4 px-4 text-left">
                <div className="max-w-[180px] overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
                  {formatChannel(project.discordChannelId)}
                </div>
              </TableCell>
              <TableCell className="text-neutral-500 py-4 px-4 text-left">
                {project.updatedAt
                  ? new Date(project.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>
              <TableCell className="py-4 px-4 text-right pr-6">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 gap-1.5 px-3 border border-[#e4e4e7] hover:bg-neutral-100 text-xs text-neutral-800 font-medium bg-white rounded-lg flex items-center justify-center cursor-pointer shadow-none"
                    onClick={() => onEditProject?.(String(project.id))}
                  >
                    <Edit className="h-3.5 w-3.5 text-neutral-600" />
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

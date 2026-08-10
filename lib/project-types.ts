import React from "react";

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
  slackChannelId?: string | null;
  discordChannelId?: string | null;
  members?: any[];
}

export interface ProjectsTableProps {
  projects: Project[];
  onEditProject?: (projectId: string) => void;
  onToggleStatus?: (project: Project) => void;
}

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface Manager {
  id: number;
  name: string;
  email: string;
}

export interface NewProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialProject?: Partial<Project> | null;
}

export interface ProjectFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

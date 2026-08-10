import React from "react";

export interface EmployeeReportee {
  manager?: string;
  name?: string;
  email: string;
  department: string | null;
  reporteesCount: number;
  reportees?: EmployeeReportee[];
}

export interface FlatEmployee {
  email: string;
  name: string;
  department: string | null;
  managerName?: string;
  reporteesCount: number;
}

export interface TreeNodeProps {
  node: EmployeeReportee;
  expandedKeys: Set<string>;
  onToggle: (email: string) => void;
  searchQuery: string;
  matchedEmails: Set<string>;
  focusedEmail: string | null;
  onSelectNode: (email: string) => void;
}

export interface TeamCanvasProps {
  filteredData: EmployeeReportee[];
  expandedKeys: Set<string>;
  onToggle: (email: string) => void;
  searchQuery: string;
  matchedEmails: Set<string>;
  focusedEmail: string | null;
  onSelectNode: (email: string) => void;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}

export interface TeamBreadcrumbsProps {
  focusedEmail: string | null;
  setFocusedEmail: (email: string | null) => void;
  data: EmployeeReportee[];
}

export interface TeamSearchProps {
  data: EmployeeReportee[];
  flatEmployees: FlatEmployee[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  focusedEmail: string | null;
  setFocusedEmail: (email: string | null) => void;
  setExpandedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleResetView: () => void;
}

export interface TeamStructureContentProps {
  loading: boolean;
  error: string | null;
  filteredData: EmployeeReportee[];
  searchQuery: string;
  expandedKeys: Set<string>;
  onToggle: (email: string) => void;
  matchedEmails: Set<string>;
  focusedEmail: string | null;
  onSelectNode: (email: string) => void;
  onResetView: () => void;
  onTryAgain: () => void;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}

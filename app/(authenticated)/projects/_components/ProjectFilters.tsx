/**
 * ProjectFilters Component
 * Filter controls for project search and status filtering
 */

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_hold", label: "On_hold" },
   { value: "completed", label: "Completed" },
];

interface ProjectFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function ProjectFilters({
  statusFilter,
  onStatusChange,
  searchInput,
  onSearchInputChange,
  onSearchKeyPress,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects..."
          className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={onSearchKeyPress}
        />
      </div>
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* <Button variant="noShadow" onClick={onSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button> */}
      </div>
    </div>
  );
}

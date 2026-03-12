/**
 * EmployeeFilters Component
 * Filter controls for employee search and filtering
 */

import { Search, X, CornerDownLeft, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface Manager {
  id: number;
  name: string;
}

interface EmployeeFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  managerFilter: string;
  onManagerFilterChange: (value: string) => void;
}

export function EmployeeFilters({
  searchInput,
  onSearchInputChange,
  onSearch,
  onClearSearch,
  onSearchKeyPress,
  managerFilter,
  onManagerFilterChange,
}: EmployeeFiltersProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [managerSearchValue, setManagerSearchValue] = useState("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [selectedManagerName, setSelectedManagerName] = useState<string>("");

  // Fetch managers with debouncing - only when user types
  useEffect(() => {
    // Only fetch if user has entered a search term
    if (!managerSearchValue.trim()) {
      setManagers([]);
      return;
    }

    const fetchManagers = async () => {
      if (!user?.orgId) return;

      setManagersLoading(true);
      try {
        const params: Record<string, string | number> = {
          orgId: user.orgId,
          q: managerSearchValue.trim(),
        };

        const response = await apiClient.get<{ data: Manager[] }>(
          API_PATHS.MANAGERS,
          { params }
        );

        if (response.data && Array.isArray(response.data.data)) {
          setManagers(response.data.data);
        } else {
          setManagers([]);
        }
      } catch (error) {
        console.error("Error fetching managers:", error);
        setManagers([]);
      } finally {
        setManagersLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchManagers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [managerSearchValue, user?.orgId]);

  // Show clear button only when a specific manager is selected
  const showClearButton = managerFilter !== "all";

  const handleClearManager = () => {
    onManagerFilterChange("all");
    setSelectedManagerName("");
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email..."
            className="pl-8 pr-8"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyPress={onSearchKeyPress}
          />
          {searchInput && (
            <button
              onClick={onClearSearch}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="noShadow" onClick={onSearch}>
            <CornerDownLeft strokeWidth={3} />
            Search
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 md:flex-initial">
          {showClearButton ? (
            <div className="relative w-full md:w-[250px]">
              <Badge className="block font-normal w-full text-sm text-muted-foreground py-2.5 pr-10 hover:text-foreground">
                <div className="truncate">
                  Manager:
                  <span className="font-medium ml-1">{selectedManagerName}</span>
                </div>
              </Badge>
              <button
                onClick={handleClearManager}
                aria-label="Clear manager filter"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="transparent"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between font-normal w-full md:w-[250px] text-muted-foreground hover:text-foreground"
                >
                  All Managers
                  <ChevronsUpDown />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] border-0 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type to search..."
                    value={managerSearchValue}
                    onValueChange={setManagerSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {managersLoading
                        ? "Loading..."
                        : managerSearchValue.trim()
                        ? "No managers found."
                        : "Type to search managers..."}
                    </CommandEmpty>
                    <CommandGroup>
                      {managers.map((manager) => (
                        <CommandItem
                          key={manager.id}
                          value={manager.id.toString()}
                          onSelect={(currentValue) => {
                            onManagerFilterChange(currentValue);
                            setSelectedManagerName(manager.name);
                            setOpen(false);
                            setManagerSearchValue("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              managerFilter === manager.id.toString()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {manager.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

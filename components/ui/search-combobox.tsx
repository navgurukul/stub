"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

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

export interface SearchComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: SearchComboboxOption) => void;
  fetchOptions: (query: string) => Promise<SearchComboboxOption[]>;
  onSubmitValue?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  minQueryLength?: number;
  disabled?: boolean;
  className?: string;
}

export function SearchCombobox({
  value,
  onValueChange,
  onSelect,
  fetchOptions,
  onSubmitValue,
  placeholder = "Search...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No results found.",
  minQueryLength = 2,
  disabled = false,
  className,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<SearchComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < minQueryLength) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchOptions(trimmedQuery);
        if (!cancelled) {
          setOptions(data);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fetchOptions, minQueryLength, open, query]);

  const resolvedEmptyMessage = useMemo(() => {
    if (loading) return "Loading...";
    if (query.trim().length < minQueryLength) {
      return `Type at least ${minQueryLength} characters...`;
    }
    return emptyMessage;
  }, [emptyMessage, loading, minQueryLength, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 justify-between rounded-md border-input bg-background px-3 text-sm font-normal",
            !query && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{query || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="border-0 p-0 pointer-events-auto"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={(nextValue) => {
              setQuery(nextValue);
              onValueChange(nextValue);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const normalizedValue = query.trim();
              if (!normalizedValue || !onSubmitValue) return;
              onSubmitValue(normalizedValue);
              setOpen(false);
            }}
            placeholder={searchPlaceholder}
          />
          <CommandList
            className="max-h-60 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <CommandEmpty>{resolvedEmptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={`${option.value}-${option.label}`}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {option.description
                        ? `${option.label} (${option.description})`
                        : option.label}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

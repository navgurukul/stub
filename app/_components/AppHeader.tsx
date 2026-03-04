"use client";

import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

interface AppHeaderProps {
  crumbs: Crumb[];
  className?: string;
  right?: React.ReactNode;
}

export function AppHeader({ crumbs, className, right }: AppHeaderProps) {
  const lastIndex = crumbs.length - 1;

  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 bg-white border-b border-[#E9E9E7] px-2",
        className
      )}
    >
      <div className="flex items-center gap-1 px-2">
        <SidebarTrigger className="-ml-1 size-7 text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[4px]" />
        <div className="w-px h-4 bg-[#E9E9E7] mx-1" />
        <Breadcrumb>
          <BreadcrumbList className="gap-1">
            {crumbs.map((crumb, i) => {
              const isLast = i === lastIndex;
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="text-sm font-medium text-[#37352F]">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={crumb.href ?? "#"}
                        className="text-sm text-[#9B9A97] hover:text-[#37352F] transition-colors"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator className="text-[#E9E9E7]" />
                  )}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-3 flex items-center gap-1">{right}</div>
    </header>
  );
}

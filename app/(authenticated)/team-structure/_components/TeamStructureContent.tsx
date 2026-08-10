"use client";

import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeReportee, TeamStructureContentProps } from "@/lib/team-structure-type";
import { TeamCanvas } from "./TeamCanvas";

export function TeamStructureContent({
  loading,
  error,
  filteredData,
  searchQuery,
  expandedKeys,
  onToggle,
  matchedEmails,
  focusedEmail,
  onSelectNode,
  onResetView,
  onTryAgain,
  pan,
  setPan,
  zoom,
  setZoom,
}: TeamStructureContentProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading team structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full flex-col items-center justify-center min-h-[400px] p-6 border border-dashed border-destructive/30 rounded-2xl bg-destructive/5 text-center max-w-md mx-auto gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Failed to Load Chart</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button size="sm" onClick={onTryAgain} className="rounded-lg">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <TeamCanvas
      filteredData={filteredData}
      expandedKeys={expandedKeys}
      onToggle={onToggle}
      searchQuery={searchQuery}
      matchedEmails={matchedEmails}
      focusedEmail={focusedEmail}
      onSelectNode={onSelectNode}
      pan={pan}
      setPan={setPan}
      zoom={zoom}
      setZoom={setZoom}
    />
  );
}

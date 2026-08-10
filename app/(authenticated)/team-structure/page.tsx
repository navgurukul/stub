"use client";

import React, { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import { EmployeeReportee, FlatEmployee } from "@/lib/team-structure-type";
import { TeamSearch } from "./_components/TeamSearch";
import { TeamBreadcrumbs } from "./_components/TeamBreadcrumbs";
import { TeamStructureContent } from "./_components/TeamStructureContent";
import {
  buildTree,
  filterTree,
  flattenTree,
  getAllEmails,
} from "@/lib/team-structure-utils";

export default function TeamStructurePage() {
  const [data, setData] = useState<EmployeeReportee[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeeReportee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [matchedEmails, setMatchedEmails] = useState<Set<string>>(new Set());
  const [focusedEmail, setFocusedEmail] = useState<string | null>(null);
  const [flatEmployees, setFlatEmployees] = useState<FlatEmployee[]>([]);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<EmployeeReportee[]>(API_PATHS.MANAGERS_WITH_REPORTEES);
      const responseData = Array.isArray(res.data) ? res.data : [];
      const unifiedTree = buildTree(responseData);
      setData(unifiedTree);
      setFilteredData(unifiedTree);

      const flatList = flattenTree(unifiedTree);
      setFlatEmployees(flatList);
      setExpandedKeys(new Set());
      setError(null);
    } catch (err) {
      console.error("Error fetching team structure:", err);
      setError("Failed to load team structure. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const { filtered, matchedEmails: matched } = filterTree(data, searchQuery);
      setFilteredData(filtered);
      setMatchedEmails(matched);

      const allFilteredEmails = getAllEmails(filtered);
      setExpandedKeys(new Set(allFilteredEmails));
    } else {
      setFilteredData(data);
      setMatchedEmails(new Set());
      setExpandedKeys(new Set());
    }
  }, [searchQuery, data]);

  const handleToggle = (email: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const handleResetView = () => {
    setSearchQuery("");
    setExpandedKeys(new Set());
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFocusedEmail(null);
  };

  const headerAction = (
    <TeamSearch
      data={data}
      flatEmployees={flatEmployees}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      focusedEmail={focusedEmail}
      setFocusedEmail={setFocusedEmail}
      setExpandedKeys={setExpandedKeys}
      handleResetView={handleResetView}
    />
  );

  return (
    <>
      <AppHeader crumbs={[{ label: "Team Structure" }]} right={headerAction} />
      <PageWrapper className="p-0 h-[calc(100vh-2.75rem)] min-h-0">
        <div className="h-full w-full flex flex-col relative">
          <div className="absolute top-4 left-6 z-10 pointer-events-auto">
            <TeamBreadcrumbs
              focusedEmail={focusedEmail}
              setFocusedEmail={setFocusedEmail}
              data={data}
            />
          </div>

          {/* Main Content Area */}
          <div className="w-full h-full flex-1 min-h-0">
            <TeamStructureContent
              loading={loading}
              error={error}
              filteredData={filteredData}
              searchQuery={searchQuery}
              expandedKeys={expandedKeys}
              onToggle={handleToggle}
              matchedEmails={matchedEmails}
              focusedEmail={focusedEmail}
              onSelectNode={setFocusedEmail}
              onResetView={handleResetView}
              onTryAgain={fetchTeamData}
              pan={pan}
              setPan={setPan}
              zoom={zoom}
              setZoom={setZoom}
            />
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppHeader } from "@/app/_components/AppHeader";
import { PageWrapper } from "@/app/_components/wrapper";
import {
  AllocatedLeavesTable,
  type AllocatedLeave,
} from "./_components/AllocatedLeavesTable";
import { LeaveApplicationForm } from "./_components/LeaveApplicationForm";
import apiClient from "@/lib/api-client";
import { API_PATHS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

// TypeScript interfaces for API response
interface LeaveType {
  id: number;
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
}

interface LeaveBalanceItem {
  id: number;
  leaveTypeId: number;
  balanceHours: number;
  pendingHours: number;
  bookedHours: number;
  asOfDate: string;
  leaveType: LeaveType;
}

interface LeaveBalancesResponse {
  userId: number;
  balances: LeaveBalanceItem[];
}

export default function LeaveApplicationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [allocatedLeaves, setAllocatedLeaves] = useState<AllocatedLeave[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaveBalances = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_PATHS.LEAVES_BALANCES);

      // Defensive check for response structure
      const data = response.data as LeaveBalancesResponse | undefined;
      const balances = Array.isArray(data?.balances) ? data.balances : [];

      // Transform API data to match AllocatedLeavesTable format
      const mapped: AllocatedLeave[] = balances.map((balance) => ({
        leaveType:
          balance.leaveType?.name ?? balance.leaveType?.code ?? "Unknown",
        balance: balance.balanceHours / 8,
        booked: balance.bookedHours / 8,
        pending: balance.pendingHours / 8,
      }));

      setAllocatedLeaves(mapped);
    } catch (error) {
      console.error("Error fetching leave balances:", error);
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : error instanceof Error
          ? error.message
          : "Failed to load leave balances.";
      toast.error("Failed to load leave balances", {
        description: errorMessage,
      });
      setAllocatedLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leave balances from API
  useEffect(() => {
    if (authLoading) return;

    fetchLeaveBalances();
  }, [authLoading]);

  return (
    <>
      <AppHeader
        crumbs={[
          { label: "Leave Application" },
        ]}
      />
      <PageWrapper>
        <div className="w-full p-4 flex flex-col gap-4">
          <div className="mx-auto w-full min-w-[120px] max-w-[80vw] sm:max-w-xs md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <span className="text-lg font-semibold">
                    Allocated Leaves
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <AllocatedLeavesTable leaves={allocatedLeaves} isLoading={loading} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <LeaveApplicationForm
            userEmail={user?.email ?? ""}
            fetchLeaves={fetchLeaveBalances}
          />
        </div>
      </PageWrapper>
    </>
  );
}

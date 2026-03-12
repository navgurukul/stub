"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Command } from "lucide-react";

import { GoogleLoginButton } from "@/app/_components/GoogleLoginButton";
import {
  PageDescription,
  PageHeader,
  PageHeading,
  PageWrapper,
} from "@/app/_components/wrapper";
import { useAuth } from "@/hooks/use-auth";
import { useGoogleLogin } from "@/hooks/use-google-login";
import { Spinner } from "@/components/ui/spinner";

/**
 * Login Page
 * Google OAuth authentication page
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { error } = useGoogleLogin();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/tracker");
    }
  }, [isAuthenticated, authLoading, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Spinner className="size-8 inline-block" />
          <p className="mt-4 text-sm text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <PageWrapper className="overflow-hidden h-screen">
      <div className="flex h-full flex-col items-center justify-center">
        <PageHeader className="items-center text-center">
          <div className="flex items-center gap-2 justify-center">
            <Command className="size-12 text-[#37352F]" />
          </div>
          <PageHeading>S.T.U.B</PageHeading>
          <PageDescription className="text-[#9B9A97]">
            Simple Tracking Until Better
          </PageDescription>
        </PageHeader>
        <div className="flex justify-center">
          <GoogleLoginButton />
        </div>
        <p className="mt-8 text-center text-[13px] text-[#9B9A97]">
          Access restricted to authorized accounts only.
        </p>
      </div>
    </PageWrapper>
  );
}

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
      router.push("/");
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
    <PageWrapper>
      <div className="flex h-screen items-center justify-center">
        <div>
          <PageHeader>
            <div className="flex items-center gap-2 justify-center">
              <Command className="size-10 text-main" />
              <PageHeading>S.T.U.B</PageHeading>
            </div>
            <PageDescription>
              Sign in with your Google account to get started.
            </PageDescription>
          </PageHeader>
          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

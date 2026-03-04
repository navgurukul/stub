"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { GoogleLoginButton } from "@/app/_components/GoogleLoginButton";
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5]">
        <div className="text-center">
          <Spinner className="size-6 inline-block text-[#9B9A97]" />
          <p className="mt-3 text-sm text-[#9B9A97]">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5]">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#E9E9E7] rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] p-8">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center size-10 rounded-[4px] bg-[#37352F] text-white mb-4">
              <span className="text-lg font-bold leading-none">S</span>
            </div>
            <h1 className="text-[24px] font-semibold text-[#37352F] mb-1">
              S.T.U.B
            </h1>
            <p className="text-sm text-[#9B9A97]">
              Simple Tracking Until Better
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E9E9E7] mb-6" />

          <p className="text-sm text-[#9B9A97] text-center mb-5">
            Sign in with your Google account to continue.
          </p>

          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>

          {error && (
            <p className="mt-4 text-xs text-[#C2312B] text-center">{error}</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[#9B9A97]">
          Access restricted to authorized accounts only.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useGoogleLogin } from "@/hooks/use-google-login";
import { Spinner } from "@/components/ui/spinner";

/**
 * Google Login Button Component
 * Renders Google Sign-In button with OAuth integration
 * Styled to match application's button design system
 */
export function GoogleLoginButton() {
  const { handleGoogleLogin, handleGoogleError, isLoading } = useGoogleLogin();
  const hiddenButtonRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error("Google Client ID not configured");
      return;
    }

    // Initialize Google Identity Services and render hidden button
    const initialize = (): void => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        });

        // Render the official Google button in a hidden container
        // This is required for FedCM compliance - prevents "Error retrieving a token"
        if (hiddenButtonRef.current && !hasRenderedRef.current) {
          window.google.accounts.id.renderButton(hiddenButtonRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: "signin_with",
            logo_alignment: "left",
          });
          hasRenderedRef.current = true;
        }
      } else {
        // Retry after a short delay if script not loaded yet
        setTimeout(initialize, 100);
      }
    };

    initialize();
  }, [handleGoogleLogin, isLoading]);

  const handleClick = useCallback((): void => {
    if (typeof window === "undefined") return;

    if (!window.google?.accounts?.id) {
      handleGoogleError();
      return;
    }

    // Trigger the hidden Google button to comply with FedCM requirements
    // This prevents "Not signed in with the identity provider" error
    const hiddenGoogleButton = hiddenButtonRef.current?.querySelector(
      '[role="button"], button'
    ) as HTMLElement | null;

    if (hiddenGoogleButton) {
      // Click the official Google button
      hiddenGoogleButton.click();
    } else {
      // Fallback to One Tap if button isn't ready
      console.warn("Hidden Google button not found, falling back to prompt()");
      window.google.accounts.id.prompt();
    }
  }, [handleGoogleError]);

  if (isLoading) {
    return (
      <Button size="xl" disabled variant="neutral">
        <Spinner className="size-5" />
        Signing in...
      </Button>
    );
  }

  return (
    <>
      {/* Hidden Google button for FedCM compliance */}
      <div
        ref={hiddenButtonRef}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* Custom styled button matching app design system */}
      <Button
        size="xl"
        className="cursor-pointer text-lg [&_svg]:size-5"
        onClick={handleClick}
        variant="neutral"
        aria-label="Continue with Google"
      >
        {/* Google "G" icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-10"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>
    </>
  );
}

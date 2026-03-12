"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface UnauthorizedPageProps {
  /**
   * Optional title override
   */
  title?: string;
  /**
   * Optional description override
   */
  description?: string;
  /**
   * Show back button
   */
  showBackButton?: boolean;
  /**
   * Show home button
   */
  showHomeButton?: boolean;
}

/**
 * UnauthorizedPage Component
 * Full page display for unauthorized access attempts
 */
export function UnauthorizedPage({
  title = "Access Denied",
  description = "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
  showBackButton = true,
  showHomeButton = true,
}: UnauthorizedPageProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-base bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-1">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Return to the previous page</li>
              <li>Go back to your dashboard</li>
              <li>Contact your system administrator for access</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          {showBackButton && (
            <Button
              variant="neutral"
              className="w-full sm:w-auto"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          )}
          {showHomeButton && (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

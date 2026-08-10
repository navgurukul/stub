"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/configurations?tab=project-management");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <p className="text-muted-foreground">Redirecting to project configurations...</p>
    </div>
  );
}

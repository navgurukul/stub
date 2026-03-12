import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/_components/Sidebar";
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

/**
 * Authenticated Layout
 * Layout for all authenticated routes
 * Includes sidebar navigation and route protection
 */
export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

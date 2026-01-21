"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarSync,
  ChevronRight,
  ChevronsUpDown,
  Command,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Shield,
  Target,
  TreePalm,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { rbacService } from "@/lib/rbac-service";
import { Role, Permission, ROLES } from "@/lib/rbac-constants";
import { debugUserAuthorization } from "@/lib/rbac-test-utils";

// Navigation item type
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: Role[];
  requiredPermissions?: Permission[];
  requireAllRoles?: boolean;
  requireAllPermissions?: boolean;
  items?: Omit<NavItem, "icon">[];
}

// Navigation data
const navLinks: NavItem[] = [
  {
    title: "Activity Logger",
    url: "/tracker",
    icon: Target,
  },
  {
    title: "Leaves",
    url: "/leaves",
    icon: TreePalm,
    items: [
      {
        title: "Leave Application",
        url: "/leaves/application",
      },
      {
        title: "Leave History",
        url: "/leaves/history",
      },
    ],
  },
  {
    title: "Comp-Off Request",
    url: "/compoff",
    icon: CalendarSync,
    requiredRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER],
  },
  {
    title: "Project Management",
    url: "/projects",
    icon: FolderKanban,
    requiredRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER],
  },
  {
    title: "Employee Database",
    url: "/employees",
    icon: Users,
    // No role requirement - accessible to everyone
  },
];

const adminLinks: NavItem[] = [
  // {
  //   title: "Admin Dashboard",
  //   url: "/admin/dashboard",
  //   icon: LayoutDashboard,
  //   requiredRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  // },
  // {
  //   title: "Access Control",
  //   url: "/admin/access-control",
  //   icon: Shield,
  //   requiredRoles: [ROLES.SUPER_ADMIN],
  // },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Get user initials for avatar fallback
  const userInitials = getUserInitials(user?.name);

  // Filter navigation items based on user authorization
  const filteredNavLinks = useMemo(() => {
    if (process.env.NODE_ENV === "development" && user) {
      debugUserAuthorization(user);
    }
    return navLinks.filter((item) => isItemAuthorized(item, user));
  }, [user]);

  const filteredAdminLinks = useMemo(() => {
    const filtered = adminLinks.filter((item) => isItemAuthorized(item, user));
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 RBAC Debug - Admin links check:");
      adminLinks.forEach((link) => {
        const isAuth = isItemAuthorized(link, user);
        console.log(
          `  - ${link.title}: ${isAuth ? "✅ Authorized" : "❌ Not authorized"}`
        );
        console.log(`    Required roles:`, link.requiredRoles);
      });
    }
    return filtered;
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex align-center gap-2 text-sm group-data-[collapsible=icon]:p-0!">
              <div className="flex aspect-square size-8 items-center justify-center rounded-base">
                <Command className="size-5" />
              </div>
              <Link
                href="/"
                className="grid flex-1 text-left text-sm leading-tight"
              >
                <h1 className="truncate font-heading">S.T.U.B</h1>
                <span className="truncate text-xs">Simple Tracking Until Better</span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavLinks.map((item) =>
              item.items && item.items.length > 0 ? (
                state === "collapsed" ? (
                  // In collapsed mode, use dropdown menu for items with sub-items
                  <SidebarMenuItem key={item.title} className="mt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          isActive={isParentActive(item, pathname)}
                          tooltip={item.title}
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "bottom" : "right"}
                        align="start"
                        className="min-w-48"
                      >
                        {item.items?.map((subItem) => (
                          <DropdownMenuItem key={subItem.title} asChild>
                            <a href={subItem.url} className="cursor-pointer">
                              {subItem.title}
                            </a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ) : (
                  // In expanded mode, use collapsible
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isParentActive(item, pathname)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem className="mt-2">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isParentActive(item, pathname)}
                          className="data-[state=open]:bg-main data-[state=open]:outline-border data-[state=open]:text-main-foreground"
                          tooltip={item.title}
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem
                              key={subItem.title}
                              className="mt-2"
                            >
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              ) : (
                <SidebarMenuItem key={item.title} className="mt-2">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="data-[state=open]:bg-main data-[state=open]:outline-border data-[state=open]:text-main-foreground"
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroup>
        {filteredAdminLinks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {filteredAdminLinks.map((item) => (
                <SidebarMenuItem key={item.title} className="mt-2">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="data-[state=open]:bg-main data-[state=open]:outline-border data-[state=open]:text-main-foreground"
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="group-data-[state=collapsed]:hover:outline-0 group-data-[state=collapsed]:hover:bg-transparent overflow-visible"
                  size="lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatarUrl || ""}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-heading">
                      {user?.name || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-8 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-base">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.avatarUrl || ""}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-heading">
                        {user?.name || "User"}
                      </span>
                      <span className="truncate text-xs">
                        {user?.email || ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Helper functions
function getUserInitials(name?: string): string {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function isParentActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.url) return true;
  if (item.items) {
    return item.items.some((subItem) => pathname === subItem.url);
  }
  return false;
}

/**
 * Check if navigation item is authorized for user
 */
function isItemAuthorized(
  item: NavItem,
  user: ReturnType<typeof useAuth>["user"]
): boolean {
  return rbacService.isAuthorized(user, {
    roles: item.requiredRoles,
    permissions: item.requiredPermissions,
    requireAllRoles: item.requireAllRoles,
    requireAllPermissions: item.requireAllPermissions,
  });
}

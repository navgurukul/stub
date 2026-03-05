"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarSync,
  ChevronDown,
  Command,
  FolderKanban,
  LayoutDashboard,
  LogOut,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
import { cn } from "@/lib/utils";

// Navigation item type
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  requiredRoles?: Role[];
  requiredPermissions?: Permission[];
  requireAllRoles?: boolean;
  requireAllPermissions?: boolean;
  items?: Omit<NavItem, "icon">[];
}

// Navigation data
const navLinks: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
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
  },
];

const adminLinks: NavItem[] = [];

const ICON_SIZE = { width: 16, height: 16 };

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userInitials = getUserInitials(user?.name);

  const filteredNavLinks = useMemo(() => {
    if (process.env.NODE_ENV === "development" && user) {
      debugUserAuthorization(user);
    }
    return navLinks.filter((item) => isItemAuthorized(item, user));
  }, [user]);

  const filteredAdminLinks = useMemo(() => {
    const filtered = adminLinks.filter((item) => isItemAuthorized(item, user));
    return filtered;
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#E9E9E7] bg-white"
      {...props}
    >
      {/* Logo / Brand */}
      <SidebarHeader className="h-11 justify-center px-3 border-b border-[#E9E9E7]">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center justify-center size-6 rounded-[4px] bg-[#37352F] text-white flex-shrink-0">
                <Command className="size-4" />
              </div>
              <Link
                href="/"
                className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden"
                title="S.T.U.B - Simple Tracking Until Better"
              >
                <span className="text-sm font-semibold text-[#37352F] truncate block">
                  S.T.U.B
                </span>
                <span className="text-xs text-[#9B9A97] truncate block">
                  Simple Tracking Until Better
                </span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-0.5">
            {filteredNavLinks.map((item) =>
              item.items && item.items.length > 0 ? (
                state === "collapsed" ? (
                  <SidebarMenuItem key={item.title}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          isActive={isParentActive(item, pathname)}
                          tooltip={item.title}
                          className={cn(
                            "rounded-[4px] h-8 px-2 text-sm text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#37352F]",
                            isParentActive(item, pathname) &&
                              "bg-[#F7F7F5] font-medium text-[#37352F]"
                          )}
                        >
                          {item.icon && <item.icon style={ICON_SIZE} />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "bottom" : "right"}
                        align="start"
                        className="min-w-44 rounded-[4px] border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.1)] bg-white"
                      >
                        {item.items?.map((subItem) => (
                          <DropdownMenuItem
                            key={subItem.title}
                            asChild
                            className="text-sm text-[#37352F] rounded-[4px] hover:bg-[#F7F7F5] cursor-pointer"
                          >
                            <a href={subItem.url}>{subItem.title}</a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ) : (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isParentActive(item, pathname)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isParentActive(item, pathname)}
                          tooltip={item.title}
                          className={cn(
                            "rounded-[4px] h-8 px-2 text-sm text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#37352F]",
                            isParentActive(item, pathname) &&
                              "bg-[#F7F7F5] font-medium text-[#37352F]"
                          )}
                        >
                          {item.icon && <item.icon style={ICON_SIZE} />}
                          <span className="flex-1">{item.title}</span>
                          <ChevronDown
                            style={{ width: 14, height: 14 }}
                            className="text-[#9B9A97] transition-transform duration-150 group-data-[state=open]/collapsible:rotate-180"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-4 border-l border-[#E9E9E7] pl-2 mt-0.5 gap-0.5">
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                                className={cn(
                                  "rounded-[4px] h-7 px-2 text-sm text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F7F5]",
                                  pathname === subItem.url &&
                                    "text-[#37352F] bg-[#F7F7F5] font-medium"
                                )}
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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "rounded-[4px] h-8 px-2 text-sm text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#37352F]",
                      pathname === item.url &&
                        "bg-[#F7F7F5] font-medium text-[#37352F]"
                    )}
                  >
                    <a href={item.url}>
                      {item.icon && <item.icon style={ICON_SIZE} />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroup>

        {filteredAdminLinks.length > 0 && (
          <SidebarGroup className="p-0 mt-4">
            <p className="px-2 mb-1 text-xs font-medium text-[#9B9A97] uppercase tracking-wider">
              Admin
            </p>
            <SidebarMenu className="gap-0.5">
              {filteredAdminLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "rounded-[4px] h-8 px-2 text-sm text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#37352F]",
                      pathname === item.url &&
                        "bg-[#F7F7F5] font-medium text-[#37352F]"
                    )}
                  >
                    <a href={item.url}>
                      {item.icon && <item.icon style={ICON_SIZE} />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-[#E9E9E7] px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="rounded-[4px] h-9 px-2 hover:bg-[#F7F7F5] w-full"
                  size="lg"
                >
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage
                      src={user?.avatarUrl || ""}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="text-xs bg-[#F7F7F5] text-[#37352F] font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium text-[#37352F]">
                      {user?.name || "User"}
                    </span>
                    <span className="truncate text-xs text-[#9B9A97]">
                      {user?.email || ""}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-[4px] border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.1)] bg-white"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E9E9E7]">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={user?.avatarUrl || ""}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="text-xs bg-[#F7F7F5] text-[#37352F]">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#37352F] truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-[#9B9A97] truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-[#E9E9E7]" />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-sm text-[#37352F] rounded-[4px] bg-[#F7F7F5] hover:bg-[#37352F] hover:text-[#F7F7F5] cursor-pointer mx-1 my-1"
                >
                  <LogOut
                    style={{ width: 14, height: 14 }}
                    className="text-[#9B9A97]"
                  />
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

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
  Settings,
  Network,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  },
  {
    title: "Off Day Work",
    url: "/compoff",
    icon: CalendarSync,
  },
  {
    title: "Team Structure",
    url: "/team-structure",
    icon: Network,
  },

  // {
  //   title: "Employee Database",
  //   url: "/employees",
  //   icon: Users,
  // },
];

const adminLinks: NavItem[] = [
  {
    title: "Configurations",
    url: "/configurations",
    icon: Settings,
    requiredRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  },
];

const ICON_SIZE = { width: 16, height: 16 };

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userInitials = getUserInitials(user?.name);
  const userRoleLabel = getUserPrimaryRoleLabel(user?.roles);

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
      className="border-r border-border bg-background overflow-x-hidden"
      {...props}
    >
      {/* Logo / Brand */}
      <SidebarHeader className="h-11 justify-center px-3 border-b border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center justify-center size-6 rounded-[4px] bg-foreground text-background flex-shrink-0">
                <Command className="size-4" />
              </div>
              <Link
                href="/"
                className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden"
                title="We dont have satisfactory output tracking yet so until then we will do input tracking"
              >
                <span className="text-sm font-semibold text-foreground truncate block">
                  S.T.U.B
                </span>
                <span className="text-xs text-muted-foreground truncate block">
                  Simple Tracking Until Better
                </span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0 border-b-0">
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
                            "rounded-[4px] h-9 px-2 text-sm text-muted-foreground hover:bg-secondary-background hover:text-foreground",
                            isParentActive(item, pathname) &&
                              "bg-secondary-background font-medium text-foreground"
                          )}
                        >
                          {item.icon && <item.icon style={ICON_SIZE} />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "bottom" : "right"}
                        align="start"
                        className="min-w-44 rounded-[4px] border border-border shadow-sm bg-background"
                      >
                        {item.items?.map((subItem) => (
                          <DropdownMenuItem
                            key={subItem.title}
                            asChild
                            className="text-sm text-foreground rounded-[4px] hover:bg-secondary-background cursor-pointer"
                          >
                            <Link href={subItem.url}>{subItem.title}</Link>
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
                            "rounded-[4px] h-9 px-2 text-sm text-muted-foreground hover:bg-secondary-background hover:text-foreground",
                            isParentActive(item, pathname) &&
                              "bg-secondary-background font-medium text-foreground"
                          )}
                        >
                          {item.icon && <item.icon style={ICON_SIZE} />}
                          <span className="flex-1">{item.title}</span>
                          <ChevronDown
                            style={{ width: 14, height: 14 }}
                            className="text-muted-foreground transition-transform duration-150 group-data-[state=open]/collapsible:rotate-180"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-4 border-l border-border pl-2 mt-0.5 gap-0.5">
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                                className={cn(
                                  "rounded-[4px] h-7 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary-background",
                                  pathname === subItem.url &&
                                    "text-foreground bg-secondary-background font-medium"
                                )}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
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
                      "rounded-[4px] h-9 px-2 text-sm text-muted-foreground hover:bg-secondary-background hover:text-foreground",
                      pathname === item.url &&
                        "bg-secondary-background font-medium text-foreground"
                    )}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon style={ICON_SIZE} />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Bottom Section (Configurations and User Profile */}
        {((filteredAdminLinks.length > 0) || user) && (
          <SidebarGroup className="p-0 border-t border-border pt-3 mt-auto pb-4">
            <SidebarMenu className="gap-1.5">
              {/* Configurations */}
              {filteredAdminLinks.length > 0 &&
                filteredAdminLinks.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "rounded-[4px] h-9 px-2 text-sm text-muted-foreground hover:bg-secondary-background hover:text-foreground",
                          isActive &&
                            "bg-secondary-background font-medium text-foreground"
                        )}
                      >
                        <Link href={item.url}>
                          {item.icon && <item.icon style={ICON_SIZE} />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

              {/* User Profile */}
              {user && (
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        className="rounded-[4px] h-11 px-2 hover:bg-secondary-background w-full items-center"
                        size="default"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage
                            src={user?.avatarUrl || ""}
                            alt={user?.name || "User"}
                          />
                          <AvatarFallback className="text-xs bg-secondary-background text-foreground font-medium">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 flex-col justify-center min-w-0 group-data-[collapsible=icon]:hidden ml-2 text-left">
                          <span className="truncate text-sm text-foreground font-medium leading-tight mb-0.5">
                            {user?.email || ""}
                          </span>
                          <span className="truncate text-xs text-muted-foreground leading-tight">
                            {userRoleLabel}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 rounded-[4px] border border-border shadow-sm bg-background"
                      side={isMobile ? "bottom" : "right"}
                      align="end"
                      sideOffset={4}
                    >
                      <div className="flex items-start gap-2 px-3 py-1.5 border-b border-border">
                        <Avatar className="h-7 w-7 mt-0.5">
                          <AvatarImage
                            src={user?.avatarUrl || ""}
                            alt={user?.name || "User"}
                          />
                          <AvatarFallback className="text-xs bg-secondary-background text-foreground">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user?.name || "User"}
                          </p>
                          <div className="mt-0.5 flex flex-col gap-0.5 min-w-0">
                            <Badge
                              variant="neutral"
                              className="h-5 w-fit shrink-0 rounded-full border-border/60 bg-secondary-background px-2 text-[10px] font-medium uppercase tracking-wide text-foreground"
                            >
                              {userRoleLabel}
                            </Badge>
                            <p className="min-w-0 text-xs text-muted-foreground truncate">
                              {user?.email || ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuItem
                        onClick={logout}
                        className="text-sm text-foreground rounded-[4px] bg-secondary-background hover:bg-foreground hover:text-background cursor-pointer mx-1 my-1"
                      >
                        <LogOut
                          style={{ width: 14, height: 14 }}
                          className="text-muted-foreground"
                        />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
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

function getUserPrimaryRoleLabel(roles?: string[]): string {
  if (!roles || roles.length === 0) return "No role";

  const normalizedRoles = roles.map((role) => role.toUpperCase());
  const orderedRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
  ];
  const primaryRole = orderedRoles.find((role) =>
    normalizedRoles.includes(role)
  );

  if (!primaryRole) return roles[0];

  return primaryRole.replaceAll("_", " ");
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

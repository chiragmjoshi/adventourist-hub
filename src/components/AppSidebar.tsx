import {
  LayoutDashboard, Users, Map, Layout, DollarSign, Truck, BarChart3,
  Database, UserCheck, Shield, ChevronDown, Settings, Zap, Crown, LogOut,
  Bell, KanbanSquare, BookOpen,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubItem, SidebarMenuSubButton, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRBAC } from "@/hooks/useRBAC";
import { useAuth } from "@/contexts/AuthContext";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoMain from "@/assets/logo-main.png";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-abyss text-white",
  admin: "bg-primary text-primary-foreground",
  sales: "bg-lagoon/20 text-lagoon",
  operations: "bg-purple-100 text-purple-700",
  finance: "bg-ridge/20 text-ridge",
};

const formatRole = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasPermission, hasRole, role } = useRBAC();
  const { profile, signOut } = useAuth();
  const isDbActive = location.pathname.startsWith("/admin/db");

  // Due-today reminders count for the badge
  const { data: dueCount = 0 } = useQuery({
    queryKey: ["reminders", "due_today", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from("reminders" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("due_at", end.toISOString())
        .or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`);
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 60_000,
  });

  const linkClasses = (isActive: boolean) =>
    `flex items-center gap-3 pl-3 pr-3 py-2 rounded-r-md text-sm transition-colors border-l-[3px] ${
      isActive
        ? "bg-[#FFF5F2] text-blaze border-blaze font-medium"
        : "text-[#6B7280] border-transparent hover:bg-[#FFF5F2] hover:text-blaze"
    }`;

  const navItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: true },
    { title: "Lead Management", url: "/admin/leads", icon: Users, show: hasPermission("leads") },
    { title: "Itineraries", url: "/admin/itineraries", icon: Map, show: hasPermission("itineraries") },
    { title: "Landing Pages", url: "/admin/landing-pages", icon: Layout, show: hasPermission("landing_pages") },
    { title: "Stories", url: "/admin/stories", icon: BookOpen, show: hasPermission("itineraries") },
    { title: "Trip Cashflow", url: "/admin/trip-cashflow", icon: DollarSign, show: hasPermission("trip_cashflow") },
    { title: "Trips Kanban", url: "/admin/trips-kanban", icon: KanbanSquare, show: hasPermission("trip_cashflow") },
    { title: "Reminders", url: "/admin/reminders", icon: Bell, show: true, badge: dueCount },
    { title: "Vendors", url: "/admin/vendors", icon: Truck, show: hasPermission("vendors") },
    { title: "Reports", url: "/admin/reports", icon: BarChart3, show: hasPermission("reports") },
    { title: "Automations", url: "/admin/automations", icon: Zap, show: hasRole("admin", "super_admin") },
  ].filter((i) => i.show);

  const showDb = hasPermission("db_management") || hasRole("super_admin", "admin");
  const showUserMgmt = hasRole("super_admin");
  const showSettings = hasRole("super_admin");

  const dbSubItems = [
    { title: "Destinations", url: "/admin/db/destinations" },
    { title: "Master Values", url: "/admin/db/master-values" },
  ];

  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Sidebar collapsible="icon" className="border-r border-[#F0EDE8]">
      <SidebarContent className="bg-white pt-4 flex flex-col h-full">
        <div className="flex items-center justify-center px-4 mb-6 bg-white">
          {collapsed
            ? <img src={logoMain} alt="Adventourist" className="h-8 w-auto" />
            : <img src={logoHorizontal} alt="Adventourist" className="h-16 w-auto" />
          }
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/admin"} className={({ isActive }) => linkClasses(isActive)}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {!collapsed && (item as any).badge ? (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                          {(item as any).badge > 9 ? "9+" : (item as any).badge}
                        </span>
                      ) : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {showDb && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isDbActive}>
                    <CollapsibleTrigger className={`w-full ${linkClasses(isDbActive)}`}>
                      <Database className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">DB Management</span>
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dbSubItems.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={sub.url}
                                  className={({ isActive }) =>
                                    `text-sm px-3 py-1.5 rounded-md block transition-colors ${
                                      isActive ? "text-blaze font-medium" : "text-[#9CA3AF] hover:text-blaze"
                                    }`
                                  }
                                >
                                  {sub.title}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {showUserMgmt && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/user-management" className={({ isActive }) => linkClasses(isActive)}>
                        <UserCheck className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>User Management</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/role-management" className={({ isActive }) => linkClasses(isActive)}>
                        <Shield className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Role Management</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {showSettings && (
                <>
                  <div className="my-2 mx-3 border-t border-[#F0EDE8]" />
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/settings" className={({ isActive }) => linkClasses(isActive)}>
                        <Settings className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Settings</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info at bottom */}
        {profile && (
          <div className="mt-auto border-t border-[#F0EDE8] bg-[#F9FAFB] px-3 py-3">
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {initials}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{profile.name}</p>
                    <p className="text-muted-foreground text-xs">{formatRole(role)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-abyss truncate">{profile.name}</p>
                    {role === "super_admin" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Crown className="h-3 w-3 text-horizon shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent><p>System Owner</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Badge className={`text-[9px] px-1.5 py-0 ${ROLE_COLORS[role] || "bg-muted"}`}>
                    {formatRole(role)}
                  </Badge>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-[#9CA3AF] hover:text-blaze transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

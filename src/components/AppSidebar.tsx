import {
  LayoutDashboard, Users, Map, Layout, DollarSign, Truck, BarChart3,
  Database, UserCheck, Shield, ChevronDown, Settings, Zap, Crown, LogOut,
  Bell, KanbanSquare, BookOpen,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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

  const linkClasses = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary font-medium"
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
    }`;

  const navItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: true },
    { title: "Lead Management", url: "/admin/leads", icon: Users, show: hasPermission("leads") },
    { title: "Itineraries", url: "/admin/itineraries", icon: Map, show: hasPermission("itineraries") },
    { title: "Landing Pages", url: "/admin/landing-pages", icon: Layout, show: hasPermission("landing_pages") },
    { title: "Stories", url: "/admin/stories", icon: BookOpen, show: hasPermission("itineraries") },
    { title: "Trip Cashflow", url: "/admin/trip-cashflow", icon: DollarSign, show: hasPermission("trip_cashflow") },
    { title: "Trips Kanban", url: "/admin/trips-kanban", icon: KanbanSquare, show: hasPermission("trip_cashflow") },
    { title: "Reminders", url: "/admin/reminders", icon: Bell, show: true },
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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar pt-4 flex flex-col h-full">
        <div className="flex items-center justify-center px-4 mb-6">
          {collapsed
            ? <img src={logoMain} alt="Adventourist" className="h-8 w-auto" />
            : <img src={logoHorizontal} alt="Adventourist" className="h-10 w-auto" />
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
                      {!collapsed && <span>{item.title}</span>}
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
                                    `text-sm px-3 py-1.5 rounded-md block ${
                                      isActive ? "text-sidebar-primary font-medium" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
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
                  <div className="my-2 mx-3 border-t border-border/30" />
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
          <div className="mt-auto border-t border-border/30 px-3 py-3">
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
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.name}</p>
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
                  className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
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

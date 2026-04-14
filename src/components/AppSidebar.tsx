import {
  LayoutDashboard, Users, Map, Layout, DollarSign, Truck, BarChart3,
  Database, UserCheck, Shield, ChevronDown, Settings,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubItem, SidebarMenuSubButton, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRBAC } from "@/hooks/useRBAC";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoMain from "@/assets/logo-main.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasPermission, hasRole } = useRBAC();
  const isDbActive = location.pathname.startsWith("/db");

  const linkClasses = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary font-medium"
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
    }`;

  // Role-based nav filtering
  const navItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true },
    { title: "Lead Management", url: "/leads", icon: Users, show: hasPermission("leads") },
    { title: "Itineraries", url: "/itineraries", icon: Map, show: hasPermission("itineraries") },
    { title: "Landing Pages", url: "/landing-pages", icon: Layout, show: hasPermission("landing_pages") },
    { title: "Trip Cashflow", url: "/trip-cashflow", icon: DollarSign, show: hasPermission("trip_cashflow") },
    { title: "Vendors", url: "/vendors", icon: Truck, show: hasPermission("vendors") },
    { title: "Reports", url: "/reports", icon: BarChart3, show: hasPermission("reports") },
  ].filter((i) => i.show);

  const showDb = hasPermission("db_management") || hasRole("super_admin", "admin");
  const showUserMgmt = hasRole("super_admin");
  const showSettings = hasRole("super_admin");

  const dbSubItems = [
    { title: "Destinations", url: "/db/destinations" },
    { title: "Master Values", url: "/db/master-values" },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar pt-4">
        <div className="flex items-center justify-center px-4 mb-6">
          {collapsed
            ? <img src={logoMain} alt="Adventourist" className="h-8 w-auto" />
            : <img src={logoHorizontal} alt="Adventourist" className="h-10 w-auto" />
          }
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={({ isActive }) => linkClasses(isActive)}>
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
                      <NavLink to="/user-management" className={({ isActive }) => linkClasses(isActive)}>
                        <UserCheck className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>User Management</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/role-management" className={({ isActive }) => linkClasses(isActive)}>
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
                      <NavLink to="/settings" className={({ isActive }) => linkClasses(isActive)}>
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
      </SidebarContent>
    </Sidebar>
  );
}

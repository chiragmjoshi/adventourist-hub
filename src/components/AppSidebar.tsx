import {
  LayoutDashboard, Users, Map, Layout, DollarSign, Truck, BarChart3,
  Database, UserCheck, Shield, ChevronDown, Settings, Zap, Crown, LogOut,
  Bell, KanbanSquare, BookOpen, Wallet, Megaphone, MessageSquareText,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubItem, SidebarMenuSubButton, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRBAC } from "@/hooks/useRBAC";
import { useFlag } from "@/hooks/useFlag";
import { useAuth } from "@/contexts/AuthContext";
import logoHorizontal from "@/assets/logo-horizontal.webp";
import logoMain from "@/assets/logo-main.webp";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-abyss text-white",
  admin: "bg-primary text-primary-foreground",
  sales: "bg-lagoon/20 text-lagoon",
  operations: "bg-purple-100 text-purple-700",
  finance: "bg-ridge/20 text-ridge",
};

const formatRole = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/* Phase MENU — V1 "Flat Groups" layout.
   Items are grouped into five labelled sections. Sections only render
   when they contain at least one item the viewer is allowed to see,
   which handles role-filtering as a side-effect without a dedicated
   V3-style setting. */
type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  show: boolean;
  badge?: number;
  isNew?: boolean;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasPermission, hasRole, role } = useRBAC();
  const marketingSpendOn = useFlag("feature:marketing_spend");
  const adFeedbackOn = useFlag("feature:ad_feedback");
  const expenseEntriesOn = useFlag("feature:expense_entries");
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

  const sections: { key: string; label: string; items: NavItem[] }[] = [
    {
      key: "sales",
      label: "Sales",
      items: [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: true },
        { title: "Lead Management", url: "/admin/leads", icon: Users, show: hasPermission("leads") },
        { title: "Reminders", url: "/admin/reminders", icon: Bell, show: true, badge: dueCount },
        { title: "Trips Kanban", url: "/admin/trips-kanban", icon: KanbanSquare, show: hasPermission("trip_cashflow") },
      ],
    },
    {
      key: "marketing",
      label: "Marketing",
      items: [
        { title: "Landing Pages", url: "/admin/landing-pages", icon: Layout, show: hasPermission("landing_pages") },
        { title: "Stories", url: "/admin/stories", icon: BookOpen, show: hasPermission("itineraries") },
        { title: "Itineraries", url: "/admin/itineraries", icon: Map, show: hasPermission("itineraries") },
        { title: "Marketing Spend", url: "/admin/reports/platform-roi", icon: Megaphone, show: marketingSpendOn && hasRole("admin", "super_admin"), isNew: true },
        { title: "Ad Feedback", url: "/admin/reports/ad-feedback", icon: MessageSquareText, show: adFeedbackOn && hasRole("admin", "super_admin"), isNew: true },
      ],
    },
    {
      key: "operations",
      label: "Operations",
      items: [
        { title: "Trip Cashflow", url: "/admin/trip-cashflow", icon: DollarSign, show: hasPermission("trip_cashflow") },
        { title: "Vendors", url: "/admin/vendors", icon: Truck, show: hasPermission("vendors") },
      ],
    },
    {
      key: "finance",
      label: "Finance",
      items: [
        { title: "Reports", url: "/admin/reports", icon: BarChart3, show: hasPermission("reports") },
        { title: "Operating Expenses", url: "/admin/expenses", icon: Wallet, show: expenseEntriesOn && hasRole("admin", "super_admin"), isNew: true },
      ],
    },
  ];

  const showDb = hasPermission("db_management") || hasRole("super_admin", "admin");
  const showUserMgmt = hasRole("super_admin");
  const showSettings = hasRole("super_admin");
  const showAutomations = hasRole("admin", "super_admin");

  // Admin section is rendered custom (DB has a sub-menu, Settings has a
  // divider), so it isn't in the sections array above.
  const anyAdminItem = showAutomations || showDb || showUserMgmt || showSettings;

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
        <div className="flex items-center justify-center px-4 mb-4 bg-white">
          {collapsed
            ? <img src={logoMain} alt="Adventourist" className="h-8 w-auto" />
            : <img src={logoHorizontal} alt="Adventourist" className="h-16 w-auto" />
          }
        </div>

        {sections.map((section) => {
          const visibleItems = section.items.filter((i) => i.show);
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={section.key} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-3 py-1 h-auto">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === "/admin"} className={({ isActive }) => linkClasses(isActive)}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                          {!collapsed && item.badge ? (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          ) : null}
                          {!collapsed && item.isNew ? (
                            <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0 rounded-full bg-[hsl(var(--horizon))]/20 text-[hsl(var(--horizon))] border border-[hsl(var(--horizon))]/40 leading-none">
                              New
                            </span>
                          ) : null}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Admin section — rendered custom because DB has a sub-menu
            and Settings sits under a divider. */}
        {anyAdminItem && (
          <SidebarGroup className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-3 py-1 h-auto">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {showAutomations && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/automations" className={({ isActive }) => linkClasses(isActive)}>
                        <Zap className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Automations</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

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
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/settings" className={({ isActive }) => linkClasses(isActive)}>
                        <Settings className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Settings</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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

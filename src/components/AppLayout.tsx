import { ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopBar from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  /* PERF-7 — Warm shared lookups once when the admin shell mounts so any
     form (lead, itinerary, cashflow) opens with data already cached. */
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["master_values"],
      staleTime: 10 * 60 * 1000,
      queryFn: async () => {
        const { data } = await supabase
          .from("master_values")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        return data || [];
      },
    });
    queryClient.prefetchQuery({
      queryKey: ["destinations_active"],
      staleTime: 10 * 60 * 1000,
      queryFn: async () => {
        const { data } = await supabase
          .from("destinations")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        return data || [];
      },
    });
    queryClient.prefetchQuery({
      queryKey: ["users_active"],
      staleTime: 10 * 60 * 1000,
      queryFn: async () => {
        const { data } = await supabase
          .from("users")
          .select("id, name")
          .eq("is_active", true);
        return data || [];
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={title} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;

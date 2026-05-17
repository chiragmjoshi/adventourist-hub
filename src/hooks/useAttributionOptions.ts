import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAttributionOptions = (selectedChannel?: string, selectedPlatform?: string) => {
  const { data: allValues = [] } = useQuery({
    queryKey: ["master_values_attribution"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("master_values")
        .select("type, value, parent_value, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      return (data as any[]) || [];
    },
  });

  const channels = useMemo(
    () => allValues.filter((v: any) => v.type === "channel").map((v: any) => v.value as string),
    [allValues]
  );

  const platforms = useMemo(() => {
    if (!selectedChannel) return [] as string[];
    return allValues
      .filter((v: any) => v.type === "platform" && v.parent_value === selectedChannel)
      .map((v: any) => v.value as string);
  }, [allValues, selectedChannel]);

  const campaignTypes = useMemo(() => {
    if (!selectedPlatform) return [] as string[];
    return allValues
      .filter((v: any) => v.type === "campaign_type" && v.parent_value === selectedPlatform)
      .map((v: any) => v.value as string);
  }, [allValues, selectedPlatform]);

  return { channels, platforms, campaignTypes };
};
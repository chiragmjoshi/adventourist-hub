import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export interface TestimonialItem {
  id: string;
  name: string;
  location?: string;
  quote: string;
  avatar_url?: string;
  rating?: number;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  destinationId?: string; // if set, filter to that destination only
}

const TestimonialPicker = ({ selectedIds, onChange, destinationId }: Props) => {
  const [q, setQ] = useState("");

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_with_testimonials"],
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("id, name, testimonials").eq("is_active", true);
      return data || [];
    },
  });

  const allTestimonials = useMemo(() => {
    const list: (TestimonialItem & { destinationId: string; destinationName: string })[] = [];
    destinations.forEach((d: any) => {
      if (destinationId && d.id !== destinationId) return;
      const items = Array.isArray(d.testimonials) ? d.testimonials : [];
      items.forEach((t: any) => {
        if (!t?.id) return;
        list.push({ ...t, destinationId: d.id, destinationName: d.name });
      });
    });
    return list;
  }, [destinations, destinationId]);

  const filtered = q
    ? allTestimonials.filter((t) =>
        [t.name, t.quote, t.location, t.destinationName].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
      )
    : allTestimonials;

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 rounded-md text-xs h-9" placeholder="Search testimonials by name, quote, destination…" />
      </div>
      <div className="text-[10px] text-muted-foreground flex justify-between">
        <span>{filtered.length} available · {selectedIds.length} selected</span>
        {selectedIds.length > 0 && <button type="button" onClick={() => onChange([])} className="text-destructive hover:underline">Clear</button>}
      </div>
      <div className="border border-border/50 rounded-md max-h-72 overflow-y-auto divide-y divide-border/40">
        {filtered.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No testimonials found. Add some on a destination.</p>}
        {filtered.map((t) => (
          <label key={t.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30">
            <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium">{t.name || "Anonymous"}</span>
                {t.location && <span className="text-[10px] text-muted-foreground">· {t.location}</span>}
                {!destinationId && <Badge variant="secondary" className="text-[9px] rounded-md">{t.destinationName}</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 italic">"{t.quote}"</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default TestimonialPicker;
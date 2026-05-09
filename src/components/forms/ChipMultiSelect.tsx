import { Label } from "@/components/ui/label";

interface Props {
  label?: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  variant?: "primary" | "lagoon" | "horizon";
}

const variantClass: Record<string, string> = {
  primary: "bg-primary text-primary-foreground border-primary",
  lagoon: "bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-[hsl(var(--lagoon))]/30",
  horizon: "bg-[hsl(var(--horizon))]/10 text-[hsl(var(--horizon))] border-[hsl(var(--horizon))]/30",
};

const ChipMultiSelect = ({ label, options, values, onChange, variant = "primary" }: Props) => {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div>
      {label && <Label className="text-xs text-muted-foreground mb-2 block">{label}</Label>}
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 && <p className="text-[10px] text-muted-foreground">No options. Add via Master Values.</p>}
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
              values.includes(o) ? variantClass[variant] : "border-border/50 hover:border-border"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChipMultiSelect;
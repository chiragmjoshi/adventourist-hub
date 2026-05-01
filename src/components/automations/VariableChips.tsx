import { Badge } from "@/components/ui/badge";

export const AVAILABLE_VARS = [
  "name", "destination", "travel_date", "agent_name", "price",
  "traveller_code", "itinerary_name", "mobile", "email",
  "company_name", "platform", "days_to_travel",
];

export default function VariableChips({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {AVAILABLE_VARS.map((v) => (
        <Badge
          key={v}
          variant="outline"
          className="cursor-pointer text-[10px] hover:bg-primary/10 hover:border-primary"
          onClick={() => onInsert(`{{${v}}}`)}
        >
          {`{{${v}}}`}
        </Badge>
      ))}
    </div>
  );
}

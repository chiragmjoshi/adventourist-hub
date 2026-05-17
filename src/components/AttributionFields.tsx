import { useAttributionOptions } from "@/hooks/useAttributionOptions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type AttributionField = "channel" | "platform" | "campaign_type" | "ad_group";

interface AttributionFieldsProps {
  channel: string;
  platform: string;
  campaignType: string;
  adGroup: string;
  onChange: (field: AttributionField, value: string) => void;
  layout?: "grid" | "stack";
}

const AttributionFields = ({
  channel,
  platform,
  campaignType,
  adGroup,
  onChange,
  layout = "grid",
}: AttributionFieldsProps) => {
  const { channels, platforms, campaignTypes } = useAttributionOptions(channel, platform);
  const wrapperClass = layout === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4";

  const handleChannel = (val: string) => {
    onChange("channel", val);
    onChange("platform", "");
    onChange("campaign_type", "");
    onChange("ad_group", "");
  };

  const handlePlatform = (val: string) => {
    onChange("platform", val);
    onChange("campaign_type", "");
    onChange("ad_group", "");
  };

  return (
    <div className={wrapperClass}>
      <div>
        <Label className="text-xs">Channel</Label>
        <Select value={channel || undefined} onValueChange={handleChannel}>
          <SelectTrigger className="mt-1 rounded-md">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">
          Platform {!channel && <span className="text-muted-foreground">(select channel first)</span>}
        </Label>
        <Select
          value={platform || undefined}
          onValueChange={handlePlatform}
          disabled={!channel || platforms.length === 0}
        >
          <SelectTrigger className="mt-1 rounded-md">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">
          Campaign Type {!platform && <span className="text-muted-foreground">(select platform first)</span>}
        </Label>
        <Select
          value={campaignType || undefined}
          onValueChange={(val) => onChange("campaign_type", val)}
          disabled={!platform || campaignTypes.length === 0}
        >
          <SelectTrigger className="mt-1 rounded-md">
            <SelectValue placeholder="Select campaign type" />
          </SelectTrigger>
          <SelectContent>
            {campaignTypes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Ad Group / Label</Label>
        <Input
          value={adGroup || ""}
          onChange={(e) => onChange("ad_group", e.target.value)}
          placeholder="e.g. Goa-Honeymoon-Aug"
          className="mt-1 rounded-md"
          disabled={!platform}
        />
      </div>
    </div>
  );
};

export default AttributionFields;
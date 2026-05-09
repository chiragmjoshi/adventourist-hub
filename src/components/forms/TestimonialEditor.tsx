import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ImageUploader from "./ImageUploader";

export interface TestimonialItem {
  id: string;
  name: string;
  location?: string;
  quote: string;
  avatar_url?: string;
  rating?: number;
}

interface Props {
  values: TestimonialItem[];
  onChange: (next: TestimonialItem[]) => void;
  folder: string; // for avatar uploads
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

const TestimonialEditor = ({ values, onChange, folder }: Props) => {
  const update = (i: number, patch: Partial<TestimonialItem>) =>
    onChange(values.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { id: newId(), name: "", quote: "", location: "", avatar_url: "", rating: 5 }]);

  return (
    <div className="space-y-3">
      {values.map((t, i) => (
        <Card key={t.id || i} className="border-border/50 shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-medium text-muted-foreground">Testimonial {i + 1}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <ImageUploader
                  folder={folder}
                  filename={`testimonial-${t.id || i}`}
                  value={t.avatar_url || ""}
                  onChange={(url) => update(i, { avatar_url: url })}
                  previewClassName="w-full aspect-square object-cover rounded-full"
                />
              </div>
              <div className="col-span-9 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Name *" className="rounded-md text-sm" />
                  <Input value={t.location || ""} onChange={(e) => update(i, { location: e.target.value })} placeholder="Location (e.g. Mumbai)" className="rounded-md text-sm" />
                </div>
                <Textarea value={t.quote} onChange={(e) => update(i, { quote: e.target.value })} placeholder="Their quote *" rows={3} className="rounded-md text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={1} max={5} value={t.rating ?? 5} onChange={(e) => update(i, { rating: parseInt(e.target.value) || 5 })} placeholder="Rating (1-5)" className="rounded-md text-sm" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-md text-xs w-full" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" />Add Testimonial
      </Button>
    </div>
  );
};

export default TestimonialEditor;
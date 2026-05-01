import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Send, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import VariableChips from "./VariableChips";
import { resolveVariables, sendTestMessage, DUMMY_PREVIEW_CTX } from "@/services/automationEngine";

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead created" },
  { value: "status_changed", label: "Status changed to..." },
  { value: "disposition_changed", label: "Disposition changed to..." },
  { value: "follow_up_date_reached", label: "Follow-up date reached" },
  { value: "travel_date_approaching", label: "X days before travel date" },
  { value: "travel_date_passed", label: "X days after travel date" },
  { value: "inactivity_days", label: "No update in X days" },
];

const STATUS_OPTIONS = ["new_lead", "contacted", "quote_sent", "follow_up_needed", "ongoing_discussions", "file_closed", "file_lost", "refund_issued", "invalid_lead", "booked_outside"];
const DISPOSITION_OPTIONS = ["not_contacted", "busy_call_back", "not_reachable", "wrong_number", "query_closed", "follow_up_needed", "destination_changed", "plan_dropped", "booked_outside", "ongoing_discussions", "not_interested", "ghosted", "refund_issued"];
const PLATFORM_OPTIONS = ["Google", "Facebook", "Instagram", "Website", "Organic", "Tripshelf", "Email Broadcast", "AiSensy WhatsApp", "CRM System"];
const DELAY_OPTIONS = [
  { value: 0, label: "Immediately" },
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours (next day)" },
  { value: 48, label: "48 hours (2 days)" },
  { value: 72, label: "72 hours (3 days)" },
  { value: 168, label: "7 days" },
  { value: 336, label: "14 days" },
];

const emptyRule = {
  name: "",
  description: "",
  is_active: true,
  trigger_event: "lead_created",
  trigger_days_before: 0,
  trigger_inactivity_days: 7,
  condition_status: [] as string[],
  condition_disposition: [] as string[],
  condition_platform: [] as string[],
  delay_hours: 0,
  send_time_window_start: "08:00",
  send_time_window_end: "21:00",
  wa_enabled: false,
  wa_recipient: "customer",
  wa_template_name: "",
  wa_message_body: "",
  email_enabled: false,
  email_recipient: "customer",
  email_subject: "",
  email_body: "",
  email_format: "html",
};

interface Props {
  open: boolean;
  onClose: () => void;
  rule: any | null;
}

export default function RuleEditor({ open, onClose, rule }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(emptyRule);
  const [testOpen, setTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [testContact, setTestContact] = useState("");
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const waRef = useRef<HTMLTextAreaElement>(null);
  const subjRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (rule) {
      setForm({ ...emptyRule, ...rule });
    } else {
      setForm(emptyRule);
    }
  }, [rule, open]);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const insertAt = (target: "wa_message_body" | "email_subject" | "email_body", token: string) => {
    const ref = target === "wa_message_body" ? waRef.current : target === "email_subject" ? subjRef.current : emailRef.current;
    const cur = form[target] || "";
    if (!ref) {
      update(target, cur + token);
      return;
    }
    const start = (ref as any).selectionStart ?? cur.length;
    const end = (ref as any).selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + token + cur.slice(end);
    update(target, next);
    setTimeout(() => {
      (ref as any).focus();
      (ref as any).setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
        trigger_event: form.trigger_event,
        trigger_days_before: ["travel_date_approaching", "travel_date_passed"].includes(form.trigger_event) ? Number(form.trigger_days_before) || 0 : null,
        trigger_inactivity_days: form.trigger_event === "inactivity_days" ? Number(form.trigger_inactivity_days) || null : null,
        condition_status: form.condition_status?.length ? form.condition_status : null,
        condition_disposition: form.condition_disposition?.length ? form.condition_disposition : null,
        condition_platform: form.condition_platform?.length ? form.condition_platform : null,
        delay_hours: Number(form.delay_hours) || 0,
        send_time_window_start: form.send_time_window_start || null,
        send_time_window_end: form.send_time_window_end || null,
        wa_enabled: form.wa_enabled,
        wa_recipient: form.wa_recipient,
        wa_template_name: form.wa_template_name || null,
        wa_message_body: form.wa_message_body || null,
        email_enabled: form.email_enabled,
        email_recipient: form.email_recipient,
        email_subject: form.email_subject || null,
        email_body: form.email_body || null,
        email_format: form.email_format,
      };
      if (rule?.id) {
        const { error } = await supabase.from("automation_rules").update(payload).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automation_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      toast.success(rule?.id ? "Rule updated" : "Rule created");
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save rule"),
  });

  const handleTest = async () => {
    if (!testContact) { toast.error("Enter a recipient"); return; }
    const result = await sendTestMessage(form, testChannel, testContact);
    if (result.success) toast.success("Test message sent");
    else toast.error(`Test failed: ${(result.response as any)?.error || "Unknown"}`);
    setTestOpen(false);
  };

  const previewMessage = resolveVariables(form.wa_message_body || "", DUMMY_PREVIEW_CTX);
  const previewSubject = resolveVariables(form.email_subject || "", DUMMY_PREVIEW_CTX);
  const previewBody = resolveVariables(form.email_body || "", DUMMY_PREVIEW_CTX);

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="flex-row items-center justify-between space-y-0 mb-5">
          <SheetTitle>{rule?.id ? "Edit Rule" : "New Rule"}</SheetTitle>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.trigger_event}>
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </SheetHeader>

        <div className="space-y-6">
          {/* Basics */}
          <Section title="Basics">
            <div>
              <Label className="text-xs">Rule name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Welcome new leads" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
            </div>
          </Section>

          {/* Trigger */}
          <Section title="Trigger">
            <div>
              <Label className="text-xs">When does this rule fire?</Label>
              <Select value={form.trigger_event} onValueChange={(v) => update("trigger_event", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["travel_date_approaching", "travel_date_passed"].includes(form.trigger_event) && (
              <div>
                <Label className="text-xs">{form.trigger_event === "travel_date_approaching" ? "Days before travel" : "Days after travel"}</Label>
                <Input type="number" min={0} value={form.trigger_days_before || 0} onChange={(e) => update("trigger_days_before", Number(e.target.value))} className="mt-1 max-w-[140px]" />
              </div>
            )}
            {form.trigger_event === "inactivity_days" && (
              <div>
                <Label className="text-xs">Days of inactivity</Label>
                <Input type="number" min={1} value={form.trigger_inactivity_days || 7} onChange={(e) => update("trigger_inactivity_days", Number(e.target.value))} className="mt-1 max-w-[140px]" />
              </div>
            )}
          </Section>

          {/* Conditions */}
          <Section title="Conditions" subtitle="Only fire if... (leave blank = always)">
            <MultiSelect label="Status is one of:" options={STATUS_OPTIONS} value={form.condition_status || []} onChange={(v) => update("condition_status", v)} />
            <MultiSelect label="Disposition is one of:" options={DISPOSITION_OPTIONS} value={form.condition_disposition || []} onChange={(v) => update("condition_disposition", v)} />
            <MultiSelect label="Platform is one of:" options={PLATFORM_OPTIONS} value={form.condition_platform || []} onChange={(v) => update("condition_platform", v)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Send after delay</Label>
                <Select value={String(form.delay_hours)} onValueChange={(v) => update("delay_hours", Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELAY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Only send between</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="time" value={form.send_time_window_start || ""} onChange={(e) => update("send_time_window_start", e.target.value)} className="max-w-[140px]" />
                <span className="text-xs text-muted-foreground">and</span>
                <Input type="time" value={form.send_time_window_end || ""} onChange={(e) => update("send_time_window_end", e.target.value)} className="max-w-[140px]" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Messages outside this window are queued for the next available slot.</p>
            </div>
          </Section>

          {/* WhatsApp action */}
          <Section title="WhatsApp action">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Send WhatsApp message</Label>
              <Switch checked={form.wa_enabled} onCheckedChange={(v) => update("wa_enabled", v)} />
            </div>
            {form.wa_enabled && (
              <>
                <RecipientToggle value={form.wa_recipient} onChange={(v) => update("wa_recipient", v)} />
                <div>
                  <Label className="text-xs">AiSensy template name</Label>
                  <Input value={form.wa_template_name || ""} onChange={(e) => update("wa_template_name", e.target.value)} placeholder="e.g. trip_confirmed" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Message body</Label>
                  <Textarea ref={waRef} rows={6} value={form.wa_message_body || ""} onChange={(e) => update("wa_message_body", e.target.value)} className="mt-1 font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-1">Click a variable to insert at cursor:</p>
                  <VariableChips onInsert={(t) => insertAt("wa_message_body", t)} />
                </div>
                {form.wa_message_body && (
                  <div className="border rounded-md p-3 bg-muted/40">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Live preview</p>
                    <p className="text-xs whitespace-pre-wrap">{previewMessage}</p>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Email action */}
          <Section title="Email action">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Send email</Label>
              <Switch checked={form.email_enabled} onCheckedChange={(v) => update("email_enabled", v)} />
            </div>
            {form.email_enabled && (
              <>
                <RecipientToggle value={form.email_recipient} onChange={(v) => update("email_recipient", v)} />
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input ref={subjRef} value={form.email_subject || ""} onChange={(e) => update("email_subject", e.target.value)} className="mt-1" />
                  <VariableChips onInsert={(t) => insertAt("email_subject", t)} />
                </div>
                <div>
                  <Label className="text-xs">Body</Label>
                  <Textarea ref={emailRef} rows={8} value={form.email_body || ""} onChange={(e) => update("email_body", e.target.value)} className="mt-1 font-mono text-xs" />
                  <VariableChips onInsert={(t) => insertAt("email_body", t)} />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs">Format</Label>
                  <div className="flex border rounded-md overflow-hidden">
                    {["html", "plain"].map((f) => (
                      <button key={f} type="button" onClick={() => update("email_format", f)} className={`px-3 py-1 text-xs ${form.email_format === f ? "bg-primary text-primary-foreground" : "bg-background"}`}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="text-xs ml-auto" onClick={() => setEmailPreviewOpen(true)}>Preview</Button>
                </div>
              </>
            )}
          </Section>

          {/* Test */}
          <Section title="Test">
            <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
              <Send className="h-3.5 w-3.5 mr-1" />Send test message
            </Button>
          </Section>
        </div>
      </SheetContent>
    </Sheet>

    {/* Test modal */}
    <Dialog open={testOpen} onOpenChange={setTestOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send test</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex border rounded-md overflow-hidden w-fit">
            {(["whatsapp", "email"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setTestChannel(c)} className={`px-3 py-1 text-xs ${testChannel === c ? "bg-primary text-primary-foreground" : "bg-background"}`}>{c}</button>
            ))}
          </div>
          <div>
            <Label className="text-xs">{testChannel === "whatsapp" ? "Mobile (with country code)" : "Email"}</Label>
            <Input value={testContact} onChange={(e) => setTestContact(e.target.value)} placeholder={testChannel === "whatsapp" ? "+919876543210" : "test@example.com"} className="mt-1" />
          </div>
          <Button onClick={handleTest}>Send</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Email preview modal */}
    <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Email preview (with sample data)</DialogTitle></DialogHeader>
        <div className="border rounded-md p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Subject:</p>
          <p className="text-sm font-medium mb-3">{previewSubject || "(no subject)"}</p>
          <div className="border-t pt-3">
            {form.email_format === "html"
              ? <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewBody }} />
              : <pre className="text-sm whitespace-pre-wrap font-sans">{previewBody}</pre>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b pb-5 last:border-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((v) => v !== o));
    else onChange([...value, o]);
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="mt-1 w-full justify-between font-normal h-9">
            <span className="truncate text-xs">{value.length === 0 ? "Any" : value.length === 1 ? value[0] : `${value.length} selected`}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 max-h-72 overflow-auto">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
              <Checkbox checked={value.includes(o)} onCheckedChange={() => toggle(o)} />
              <span>{o}</span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((v) => <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>)}
        </div>
      )}
    </div>
  );
}

function RecipientToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Send to</Label>
      <div className="flex border rounded-md overflow-hidden mt-1 w-fit">
        {(["customer", "agent", "both"] as const).map((r) => (
          <button key={r} type="button" onClick={() => onChange(r)} className={`px-3 py-1 text-xs capitalize ${value === r ? "bg-primary text-primary-foreground" : "bg-background"}`}>{r}</button>
        ))}
      </div>
    </div>
  );
}

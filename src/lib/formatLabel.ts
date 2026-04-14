const CUSTOM_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  file_closed: "File Closed",
  file_lost: "File Lost",
  new_lead: "New Lead",
  quote_sent: "Quote Sent",
  busy_call_back: "Busy, Call Back",
  not_reachable_call_back: "Not Reachable, Call Back",
  wrong_number: "Wrong Number / Invalid Lead",
  ongoing_discussions: "Ongoing Discussions",
  not_interested: "Not Interested",
  follow_up_needed: "Follow Up Needed",
  contacted: "Contacted",
};

export const formatLabel = (value: string): string => {
  if (!value) return "";
  if (CUSTOM_LABELS[value]) return CUSTOM_LABELS[value];
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

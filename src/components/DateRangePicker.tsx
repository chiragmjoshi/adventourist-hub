import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

export const ALL_TIME_FROM = new Date(2020, 0, 1);

const isAllTime = (from: Date) =>
  from.getFullYear() <= 2020 && from.getMonth() === 0 && from.getDate() === 1;

const DateRangePicker = ({ from, to, onChange }: DateRangePickerProps) => {
  const [date, setDate] = useState<{ from: Date; to: Date }>({ from, to });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDate({ from, to });
  }, [from, to]);

  const presets = [
    { label: "This Month", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    { label: "Last Month", from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
    { label: "Last 3 Months", from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) },
    { label: "Last 6 Months", from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) },
    { label: "Last 12 Months", from: startOfMonth(subMonths(new Date(), 11)), to: endOfMonth(new Date()) },
    { label: "This Year", from: startOfYear(new Date()), to: new Date() },
    { label: "All Time", from: ALL_TIME_FROM, to: new Date() },
  ];

  const label = isAllTime(date.from)
    ? "All time"
    : `${format(date.from, "MMM d, yyyy")} - ${format(date.to, "MMM d, yyyy")}`;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start text-left font-normal min-w-[240px]")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-2 space-y-1 min-w-[140px]">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    setDate({ from: p.from, to: p.to });
                    onChange(p.from, p.to);
                    setOpen(false);
                  }}
                >
                  {p.label}
                </Button>
              ))}
              <div className="pt-1 mt-1 border-t text-[10px] text-muted-foreground px-2">
                Or pick custom range →
              </div>
            </div>
            <Calendar
              mode="range"
              selected={{ from: date.from, to: date.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDate({ from: range.from, to: range.to });
                  onChange(range.from, range.to);
                  // Only close when both ends are picked
                  setOpen(false);
                } else if (range?.from) {
                  // First click — keep popover open so user can pick the end date
                  setDate({ from: range.from, to: range.from });
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangePicker;

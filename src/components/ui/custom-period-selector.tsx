import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface CustomPeriodSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  onCustomRangeChange?: (range: DateRange) => void;
}

const presetRanges = {
  hoje: () => ({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  }),
  ontem: () => ({
    from: startOfDay(subDays(new Date(), 1)),
    to: endOfDay(subDays(new Date(), 1)),
  }),
  "ultimos-7-dias": () => ({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  }),
  "ultimos-30-dias": () => ({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  }),
  "este-mes": () => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }),
};

export const CustomPeriodSelector = ({
  value,
  onValueChange,
  onCustomRangeChange,
}: CustomPeriodSelectorProps) => {
  const [customRange, setCustomRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (newValue: string) => {
    if (newValue === "custom") {
      onValueChange("custom");
      setIsCalendarOpen(true);
      return;
    }
    
    onValueChange(newValue);
    
    // Se tem callback para range customizado, chama com o preset
    if (onCustomRangeChange && presetRanges[newValue as keyof typeof presetRanges]) {
      const range = presetRanges[newValue as keyof typeof presetRanges]();
      onCustomRangeChange(range);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    if (!customRange.from || (customRange.from && customRange.to)) {
      // Starting a new range
      setCustomRange({ from: selectedDate, to: undefined });
    } else if (customRange.from && !customRange.to) {
      // Completing the range
      const from = customRange.from;
      const to = selectedDate;
      
      if (to >= from) {
        setCustomRange({ from, to });
        onValueChange("custom");
        onCustomRangeChange?.({ 
          from: startOfDay(from), 
          to: endOfDay(to) 
        });
        setIsCalendarOpen(false);
      } else {
        // If selected date is before start date, swap them
        setCustomRange({ from: to, to: from });
        onValueChange("custom");
        onCustomRangeChange?.({ 
          from: startOfDay(to), 
          to: endOfDay(from) 
        });
        setIsCalendarOpen(false);
      }
    }
  };

  const formatCustomRange = (range: {from: Date | undefined, to: Date | undefined}) => {
    if (range.from && range.to) {
      if (format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")) {
        return format(range.from, "dd/MM/yyyy");
      }
      return `${format(range.from, "dd/MM")} - ${format(range.to, "dd/MM")}`;
    }
    if (range.from) {
      return `${format(range.from, "dd/MM")} - ...`;
    }
    return "Selecionar período";
  };

  const isDateInRange = (date: Date) => {
    if (!customRange.from) return false;
    if (!customRange.to) return format(date, "yyyy-MM-dd") === format(customRange.from, "yyyy-MM-dd");
    return date >= customRange.from && date <= customRange.to;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Período
      </label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full h-11 rounded-xl border-border bg-card text-card-foreground">
            <SelectValue className="text-card-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="ontem">Ontem</SelectItem>
            <SelectItem value="ultimos-7-dias">Últimos 7 dias</SelectItem>
            <SelectItem value="ultimos-30-dias">Últimos 30 dias</SelectItem>
            <SelectItem value="este-mes">Este mês</SelectItem>
            <SelectItem value="custom">
              Personalizar...
            </SelectItem>
          </SelectContent>
        </Select>

        {value === "custom" && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-11 px-3 rounded-xl border-border bg-card text-card-foreground",
                  !customRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {formatCustomRange(customRange)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.from}
                onSelect={handleDateSelect}
                className="p-3 pointer-events-auto"
                modifiers={{
                  selected: (date) => isDateInRange(date),
                }}
                modifiersStyles={{
                  selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                }}
              />
              {customRange.from && !customRange.to && (
                <div className="p-3 border-t text-sm text-muted-foreground">
                  Selecione a data final do período
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
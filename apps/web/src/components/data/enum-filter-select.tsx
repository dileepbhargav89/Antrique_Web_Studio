'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_VALUE = '__all__';

export interface EnumFilterSelectProps {
  ariaLabel: string;
  placeholder: string;
  allLabel: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

/**
 * Shared by every module's status/type filter dropdown — a near-identical `Select` +
 * "All X" sentinel + enum-options loop was duplicated across 8 list pages before this was
 * factored out (found during the Phase 4 Engineering Review), each with a different,
 * sometimes-inconsistent label convention (some Title-Cased the enum value, e.g. "Draft",
 * while the `StatusBadge` in the very same table row rendered the raw enum text, e.g.
 * "DRAFT" — a real, visible mismatch). Standardized on rendering the raw enum value
 * everywhere, matching what `StatusBadge` already shows.
 */
function EnumFilterSelect({
  ariaLabel,
  placeholder,
  allLabel,
  options,
  value,
  onChange,
}: EnumFilterSelectProps) {
  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(next) => onChange(next === ALL_VALUE ? undefined : next)}
    >
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { EnumFilterSelect };

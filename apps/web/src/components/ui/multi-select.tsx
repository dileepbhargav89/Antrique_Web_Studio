'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Non-searchable by design (Popover + Checkbox list, no `cmdk` dependency)
 * — nothing in this codebase yet needs filterable/combobox behavior. If a
 * future feature does, that's a new component (e.g. `combobox.tsx`), not
 * a rebuild of this one.
 */
function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  className,
  disabled,
}: MultiSelectProps) {
  const toggle = (optionValue: string) => {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const selectedLabels = options.filter((o) => value.includes(o.value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('h-auto min-h-8 w-full justify-between font-normal', className)}
        >
          <span className="flex flex-wrap gap-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((o) => (
                <Badge key={o.value} variant="secondary">
                  {o.label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-1">
        <ul role="listbox" aria-multiselectable="true" className="flex flex-col">
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <li key={option.value} role="option" aria-selected={checked}>
                <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(option.value)} />
                  {option.label}
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };

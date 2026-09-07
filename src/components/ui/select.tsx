'use client';

import { Select } from '@base-ui/react/select';
import { ChevronDown } from 'lucide-react';

export interface SelectOption { value: string; label: string }

/**
 * A quiet, text-like select: the chosen label with a small chevron, opening a
 * rule-bordered list in the page's own colours. Keyboard and screen-reader
 * behaviour come from Base UI; the look comes from `.field-select-*`.
 */
export function SelectField({ options, value, defaultValue, onValueChange, name, disabled, className = '', ...aria }: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  return <Select.Root items={options} value={value} defaultValue={defaultValue} name={name} disabled={disabled}
    onValueChange={next => { if (typeof next === 'string') onValueChange?.(next); }}>
    <Select.Trigger className={`field-select-trigger ${className}`} {...aria}>
      <Select.Value />
      <Select.Icon className="field-select-icon"><ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner className="field-select-positioner" sideOffset={8} align="start" alignItemWithTrigger={false}>
        <Select.Popup className="field-select-popup">
          <Select.List className="field-select-list">
            {options.map(option => <Select.Item key={option.value} value={option.value} className="field-select-item">
              <Select.ItemText>{option.label}</Select.ItemText>
            </Select.Item>)}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>;
}

// Secondary controls in the footer: the Simple/Full voicing toggle and the
// fingering switch. Theme lives in the top bar.

import type { ReactNode } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="ctl-block">
      {label && <div className="t-label-caps">{label}</div>}
      <div className="pck-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export function ToggleSwitch({ checked, onChange, children }: ToggleSwitchProps) {
  return (
    <label className="pck-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {children}
    </label>
  );
}

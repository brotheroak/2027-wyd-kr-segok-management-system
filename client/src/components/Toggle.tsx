import React from "react";
import { CheckCircle2 } from "lucide-react";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className={checked ? "toggle checked" : "toggle"}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{checked ? <CheckCircle2 size={20} /> : <span className="circle" />}</span>
      {label}
    </label>
  );
}

import React from "react";

type DashboardBarProps = {
  label: string;
  value: number;
  max: number;
  tone?: "gold" | "green" | "blue" | "wine";
};

export function DashboardBar({ label, value, max, tone = "gold" }: DashboardBarProps) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="dashboard-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track">
        <i className={`bar-fill ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Church } from "lucide-react";
import { birthYears, months, days } from "../utils/constants.js";

type SectionTitleProps = {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
};

export function SectionTitle({ icon, title, action }: SectionTitleProps) {
  return (
    <div className="section-title">
      {icon}
      <h3>{title}</h3>
      {action && <div className="title-action">{action}</div>}
    </div>
  );
}

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

export function Select({ value, onChange, options }: SelectProps) {
  return (
    <select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">선택</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function RequiredMark() {
  return <span className="required-mark">*</span>;
}

export function OptionalMark() {
  return <span className="optional-mark">(선택)</span>;
}

type FieldLabelProps = {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
};

export function FieldLabel({ children, required = false, optional = false }: FieldLabelProps) {
  return (
    <span className="field-label-text">
      <span>{children}</span>
      {required && <RequiredMark />}
      {optional && <OptionalMark />}
    </span>
  );
}

type DateSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DateSelect({ value, onChange }: DateSelectProps) {
  const [draft, setDraft] = useState(() => {
    const [year = "", month = "", day = ""] = value ? value.split("-") : [];
    return { year: year || "1970", month, day };
  });

  useEffect(() => {
    const [year = "", month = "", day = ""] = value ? value.split("-") : [];
    setDraft({ year: year || "1970", month, day });
  }, [value]);

  const updatePart = (part: "year" | "month" | "day", rawValue: string) => {
    const next = {
      ...draft,
      [part]: rawValue
    };
    setDraft(next);
    if (/^\d{4}$/.test(next.year) && next.month && next.day) {
      onChange(`${next.year}-${next.month}-${next.day}`);
    }
  };

  return (
    <div className="date-select">
      <select value={draft.year} onChange={(event) => updatePart("year", event.target.value)} aria-label="생년월일 연도">
        {birthYears.map((year) => (
          <option key={year} value={year}>
            {year}년
          </option>
        ))}
      </select>
      <select value={draft.month} onChange={(event) => updatePart("month", event.target.value)} aria-label="생년월일 월">
        <option value="">월</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {Number(month)}월
          </option>
        ))}
      </select>
      <select value={draft.day} onChange={(event) => updatePart("day", event.target.value)} aria-label="생년월일 일">
        <option value="">일</option>
        {days.map((day) => (
          <option key={day} value={day}>
            {Number(day)}일
          </option>
        ))}
      </select>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  action: string;
  onClick: () => void;
};

export function EmptyState({ title, action, onClick }: EmptyStateProps) {
  return (
    <div className="empty">
      <Church size={42} />
      <h3>{title}</h3>
      <button className="primary" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}

import React from "react";
import { Home, Heart } from "lucide-react";

type AdminModeTabsProps = {
  active: "homestay" | "volunteer";
  onChange: (value: "homestay" | "volunteer") => void;
};

export function AdminModeTabs({ active, onChange }: AdminModeTabsProps) {
  return (
    <div className="admin-mode-tabs" role="tablist" aria-label="신청 유형">
      <button type="button" className={active === "homestay" ? "active" : ""} onClick={() => onChange("homestay")}>
        <Home size={18} />
        홈스테이
      </button>
      <button type="button" className={active === "volunteer" ? "active" : ""} onClick={() => onChange("volunteer")}>
        <Heart size={18} />
        자원봉사자
      </button>
    </div>
  );
}

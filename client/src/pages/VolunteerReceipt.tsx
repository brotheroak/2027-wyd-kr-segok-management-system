import React from "react";
import { CheckCircle2, User, ClipboardList, Sparkles } from "lucide-react";
import { VolunteerPayload } from "../types.js";
import { Metric } from "../components/Metric.js";

type VolunteerReceiptProps = {
  volunteer: VolunteerPayload;
  onNew: () => void;
};

export function VolunteerReceipt({ volunteer, onNew }: VolunteerReceiptProps) {
  return (
    <div className="panel receipt volunteer-receipt">
      <div className="receipt-head">
        <div>
          <span className={`status ${volunteer.status ?? "submitted"}`}>접수</span>
          <h3>자원봉사자 신청이 접수되었습니다</h3>
          <p>{volunteer.volunteerNo}</p>
        </div>
        <CheckCircle2 size={42} />
      </div>
      <div className="summary-grid">
        <Metric icon={<User />} label="신청인" value={volunteer.name} />
        <Metric icon={<ClipboardList />} label="지원 분야" value={volunteer.supportFields.join(", ")} />
        <Metric icon={<Sparkles />} label="활동 시간" value={volunteer.availability} />
      </div>
      <div className="receipt-actions">
        <button className="secondary" onClick={onNew}>
          새 신청서 작성
        </button>
      </div>
    </div>
  );
}

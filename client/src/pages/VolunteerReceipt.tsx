import React from "react";
import { User, ClipboardList, Sparkles, Pencil, XCircle } from "lucide-react";
import { VolunteerPayload } from "../types.js";
import { Metric } from "../components/Metric.js";

type VolunteerReceiptProps = {
  volunteer: VolunteerPayload;
  onEdit: () => void;
  onCancel: () => void;
};

export function VolunteerReceipt({ volunteer, onEdit, onCancel }: VolunteerReceiptProps) {
  const statusLabel = volunteer.status === "confirmed" ? "확정" : volunteer.status === "canceled" ? "취소" : "접수";
  return (
    <div className="panel receipt volunteer-receipt">
      <div className="receipt-head">
        <div>
          <span className={`status ${volunteer.status ?? "submitted"}`}>{statusLabel}</span>
          <h3>{volunteer.volunteerNo}</h3>
          <p>{volunteer.name} ({volunteer.baptismalName || "세례명 미입력"})</p>
        </div>
        <div className="receipt-actions">
          <button className="secondary" onClick={onEdit}>
            <Pencil size={18} /> 수정
          </button>
          <button className="ghost danger" onClick={onCancel} disabled={volunteer.status === "canceled"}>
            <XCircle size={18} /> 취소
          </button>
        </div>
      </div>
      <div className="summary-grid">
        <Metric icon={<User />} label="신청인" value={volunteer.name} />
        <Metric icon={<ClipboardList />} label="지원 분야" value={volunteer.supportFields.join(", ")} />
        <Metric icon={<Sparkles />} label="활동 시간" value={volunteer.availability} />
      </div>
      <dl className="details">
        <dt>주소</dt>
        <dd>
          {volunteer.address} {volunteer.addressDetail}
        </dd>
        <dt>연락처</dt>
        <dd>{volunteer.phone}</dd>
        <dt>봉사 경력 및 보유 재능</dt>
        <dd>{volunteer.experience}</dd>
      </dl>
    </div>
  );
}

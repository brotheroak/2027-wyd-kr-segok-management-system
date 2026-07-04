import React from "react";
import { Pencil, XCircle, Users, Home, BedDouble, Languages } from "lucide-react";
import { ApplicationPayload } from "../types.js";
import { Metric } from "../components/Metric.js";

type ApplicationReceiptProps = {
  application: ApplicationPayload;
  onEdit: () => void;
  onCancel: () => void;
};

export function ApplicationReceipt({ application, onEdit, onCancel }: ApplicationReceiptProps) {
  const statusLabel = application.status === "confirmed" ? "확정" : application.status === "canceled" ? "취소" : "접수";
  return (
    <div className="panel receipt">
      <div className="receipt-head">
        <div>
          <span className={`status ${application.status}`}>{statusLabel}</span>
          <h3>{application.applicationNo}</h3>
          <p>{application.representative.name} ({application.representative.baptismalName || "세례명 미입력"})</p>
        </div>
        <div className="receipt-actions">
          <button className="secondary" onClick={onEdit}>
            <Pencil size={18} /> 수정
          </button>
          <button className="ghost danger" onClick={onCancel} disabled={application.status === "canceled"}>
            <XCircle size={18} /> 취소
          </button>
        </div>
      </div>
      <div className="summary-grid">
        <Metric icon={<Users />} label="가족 구성" value={`${application.members.length}명`} />
        <Metric icon={<Home />} label="수용 인원" value={`${application.homestay.capacity}명`} />
        <Metric icon={<BedDouble />} label="침대" value={application.homestay.hasBed ? "제공 가능" : "제공 어려움"} />
        <Metric icon={<Languages />} label="언어" value={application.homestay.languages.join(", ")} />
      </div>
      <dl className="details">
        <dt>주소</dt>
        <dd>
          {application.representative.address} {application.representative.addressDetail}
        </dd>
        <dt>연락처</dt>
        <dd>{application.representative.phone}</dd>
        <dt>공간 설명</dt>
        <dd>{application.homestay.spaceDescription}</dd>
      </dl>
    </div>
  );
}

import React from "react";
import { Pencil, XCircle, Users, Home, BedDouble, Languages, Search, ScanBarcode } from "lucide-react";
import { ApplicationPayload } from "../types.js";
import { Metric } from "../components/Metric.js";

type ApplicationReceiptProps = {
  application: ApplicationPayload;
  onEdit: () => void;
  onCancel: () => void;
  onLogout?: () => void;
  onOpenPilgrimScanner?: () => void;
};

export function ApplicationReceipt({ application, onEdit, onCancel, onLogout, onOpenPilgrimScanner }: ApplicationReceiptProps) {
  const statusLabel = application.status === "confirmed" ? "확정" : application.status === "canceled" ? "취소" : "접수";
  const editable = !application.status || application.status === "submitted";
  const confirmCancel = () => {
    const confirmed = window.confirm("홈스테이 신청을 취소하시겠습니까?\n취소 후에는 운영자가 취소 상태로 확인하게 됩니다.");
    if (confirmed) onCancel();
  };

  return (
    <div className="panel receipt">
      <div className="receipt-head">
        <div>
          <span className={`status ${application.status}`}>{statusLabel}</span>
          <h3>{application.applicationNo}</h3>
          <p>{application.representative.name} ({application.representative.baptismalName || "세례명 미입력"})</p>
        </div>
        <div className="receipt-actions">
          <button className="secondary" onClick={onEdit} disabled={!editable}>
            <Pencil size={18} /> 수정
          </button>
          <button className="ghost danger" onClick={confirmCancel} disabled={!editable}>
            <XCircle size={18} /> 취소
          </button>
        </div>
      </div>
      <div className="summary-grid">
        <Metric icon={<Users />} label="가족 구성" value={`${application.members.length}명`} />
        <Metric icon={<Home />} label="수용 인원" value={`${application.homestay.capacity}명`} />
        <Metric icon={<BedDouble />} label="침대" value={application.homestay.hasBed ? `${application.homestay.bedCapacity ?? "확인 필요"}명 제공` : "제공 어려움"} />
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
      {!editable && application.status === "confirmed" && (
        <div className="receipt-change-notice">
          <strong>확정된 신청입니다.</strong>
          <p>변경 절차는 <a href="/community">FAQ/Q&amp;A</a>에서 확인하고, 개인정보가 포함된 실제 변경 또는 취소 요청은 세곡동 성당 대표번호 02-459-8211로 연락해 주세요.</p>
        </div>
      )}
      {onOpenPilgrimScanner && application.status !== "canceled" && (
        <button className="primary receipt-pilgrim-button" onClick={onOpenPilgrimScanner}><ScanBarcode size={19} /> 배정 순례자 카드 확인</button>
      )}
      {onLogout && (
        <div className="receipt-secondary-actions">
          <p>현재 접수 내역 확인을 마치고 다른 신청을 조회할 수 있습니다.</p>
          <button className="ghost" onClick={onLogout}>
            <Search size={18} /> 다른 신청 조회
          </button>
        </div>
      )}
    </div>
  );
}

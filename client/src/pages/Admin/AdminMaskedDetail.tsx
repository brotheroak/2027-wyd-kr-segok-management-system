import React from "react";
import { Users, Home, BedDouble, Languages, MapPinned } from "lucide-react";
import { ApplicationPayload } from "../../types.js";
import { Metric } from "../../components/Metric.js";

type AdminMaskedDetailProps = {
  application: ApplicationPayload;
};

export function AdminMaskedDetail({ application }: AdminMaskedDetailProps) {
  return (
    <div className="masked-detail">
      <p className="notice">
        이 상세 정보는 일반 운영자용 익명화 보기입니다. 원본 개인정보 확인이 필요하면 개인정보 관리자에게 요청하세요.
      </p>
      <div className="summary-grid">
        <Metric icon={<Users />} label="가족 구성" value={`${application.members.length}명`} />
        <Metric icon={<Home />} label="수용 인원" value={`${application.homestay.capacity}명`} />
        <Metric icon={<BedDouble />} label="침대" value={application.homestay.hasBed ? "제공 가능" : "제공 어려움"} />
        <Metric icon={<Languages />} label="언어" value={application.homestay.languages.join(", ")} />
        <Metric icon={<MapPinned />} label="구역/반" value={application.district?.label ?? "구역외 (13구역)"} />
      </div>
      <dl className="details">
        <dt>구역반</dt>
        <dd>{application.district?.label ?? "구역외 (13구역)"}</dd>
        <dt>대표</dt>
        <dd>{application.representative.name}</dd>
        <dt>연락처</dt>
        <dd>{application.representative.phone}</dd>
        <dt>이메일</dt>
        <dd>{application.representative.email}</dd>
        <dt>주소</dt>
        <dd>{application.representative.address}</dd>
        <dt>가족</dt>
        <dd>
          {application.members.map((member) => `${member.relationship} ${member.name} ${member.gender}`).join(", ")}
        </dd>
        <dt>공간 설명</dt>
        <dd>{application.homestay.spaceDescription}</dd>
      </dl>
    </div>
  );
}

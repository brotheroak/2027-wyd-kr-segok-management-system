import React from "react";

export function TermsPage() {
  return (
    <main className="single">
      <div className="page-heading">
        <span>Policy</span>
        <h2>이용정책</h2>
        <p>홈스테이 신청과 접수 확인을 위한 기본 이용 안내입니다.</p>
      </div>
      <div className="panel policy-panel">
        <h3>서비스 이용</h3>
        <p>본 시스템은 2027 서울 WYD 세곡동 성당 홈스테이 가정 신청, 접수 확인, 운영 관리를 위해 제공됩니다.</p>
        <h3>개인정보</h3>
        <p>신청자가 입력한 개인정보는 홈스테이 접수와 운영 목적에 한해 사용되며, 운영자 권한에 따라 접근 범위가 제한됩니다.</p>
        <h3>문의</h3>
        <p>문의가 필요한 경우 세곡동 성당 대표번호 <a href="tel:02-459-8211">02-459-8211</a>로 연락해 주세요.</p>
      </div>
    </main>
  );
}

import React from "react";

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="policy-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <main className="single policy-page">
      <div className="page-heading">
        <span>Privacy & Cookies</span>
        <h2>개인정보처리방침 및 쿠키정책</h2>
        <p>2027 서울 WYD 세곡동 성당 홈스테이 신청과 운영 과정에서 개인정보를 어떻게 수집, 이용, 보관, 보호하는지 안내합니다.</p>
      </div>

      <section className="policy-summary">
        <div>
          <span>기준 문서</span>
          <strong>WYD Seoul 2027 공식 개인정보처리방침</strong>
        </div>
        <div>
          <span>시행일</span>
          <strong>2026.07.04</strong>
        </div>
        <div>
          <span>개인정보 문의</span>
          <strong>세곡동 성당 대표번호 02-459-8211</strong>
        </div>
      </section>

      <article className="panel policy-panel">
        <PolicySection title="1. 기본 원칙">
          <p>본 시스템은 홈스테이 신청 접수, 본인 확인, 운영 관리, 순례자 요청 조건 매칭을 위해 필요한 범위에서 개인정보를 처리합니다. 개인정보는 명확한 목적과 합리적인 기간 안에서만 사용합니다.</p>
        </PolicySection>

        <PolicySection title="2. 수집하는 개인정보">
          <ul>
            <li>가족대표 정보: 성명, 세례명, 성별, 생년월일, 연락처, 이메일(선택), 주소</li>
            <li>가족구성원 정보: 관계, 성명, 세례명, 생년월일, 성별</li>
            <li>홈스테이 운영 정보: 주거형태, 반려동물 여부, 가능 언어, 수용 인원, 침대 여부, 제공 공간 설명</li>
            <li>서비스 이용 과정에서 생성되는 정보: 접수 확인용 4자리 비밀번호의 해시값, 접수 상태, 접속 로그, 운영 처리 기록</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. 이용 목적과 법적 근거">
          <p>개인정보는 홈스테이 신청 확인, 신청서 수정 및 취소, 운영자 검토, 순례자 요청 조건과의 매칭, 문의 응대, 시스템 보안과 품질 개선을 위해 이용됩니다. 접수 확인은 성명, 연락처, 4자리 비밀번호로 진행하며, 비밀번호 원문은 저장하지 않습니다.</p>
        </PolicySection>

        <PolicySection title="4. 제공 및 위탁">
          <p>공식 WYD 정책은 홈페이지 유지관리, 문자 발송, 이메일 발송, 클라우드 보관 등 행사 운영에 필요한 위탁 가능성을 안내합니다. 세곡동 성당 홈스테이 운영에서도 필요한 경우 최소 범위의 정보만 권한 있는 담당자 또는 수탁자에게 제공됩니다.</p>
        </PolicySection>

        <PolicySection title="5. 보관 및 삭제">
          <p>신청 정보는 홈스테이 운영 목적을 달성하는 데 필요한 기간 동안 보관하며, 행사 종료 후 후속 안내와 통계, 법적 의무 이행에 필요한 기간이 지나면 삭제 또는 익명화합니다. 웹 이용 및 쿠키 관련 정보는 공식 정책의 보관 기준을 따릅니다.</p>
        </PolicySection>

        <PolicySection title="6. 이용자의 권리">
          <p>신청자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 제한, 동의 철회 등을 요청할 수 있습니다. 권리 행사를 위해 본인 확인이 필요할 수 있으며, 개인정보 문의는 세곡동 성당 대표번호를 통해 접수합니다.</p>
        </PolicySection>

        <PolicySection title="7. 쿠키 및 추적기술">
          <p>웹사이트는 필수 기능 제공, 보안, 이용 경험 개선, 통계 분석을 위해 쿠키와 유사 기술을 사용할 수 있습니다. 비필수 쿠키는 관련 법령이 요구하는 경우 동의를 받아 처리하며, 브라우저 설정을 통해 쿠키를 제한할 수 있습니다.</p>
        </PolicySection>

        <PolicySection title="8. 안전성 확보 조치">
          <p>본 시스템은 운영자 권한을 일반 운영자와 개인정보 관리자로 분리합니다. 일반 운영자에게는 이름, 연락처, 이메일, 주소 등 주요 개인정보가 익명화되어 표시되며, 원본 개인정보는 개인정보 관리자만 열람할 수 있습니다.</p>
        </PolicySection>

        <PolicySection title="9. 문의">
          <p>개인정보 문의: 세곡동 성당 대표번호 <a href="tel:02-459-8211">02-459-8211</a></p>
          <p className="source-note">본 페이지는 WYD Seoul 2027 공식 개인정보처리방침 및 쿠키정책을 세곡동 성당 홈스테이 신청 시스템에 맞게 요약, 적용한 안내입니다. 공식 원문은 <a href="https://wydseoul.org/en/privacy-policy" target="_blank" rel="noreferrer">WYD Seoul 2027 Privacy Policy</a>에서 확인할 수 있습니다.</p>
        </PolicySection>
      </article>
    </main>
  );
}

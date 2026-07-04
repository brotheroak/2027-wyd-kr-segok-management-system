import React from "react";
import { Church } from "lucide-react";

type AppFooterProps = {
  navigate: (path: string) => void;
};

export function AppFooter({ navigate }: AppFooterProps) {
  return (
    <footer className="app-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <strong>
            <Church size={22} /> 2027 서울 WYD 세곡동 성당
          </strong>
          <p>서울특별시 강남구 헌릉로618길 34 세곡동성당</p>
          <p>02-459-8211</p>
          <p>젊은이 순례자를 환영하는 공동체적 신앙 활동입니다.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>신청 안내</span>
            <a href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
              대회 소개
            </a>
            <a href="/apply" onClick={(event) => { event.preventDefault(); navigate("/apply"); }}>
              신청서 작성
            </a>
            <a href="/check" onClick={(event) => { event.preventDefault(); navigate("/check"); }}>
              접수 확인
            </a>
          </div>
          <div>
            <span>운영 기간</span>
            <strong>
              WYD 예정 기간
              <br />
              2027.08.01 - 2027.08.09
            </strong>
          </div>
        </div>
        <div className="footer-bottom">
          <small>© 2027 WYD Seoul Segokdong Parish Homestay. All rights reserved.</small>
          <div>
            <a href="/privacy" onClick={(event) => { event.preventDefault(); navigate("/privacy"); }}>
              개인정보처리방침
            </a>
            <span>|</span>
            <a href="/terms" onClick={(event) => { event.preventDefault(); navigate("/terms"); }}>
              이용정책
            </a>
            <span>|</span>
            <a href="tel:02-459-8211">문의하기</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

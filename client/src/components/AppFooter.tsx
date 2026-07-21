import React from "react";

type AppFooterProps = {
  navigate: (path: string) => void;
  mode?: "public" | "admin";
};

const segokParishLogo = "/images/segok-parish-logo.png";
const adminMenuItems = [
  { label: "신청 현황", menu: "applications" },
  { label: "봉사 일정", menu: "shifts" },
  { label: "순례자·호스트", menu: "pilgrims" },
  { label: "FAQ·Q&A", menu: "community" },
  { label: "계정 관리", menu: "accounts" },
  { label: "비밀번호 변경", menu: "password" }
] as const;

export function AppFooter({ navigate, mode = "public" }: AppFooterProps) {
  const handleAdminMenu = (event: React.MouseEvent<HTMLAnchorElement>, menu: typeof adminMenuItems[number]["menu"]) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("admin-console-menu-change", { detail: menu }));
    window.history.replaceState({}, "", `/admin#${menu}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="app-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <a className="footer-parish-logo-link" href="https://www.segokc.or.kr/" target="_blank" rel="noreferrer" aria-label="세곡동성당 홈페이지 열기">
            <img className="footer-parish-logo" src={segokParishLogo} alt="천주교 서울대교구 세곡동 성당" />
          </a>
          <strong>세곡동성당 WYD 분과</strong>
          <p>서울특별시 강남구 헌릉로618길 34 세곡동성당</p>
          <p>02-459-8211</p>
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
            <a href="/community" onClick={(event) => { event.preventDefault(); navigate("/community"); }}>
              FAQ / Q&A
            </a>
          </div>
          {mode === "admin" && (
            <div>
              <span>운영자 메뉴</span>
              {adminMenuItems.map((item) => (
                <a key={item.menu} href={`/admin#${item.menu}`} onClick={(event) => handleAdminMenu(event, item.menu)}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
          <div>
            <span>운영 기간</span>
            <dl className="footer-schedule">
              <div>
                <dt>웹페이지 운영 시작</dt>
                <dd>2026.07.03</dd>
              </div>
              <div>
                <dt>WYD 사전대회</dt>
                <dd>2027.07.29 ~ 2027.08.02</dd>
              </div>
              <div>
                <dt>WYD 본대회</dt>
                <dd>2027.08.03 ~ 2027.08.08</dd>
              </div>
            </dl>
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

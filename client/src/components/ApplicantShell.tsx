import React from "react";
import { Church, Accessibility } from "lucide-react";
import { ApplyView } from "../types.js";
import { AppFooter } from "./AppFooter.js";

type ApplicantShellProps = {
  children: React.ReactNode;
  fontScale: number;
  setFontScale: (value: number) => void;
  view: ApplyView;
  navigate: (path: string) => void;
};

export function ApplicantShell({ children, fontScale, setFontScale, view, navigate }: ApplicantShellProps) {
  const title =
    view === "intro"
      ? "대회 소개"
      : view === "apply"
        ? "신청서 작성"
        : view === "homestay"
          ? "홈스테이 신청"
          : view === "volunteer"
            ? "자원봉사자 신청"
            : view === "check"
              ? "접수 확인"
              : view === "schedule"
                ? "봉사 일정"
              : view === "host"
                ? "배정 순례자 확인"
              : view === "community"
                ? "FAQ 및 Q&A"
              : view === "privacy"
                ? "개인정보처리방침"
                : "이용정책";

  return (
    <div className="applicant-shell">
      <header className="topbar applicant-topbar">
        <div className="shell topbar-inner">
          <button type="button" className="brand" onClick={() => navigate("/")} aria-label="신청 첫 화면으로 이동">
            <div className="brand-mark">
              <Church size={34} />
            </div>
            <div>
              <p>세곡동성당 WYD 분과</p>
              <h1>
                <span className="brand-title-unit">홈스테이 / 자원봉사</span>
                <span className="brand-title-unit"> 신청</span>
              </h1>
            </div>
          </button>
          <nav className="site-nav" aria-label="신청자 메뉴">
            <a
              className={view === "intro" ? "active" : ""}
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigate("/");
              }}
            >
              대회 소개
            </a>
            <a
              className={["apply", "homestay", "volunteer"].includes(view) ? "active" : ""}
              href="/apply"
              onClick={(event) => {
                event.preventDefault();
                navigate("/apply");
              }}
            >
              신청서 작성
            </a>
            <a
              className={view === "check" ? "active" : ""}
              href="/check"
              onClick={(event) => {
                event.preventDefault();
                navigate("/check");
              }}
            >
              접수 확인
            </a>
            <a
              className={view === "schedule" ? "active" : ""}
              href="/schedule"
              onClick={(event) => { event.preventDefault(); navigate("/schedule"); }}
            >
              봉사 일정
            </a>
            <a
              className={view === "community" ? "active" : ""}
              href="/community"
              onClick={(event) => { event.preventDefault(); navigate("/community"); }}
            >
              FAQ / Q&A
            </a>
          </nav>
          <div className="accessibility" aria-label="글자 크기 조절">
            <Accessibility size={20} />
            <button onClick={() => setFontScale(0.95)} className={fontScale === 0.95 ? "active" : ""}>
              가
            </button>
            <button onClick={() => setFontScale(1)} className={fontScale === 1 ? "active" : ""}>
              가
            </button>
            <button onClick={() => setFontScale(1.12)} className={fontScale === 1.12 ? "active" : ""}>
              가
            </button>
          </div>
        </div>
      </header>
      <section className="page-visual" aria-label="2027 서울 WYD 세곡동 성당 신청">
        <h2>{title}</h2>
      </section>
      <div className="shell breadcrumb-wrapper">
        <div className="breadcrumb">HOME / 2027 서울 WYD 세곡동 성당 / {title}</div>
      </div>
      <div className="shell page-transition" key={view}>
        {children}
      </div>
      <AppFooter navigate={navigate} />
    </div>
  );
}

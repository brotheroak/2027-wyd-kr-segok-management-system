import React, { useEffect, useState } from "react";
import { Accessibility, ShieldCheck, Church } from "lucide-react";
import { ApplyView, ApplicationPayload, VolunteerPayload, AdminRole } from "./types.js";
import { emptyApplication } from "./utils/constants.js";
import { api } from "./api.js";
import { ApplicantShell } from "./components/ApplicantShell.js";
import { WydIntro } from "./pages/WydIntro.js";
import { ApplyChoice } from "./pages/ApplyChoice.js";
import { ApplicationForm } from "./pages/ApplicationForm.js";
import { ApplicationReceipt } from "./pages/ApplicationReceipt.js";
import { VolunteerForm } from "./pages/VolunteerForm.js";
import { VolunteerReceipt } from "./pages/VolunteerReceipt.js";
import { LookupPanel } from "./pages/LookupPanel.js";
import { PrivacyPage } from "./pages/PrivacyPage.js";
import { TermsPage } from "./pages/TermsPage.js";
import { CommunityPage } from "./pages/CommunityPage.js";
import { VolunteerSchedulePanel } from "./pages/VolunteerSchedulePanel.js";
import { EmptyState } from "./components/FormFields.js";
import { AppFooter } from "./components/AppFooter.js";

const USER_TOKEN_KEY = "wydUserToken";
const USER_EMAIL_KEY = "wydUserEmail";
const AdminConsoleZip = React.lazy(() =>
  import("./pages/Admin/AdminConsole.js").then((module) => ({ default: module.AdminConsoleZip }))
);

function revokeUserSession(token: string | null) {
  if (!token) return;
  fetch("/api/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true
  }).catch(() => undefined);
}

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const isAdminPage = currentPath.startsWith("/admin");
  const isPrivacyPage = currentPath.startsWith("/privacy");
  const isTermsPage = currentPath.startsWith("/terms");
  const isCommunityPage = currentPath.startsWith("/community");
  const keepsApplicantSession = currentPath.startsWith("/check") || currentPath.startsWith("/apply");
  
  const applicantView: ApplyView = currentPath.startsWith("/community")
    ? "community"
    : currentPath.startsWith("/check")
    ? "check"
    : currentPath.startsWith("/apply/volunteer")
      ? "volunteer"
      : currentPath.startsWith("/apply/homestay")
        ? "homestay"
        : currentPath.startsWith("/apply")
          ? "apply"
          : "intro";
        
  const [fontScale, setFontScale] = useState(Number(localStorage.getItem("fontScale") ?? 1));
  const [userToken, setUserToken] = useState(sessionStorage.getItem(USER_TOKEN_KEY));
  const [application, setApplication] = useState<ApplicationPayload | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerPayload | null>(null);
  const [volunteerReceipt, setVolunteerReceipt] = useState<VolunteerPayload | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(fontScale));
    localStorage.setItem("fontScale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  }, []);

  useEffect(() => {
    if (!userToken || keepsApplicantSession) return;
    revokeUserSession(userToken);
    sessionStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    setUserToken(null);
    setApplication(null);
    setVolunteer(null);
  }, [keepsApplicantSession, userToken]);

  useEffect(() => {
    if (!userToken) {
      setApplication(null);
      setVolunteer(null);
      return;
    }
    api<{ application: ApplicationPayload | null }>("/api/my/application", {}, userToken)
      .then((data) => {
        if (data.application) {
          setApplication(data.application);
          setVolunteer(null);
        } else {
          api<{ volunteer: VolunteerPayload | null }>("/api/my/volunteer", {}, userToken)
            .then((volData) => {
              if (volData.volunteer) {
                setVolunteer(volData.volunteer);
                setApplication(null);
              } else {
                sessionStorage.removeItem(USER_TOKEN_KEY);
                sessionStorage.removeItem(USER_EMAIL_KEY);
                setUserToken(null);
                setApplication(null);
                setVolunteer(null);
              }
            })
            .catch(() => {
              sessionStorage.removeItem(USER_TOKEN_KEY);
              sessionStorage.removeItem(USER_EMAIL_KEY);
              setUserToken(null);
              setApplication(null);
              setVolunteer(null);
            });
        }
      })
      .catch(() => {
        sessionStorage.removeItem(USER_TOKEN_KEY);
        sessionStorage.removeItem(USER_EMAIL_KEY);
        setUserToken(null);
        setApplication(null);
        setVolunteer(null);
      });
  }, [userToken]);

  const onApplicationAuthorized = (token: string, loaded: ApplicationPayload | null) => {
    sessionStorage.setItem(USER_TOKEN_KEY, token);
    setUserToken(token);
    setApplication(loaded);
    setVolunteer(null);
  };

  const onVolunteerAuthorized = (token: string, loaded: VolunteerPayload | null) => {
    sessionStorage.setItem(USER_TOKEN_KEY, token);
    setUserToken(token);
    setVolunteer(loaded);
    setApplication(null);
  };

  const handleLogout = () => {
    revokeUserSession(userToken);
    sessionStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    setUserToken(null);
    setApplication(null);
    setVolunteer(null);
  };

  const navigate = (path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onInternalLinkClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const url = new URL(target.href);
      const internalPaths = new Set(["/", "/apply", "/apply/homestay", "/apply/volunteer", "/check", "/community", "/privacy", "/terms"]);
      if (url.origin !== window.location.origin || !internalPaths.has(url.pathname)) return;
      event.preventDefault();
      event.stopPropagation();
      navigate(url.pathname);
    };
    document.addEventListener("click", onInternalLinkClick, true);
    return () => document.removeEventListener("click", onInternalLinkClick, true);
  }, [currentPath]);

  useEffect(() => {
    const onButtonPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest("button.primary, button.secondary, button.test-code-button")
        : null;
      if (!(target instanceof HTMLButtonElement) || target.disabled) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--press-x", `${event.clientX - rect.left}px`);
      target.style.setProperty("--press-y", `${event.clientY - rect.top}px`);
      target.classList.remove("gradient-press");
      void target.offsetWidth;
      target.classList.add("gradient-press");
    };
    const onButtonAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "button-gradient-ripple") return;
      if (event.target instanceof HTMLElement) event.target.classList.remove("gradient-press");
    };
    document.addEventListener("pointerdown", onButtonPointerDown, true);
    document.addEventListener("animationend", onButtonAnimationEnd, true);
    return () => {
      document.removeEventListener("pointerdown", onButtonPointerDown, true);
      document.removeEventListener("animationend", onButtonAnimationEnd, true);
    };
  }, []);

  if (isAdminPage) {
    return (
      <div className="admin-shell">
        <header className="topbar admin-topbar">
          <div className="topbar-inner admin-topbar-inner">
            <div className="brand">
              <div className="brand-mark"><Church size={34} /></div>
              <div>
                <p>세곡동성당 WYD 분과</p>
                <h1>운영자 콘솔</h1>
              </div>
            </div>
            <div id="admin-header-menu-slot" className="admin-header-menu-slot" />
            <div className="accessibility" aria-label="글자 크기 조절">
              <Accessibility size={20} />
              <button onClick={() => setFontScale(0.95)} className={fontScale === 0.95 ? "active" : ""}>가</button>
              <button onClick={() => setFontScale(1)} className={fontScale === 1 ? "active" : ""}>가</button>
              <button onClick={() => setFontScale(1.12)} className={fontScale === 1.12 ? "active" : ""}>가</button>
            </div>
          </div>
        </header>
        <main className="admin-page">
          <React.Suspense fallback={<div className="admin-loading">운영자 콘솔을 불러오는 중입니다.</div>}>
            <AdminConsoleZip />
          </React.Suspense>
        </main>
        <AppFooter navigate={navigate} mode="admin" />
      </div>
    );
  }

  if (isPrivacyPage) {
    return (
      <ApplicantShell fontScale={fontScale} setFontScale={setFontScale} view="privacy" navigate={navigate}>
        <PrivacyPage />
      </ApplicantShell>
    );
  }

  if (isTermsPage) {
    return (
      <ApplicantShell fontScale={fontScale} setFontScale={setFontScale} view="terms" navigate={navigate}>
        <TermsPage />
      </ApplicantShell>
    );
  }

  if (isCommunityPage) {
    return (
      <ApplicantShell fontScale={fontScale} setFontScale={setFontScale} view="community" navigate={navigate}>
        <CommunityPage />
      </ApplicantShell>
    );
  }

  return (
    <ApplicantShell fontScale={fontScale} setFontScale={setFontScale} view={applicantView} navigate={navigate}>
      <main>
        {applicantView === "intro" && (
          <WydIntro
            onStartApply={(type) => navigate(type === "homestay" ? "/apply/homestay" : "/apply/volunteer")}
            onCheckStatus={() => navigate("/check")}
          />
        )}

        {applicantView === "apply" && (
          <ApplyChoice navigate={navigate} />
        )}

        {applicantView === "homestay" && (
          <section className="applicant-main">
            <div className="page-heading">
              <span>World Youth Day Seoul 2027</span>
              <h2>
                <span className="title-line">2027 서울 WYD</span>
                <span className="title-line">세곡동 성당 홈스테이 신청</span>
              </h2>
              <p>홈스테이 예정 기간: 2027년 8월 1일(일)부터 8월 9일(월)까지</p>
              <small>주제 성구: “용기를 내어라. 내가 세상을 이겼다.” (요한 16,33)</small>
            </div>
            <div className="content">
              <ApplicationForm
                initial={application ?? emptyApplication()}
                submitLabel={application ? "수정 내용 저장" : "신청 접수"}
                pinRequired={!application}
                mode={application ? "full" : "wizard"}
                onSubmit={async (payload) => {
                  if (application && userToken) {
                    const data = await api<{ application: ApplicationPayload }>("/api/my/application", {
                      method: "POST",
                      body: JSON.stringify(payload)
                    }, userToken);
                    setApplication(data.application);
                  } else {
                    const data = await api<{ token: string; application: ApplicationPayload }>("/api/applications", {
                      method: "POST",
                      body: JSON.stringify(payload)
                    });
                    onApplicationAuthorized(data.token, data.application);
                  }
                  navigate("/check");
                }}
              />
            </div>
          </section>
        )}

        {applicantView === "volunteer" && (
          <section className="applicant-main">
            <div className="page-heading">
              <span>World Youth Day Seoul 2027</span>
              <h2>
                <span className="title-line">2027 서울 WYD</span>
                <span className="title-line">자원봉사자 신청</span>
              </h2>
              <p>세곡동성당과 함께 2027 WYD 순례자를 맞이할 봉사자를 모집합니다.</p>
            </div>
            <div className="content">
              {volunteerReceipt ? (
                <VolunteerReceipt
                  volunteer={volunteerReceipt}
                  onEdit={() => {
                    setVolunteer(volunteerReceipt);
                    setVolunteerReceipt(null);
                  }}
                  onCancel={async () => {
                    const data = await api<{ volunteer: VolunteerPayload }>("/api/my/volunteer", { method: "DELETE" }, userToken!);
                    setVolunteerReceipt(data.volunteer);
                  }}
                />
              ) : (
                <VolunteerForm
                  initial={volunteer ?? undefined}
                  submitLabel={volunteer ? "수정 내용 저장" : "자원봉사자 신청 접수"}
                  onSubmit={async (payload) => {
                    if (volunteer && userToken) {
                      const data = await api<{ volunteer: VolunteerPayload }>("/api/my/volunteer", {
                        method: "POST",
                        body: JSON.stringify(payload)
                      }, userToken);
                      setVolunteer(data.volunteer);
                    } else {
                      const data = await api<{ volunteer: VolunteerPayload }>("/api/volunteers", {
                        method: "POST",
                        body: JSON.stringify(payload)
                      });
                      setVolunteerReceipt(data.volunteer);
                    }
                    navigate("/check");
                  }}
                />
              )}
            </div>
          </section>
        )}

        {applicantView === "check" && (
          <section className="single">
            <div className="page-heading">
              <span>Application Status</span>
              <h2>접수 확인</h2>
              <p>홈스테이는 성명, 연락처, 4자리 비밀번호로 조회하고 자원봉사자는 성명과 연락처로 조회합니다.</p>
            </div>
            {!userToken ? (
              <LookupPanel
                onFound={(token, type, loaded) => {
                  if (type === "homestay") {
                    onApplicationAuthorized(token, loaded);
                  } else {
                    onVolunteerAuthorized(token, loaded);
                  }
                }}
              />
            ) : application ? (
              <ApplicationReceipt
                application={application}
                onEdit={() => navigate("/apply/homestay")}
                onCancel={async () => {
                  const data = await api<{ application: ApplicationPayload }>("/api/my/application", { method: "DELETE" }, userToken);
                  setApplication(data.application);
                }}
                onLogout={handleLogout}
              />
            ) : volunteer ? (
              <>
                <VolunteerReceipt
                  volunteer={volunteer}
                  onEdit={() => navigate("/apply/volunteer")}
                  onCancel={async () => {
                    const data = await api<{ volunteer: VolunteerPayload }>("/api/my/volunteer", { method: "DELETE" }, userToken);
                    setVolunteer(data.volunteer);
                  }}
                  onLogout={handleLogout}
                />
                {volunteer.status !== "canceled" && <VolunteerSchedulePanel token={userToken} />}
              </>
            ) : (
              <EmptyState title="접수 내역이 없습니다" action="신청 화면으로 이동" onClick={() => navigate("/apply")} />
            )}
          </section>
        )}
      </main>
    </ApplicantShell>
  );
}

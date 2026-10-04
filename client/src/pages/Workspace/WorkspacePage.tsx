import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Layers,
  LogOut,
  KeyRound,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  CheckSquare,
  FileText,
} from "lucide-react";
import { api, ApiError } from "../../api.js";
import type { AdminRole } from "../../types.js";
import { CollaborationPanel } from "./CollaborationPanel.js";
import { AppFooter } from "../../components/AppFooter.js";
import "./workspace.css";
import "./workspace-refresh.css";

const TOKEN_KEY = "wydWorkspaceToken";
const ROLE_KEY = "wydWorkspaceRole";
type LoginResponse = { token: string; role: AdminRole };

export function WorkspacePage({
  navigate,
  chatEntry = false,
}: {
  navigate: (path: string) => void;
  chatEntry?: boolean;
}) {
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem(TOKEN_KEY),
  );
  const [role, setRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [register, setRegister] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const passwordDialog = useRef<HTMLDialogElement>(null);

  const clearSession = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    setToken(null);
    setRole(null);
    setPassword("");
    setCurrentPassword("");
    setNextPassword("");
    setNextPasswordConfirm("");
    passwordDialog.current?.close();
  };
  const logout = () => {
    if (token)
      void api("/api/workspace/logout", { method: "POST" }, token).catch(
        () => undefined,
      );
    clearSession();
    setNotice("");
  };

  useEffect(() => {
    document.title = "WYD 함께 · 분과 협업 공간";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    return () => {
      document.title = "2027 WYD 세곡동 성당";
    };
  }, []);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let validating = false;
    let retryTimer: number | undefined;
    const validate = async () => {
      if (validating || cancelled) return;
      validating = true;
      window.clearTimeout(retryTimer);
      try {
        const session = await api<{ role: AdminRole }>(
          "/api/workspace/session",
          {},
          token,
        );
        if (!cancelled) {
          setRole(session.role);
          sessionStorage.setItem(ROLE_KEY, session.role);
          setNotice("");
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 401) {
            clearSession();
            setNotice("로그인이 만료되었습니다. 다시 로그인해 주세요.");
          } else {
            setNotice("연결을 다시 확인하고 있습니다. 잠시 후 자동으로 재시도합니다.");
            retryTimer = window.setTimeout(() => void validate(), 5000);
          }
        }
      } finally {
        validating = false;
      }
    };
    void validate();
    const visible = () => {
      if (document.visibilityState === "visible") void validate();
    };
    const timer = window.setInterval(visible, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(retryTimer);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [token]);

  const submitAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (register) {
        const result = await api<{ message: string }>("/api/admin/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            passwordConfirm: confirmation,
            requestedRole: "committee",
          }),
        });
        setNotice(result.message);
        setPassword("");
        setConfirmation("");
      } else {
        const result = await api<LoginResponse>("/api/workspace/login", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });

          sessionStorage.setItem(TOKEN_KEY, result.token);
          sessionStorage.setItem(ROLE_KEY, result.role);
          setToken(result.token);
          setRole(null);
          setPassword("");
      }
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setPasswordNotice("");
    try {
      const result = await api<{ message: string }>(
        "/api/workspace/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            nextPassword,
            nextPasswordConfirm,
          }),
        },
        token,
      );
      setPasswordNotice(result.message);
      setCurrentPassword("");
      setNextPassword("");
      setNextPasswordConfirm("");
    } catch (error) {
      setPasswordNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <a
          className="workspace-brand"
          href={chatEntry ? "/chat" : "/workspace"}
          aria-label="분과 협업 홈"
        >
          <span>
            <Layers size={24} />
          </span>
          <div>
            <small>SEGOK · WYD 2027</small>
            <strong>WYD 함께</strong>
          </div>
        </a>
        <nav aria-label="협업 공간 메뉴">
          <a
            href={
              window.location.hostname === "chat.segokwyd.kr"
                ? "https://segokwyd.kr"
                : "/"
            }
            onClick={(event) => {
              if (window.location.hostname !== "chat.segokwyd.kr") {
                event.preventDefault();
                navigate("/");
              }
            }}
          >
            <ArrowLeft size={16} /> 홈페이지
          </a>
          {token && role && (
            <>
              <button
                onClick={() => {
                  setPasswordNotice("");
                  passwordDialog.current?.showModal();
                }}
              >
                <KeyRound size={16} /> 비밀번호 변경
              </button>
              <button onClick={logout}>
                <LogOut size={16} /> 로그아웃
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="workspace-main">
        {token ? (
          role ? (
            <CollaborationPanel
              key={chatEntry ? "chat" : "workspace"}
              token={token}
              role={role}
              initialView={chatEntry ? "대화" : "회의록"}
            />
          ) : (
            <div className="workspace-loading" role="status">
              협업 공간을 준비하고 있습니다.
            </div>
          )
        ) : (
          <section className="workspace-entry">
            <div className="workspace-welcome">
              <span className="workspace-eyebrow">
                <Sparkles size={15} /> 함께 준비하는 서울 WYD
              </span>
              <h1>
                {chatEntry ? (
                  <>
                    우리의 대화가
                    <br />
                    함께하는 준비로.
                  </>
                ) : (
                  <>
                    우리의 생각이
                    <br />
                    함께하는 준비로.
                  </>
                )}
              </h1>
              <p>
                회의에서 나눈 이야기부터 다음 할 일까지.
                <br />
                모든 분과 구성원이 한곳에서 함께합니다.
              </p>
              <div className="workspace-feature-list">
                <span>
                  <FileText size={19} />
                  <strong>생각을 기록하고</strong>
                  <small>분과별 공동회의록</small>
                </span>
                <span>
                  <CheckSquare size={19} />
                  <strong>준비를 이어가고</strong>
                  <small>담당자와 기한이 있는 할 일</small>
                </span>
                <span>
                  <MessageSquare size={19} />
                  <strong>이야기를 나누세요</strong>
                  <small>분과별 대화와 자료 공유</small>
                </span>
              </div>
            </div>
            <div className="workspace-access">
              <ShieldCheck size={26} />
              <h2>
                {register
                  ? "분과 구성원 가입 신청"
                  : chatEntry
                    ? "분과 채팅 로그인"
                    : "협업 공간 로그인"}
              </h2>
              <p>
                {register
                  ? "가입 신청 후 관리자의 승인을 받으면 함께할 수 있습니다."
                  : "기존 분과 구성원 또는 운영자 계정으로 로그인하세요."}
              </p>
              <form onSubmit={submitAccess}>
                  <>
                    <label>
                      이메일
                      <input
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <label>
                      비밀번호
                      <input
                        type="password"
                        autoComplete={
                          register ? "new-password" : "current-password"
                        }
                        minLength={register ? 10 : undefined}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    {register && (
                      <label>
                        비밀번호 확인
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={10}
                          required
                          value={confirmation}
                          onChange={(e) => setConfirmation(e.target.value)}
                        />
                      </label>
                    )}
                  </>
                {notice && (
                  <p role="status" className="workspace-notice">
                    {notice}
                  </p>
                )}
                <button className="workspace-primary" disabled={busy}>
                  {busy
                    ? "처리 중…"
                    : register
                      ? "가입 승인 요청"
                      : chatEntry
                          ? "채팅 입장"
                          : "협업 공간 입장"}
                </button>
                <button
                  type="button"
                  className="workspace-text-button"
                  disabled={busy}
                  onClick={() => {
                    setRegister(!register);
                    setNotice("");
                    setPassword("");
                    setConfirmation("");
                  }}
                >
                  {register
                    ? "로그인으로 돌아가기"
                    : "처음 오셨나요? 분과 구성원 가입 신청"}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
      <dialog
        ref={passwordDialog}
        className="workspace-password-dialog"
        aria-labelledby="workspace-password-title"
        onClose={() => {
          setCurrentPassword("");
          setNextPassword("");
          setNextPasswordConfirm("");
        }}
      >
        <h2 id="workspace-password-title">비밀번호 변경</h2>
        <form onSubmit={changePassword}>
          <label>
            현재 비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label>
            새 비밀번호
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
            />
          </label>
          <label>
            새 비밀번호 확인
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={nextPasswordConfirm}
              onChange={(e) => setNextPasswordConfirm(e.target.value)}
            />
          </label>
          {passwordNotice && <p role="status">{passwordNotice}</p>}
          <button className="workspace-primary" disabled={busy}>
            변경 내용 저장
          </button>
          <button
            type="button"
            className="workspace-text-button"
            onClick={() => passwordDialog.current?.close()}
          >
            닫기
          </button>
        </form>
      </dialog>
      {!chatEntry && <AppFooter navigate={navigate} />}
    </div>
  );
}

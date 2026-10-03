import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api.js";
export type WorkspaceItem = {
  id: string;
  kind: string;
  payload: Record<string, string | number | string[]>;
  revision: number;
  updated_at: string;
  author: string;
};
export function RecordHistory({
  record,
  token,
  writable,
  onClose,
  onRestored,
}: {
  record: WorkspaceItem;
  token: string;
  writable: boolean;
  onClose: () => void;
  onRestored: () => Promise<unknown>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState<WorkspaceItem[]>([]),
    [current, setCurrent] = useState(record),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    api<{ history: WorkspaceItem[]; current: WorkspaceItem }>(
      `/api/collaboration/records/${record.id}/history`,
      {},
      token,
    )
      .then((d) => {
        if (active) {
          setHistory(d.history);
          setCurrent(d.current);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setNotice(e.message);
      });
    return () => {
      active = false;
    };
  }, [record.id, token]);
  async function restore(version: number) {
    setBusy(true);
    setNotice("");
    try {
      await api(
        `/api/collaboration/records/${record.id}/restore`,
        {
          method: "POST",
          body: JSON.stringify({ version, revision: current.revision }),
        },
        token,
      );
      await onRestored();
      onClose();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    title: "제목",
    progress: "진행사항",
    discussion: "논의",
    requests: "협조 요청",
    decisions: "결정 사항",
    plans: "향후 계획",
    content: "내용",
    notes: "상세 내용",
    status: "상태",
    due: "기한",
    owner: "담당자",
    date: "날짜",
    time: "시간",
    location: "장소",
    attendees: "참석자",
    team: "분과",
    author: "작성자",
    meeting: "관련 회의",
  };
  return (
    <dialog
      ref={dialog}
      className="collab-dialog collab-history"
      aria-labelledby="collab-history-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <h3 id="collab-history-title">
          수정 이력 · 현재 {current.revision}번 버전
        </h3>
        <button disabled={busy} onClick={onClose}>
          닫기
        </button>
      </header>
      <p>
        이전 내용을 확인하고 복원할 수 있습니다. 복원하면 새 버전으로 저장되며
        이후 기록도 남습니다.
      </p>
      {notice && <p role="alert">{notice}</p>}
      {!loaded && !notice && <p>이력을 불러오고 있습니다.</p>}
      {loaded && !history.length && (
        <p>아직 이전 수정 이력이 없습니다. 다음 수정부터 이력이 쌓입니다.</p>
      )}
      {history.map((item) => (
        <details key={item.revision}>
          <summary>
            {item.revision}번 버전 ·{" "}
            {new Date(item.updated_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}{" "}
            · {item.author}
          </summary>
          <dl>
            {Object.entries(item.payload)
              .filter(([key, value]) => labels[key] && value)
              .map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>{labels[key]}</dt>
                  <dd>{String(value)}</dd>
                </React.Fragment>
              ))}
          </dl>
          <button
            className="collab-primary"
            disabled={busy || !writable}
            onClick={() => void restore(item.revision)}
          >
            {busy ? "복원 중…" : "이 버전으로 복원"}
          </button>
        </details>
      ))}
    </dialog>
  );
}
type Rule = { private: boolean; members: string[]; readOnly: string[] };
type Policy = { teams: Record<string, Rule> };
export function TeamPermissions({
  teams,
  token,
  onSaved,
}: {
  teams: string[];
  token: string;
  onSaved: () => Promise<unknown>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [policy, setPolicy] = useState<Policy>({ teams: {} }),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [emails, setEmails] = useState<
    Record<string, { members: string; readOnly: string }>
  >({});
  async function open() {
    setNotice("");
    setLoaded(false);
    dialog.current?.showModal();
    try {
      const d = await api<{ policy: Policy; revision: number }>(
        "/api/collaboration/policy",
        {},
        token,
      );
      setPolicy(d.policy);
      setRevision(d.revision);
      setEmails(
        Object.fromEntries(
          teams.map((t) => [
            t,
            {
              members: (d.policy.teams[t]?.members || []).join(", "),
              readOnly: (d.policy.teams[t]?.readOnly || []).join(", "),
            },
          ]),
        ),
      );
      setLoaded(true);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function change(team: string, key: keyof Rule, value: boolean | string[]) {
    setPolicy((p) => ({
      teams: {
        ...p.teams,
        [team]: {
          ...(p.teams[team] || { private: false, members: [], readOnly: [] }),
          [key]: value,
        },
      },
    }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const saved = await api<{ revision: number }>(
        "/api/collaboration/policy",
        {
          method: "PUT",
          body: JSON.stringify({
            revision,
            policy: {
              teams: Object.fromEntries(
                teams.map((t) => [
                  t,
                  {
                    ...(policy.teams[t] || { private: false }),
                    members: (emails[t]?.members || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    readOnly: (emails[t]?.readOnly || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                ]),
              ),
            },
          }),
        },
        token,
      );
      setRevision(saved.revision);
      await onSaved();
      setNotice("분과 권한을 저장했습니다.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button onClick={() => void open()}>분과 권한</button>
      <dialog
        ref={dialog}
        className="collab-dialog collab-permissions"
        aria-labelledby="collab-permissions-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header>
          <h3 id="collab-permissions-title">분과별 접근 권한</h3>
          <button disabled={busy} onClick={() => dialog.current?.close()}>
            닫기
          </button>
        </header>
        <p>
          전용 분과는 지정한 구성원과 운영자만 볼 수 있습니다. 분과
          회의록·업무·문서·대화·첨부파일에 적용됩니다. 공통 회의 정보와 전체
          채널은 함께 공유합니다.
        </p>
        <p>
          이메일은 쉼표로 구분하세요. 전용 분과의 읽기 전용 구성원은 구성원
          목록에도 포함해 주세요. 운영자는 모든 분과를 관리할 수 있습니다.
        </p>
        <form onSubmit={save}>
          {loaded &&
            teams.map((team) => {
              const rule = policy.teams[team] || {
                private: false,
                members: [],
                readOnly: [],
              };
              return (
                <fieldset key={team}>
                  <legend>{team}</legend>
                  <label className="collab-checkbox">
                    <input
                      type="checkbox"
                      checked={rule.private}
                      onChange={(e) =>
                        change(team, "private", e.target.checked)
                      }
                    />{" "}
                    지정 구성원 전용
                  </label>
                  <label>
                    구성원 이메일
                    <input
                      value={emails[team]?.members || ""}
                      onChange={(e) =>
                        setEmails((old) => ({
                          ...old,
                          [team]: { ...old[team], members: e.target.value },
                        }))
                      }
                      placeholder="member@example.com"
                    />
                  </label>
                  <label>
                    읽기 전용 구성원 이메일
                    <input
                      value={emails[team]?.readOnly || ""}
                      onChange={(e) =>
                        setEmails((old) => ({
                          ...old,
                          [team]: { ...old[team], readOnly: e.target.value },
                        }))
                      }
                      placeholder="viewer@example.com"
                    />
                  </label>
                </fieldset>
              );
            })}
          {notice && <p role="status">{notice}</p>}
          <button className="collab-primary" disabled={busy || !loaded}>
            {busy ? "저장 중…" : "권한 저장"}
          </button>
        </form>
      </dialog>
    </>
  );
}

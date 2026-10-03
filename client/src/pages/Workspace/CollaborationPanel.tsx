import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Download,
  FileText,
  Hash,
  Layers,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Search,
} from "lucide-react";
import { downloadMeetingExcel } from "../../utils/meetingExcel.js";
import { api } from "../../api.js";
import type { AdminRole } from "../../types.js";
import "./collaboration.css";
const teams = [
  "총괄",
  "대외협력(재정)",
  "홈스테이",
  "교육",
  "청소년",
  "시설",
  "전산",
  "회계",
];
const fields = [
  ["progress", "진행사항"],
  ["discussion", "상호협조(논의)사항"],
  ["requests", "협조 요청 팀"],
  ["decisions", "결정 사항"],
  ["plans", "향후 계획"],
];
type Item = {
  id: string;
  kind: string;
  payload: Record<string, string | number>;
  revision: number;
  updated_at: string;
  author: string;
};
type Editor = {
  kind: string;
  record?: Item;
  payload: Record<string, string | number>;
};
function p(item: Item, key: string) {
  return String(item.payload[key] ?? "");
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const date = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function CollaborationPanel({
  token,
  role,
}: {
  token: string;
  role: AdminRole;
}) {
  const [records, setRecords] = useState<Item[]>([]),
    [ready, setReady] = useState(false),
    [view, setView] = useState("회의록"),
    [channel, setChannel] = useState("전체"),
    [meetingId, setMeetingId] = useState(""),
    [team, setTeam] = useState("전체"),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState(""),
    [saving, setSaving] = useState(false),
    [user, setUser] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [detail, setDetail] = useState<Item | null>(null),
    [thread, setThread] = useState<Item | null>(null),
    [message, setMessage] = useState(""),
    [reply, setReply] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    uploadInput = useRef<HTMLInputElement>(null),
    busy = useRef(false);
  async function load() {
    try {
      const d = await api<{ records: Item[]; user: { name: string } }>(
        "/api/collaboration/records",
        {},
        token,
      );
      setRecords(d.records);
      setUser(d.user.name);
      setReady(true);
      setFailure("");
      return d.records;
    } catch (e) {
      setFailure((e as Error).message);
      return null;
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [token]);
  useEffect(() => {
    if (editor && dialog.current && !dialog.current.open)
      dialog.current.showModal();
    if (!editor && dialog.current?.open) dialog.current.close();
  }, [editor]);
  const meetings = records
    .filter((r) => r.kind === "meeting")
    .sort((a, b) => p(b, "date").localeCompare(p(a, "date")));
  const meeting = meetings.find((r) => r.id === meetingId) || meetings[0];
  const reports = records
    .filter((r) => r.kind === "report" && p(r, "meeting") === meeting?.id)
    .sort((a, b) => teams.indexOf(p(a, "team")) - teams.indexOf(p(b, "team")));
  const tasks = records.filter((r) => r.kind === "task");
  const docs = records.filter((r) => r.kind === "doc");
  const files = records.filter((r) => r.kind === "file");
  const messages = records
    .filter((r) => r.kind === "message" && p(r, "channel") === channel)
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const shown = (items: Item[]) =>
    items.filter(
      (r) =>
        (team === "전체" || p(r, "team") === team) &&
        (JSON.stringify(r.payload) + " " + r.author)
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  const liveDetail = detail
    ? records.find((r) => r.id === detail.id) || detail
    : null;
  function navigate(next: string) {
    setView(next);
    setTeam("전체");
    setSearch("");
    setDetail(null);
    setThread(null);
    setNotice("");
  }
  function start(
    kind: string,
    record?: Item,
    defaults?: Record<string, string | number>,
  ) {
    const base: Record<string, Record<string, string | number>> = {
      meeting: {
        title: "",
        date: date(),
        time: "10:00",
        location: "세곡동 성당 WYD 사무실",
        attendees: "",
        status: "작성 중",
      },
      task: {
        title: "",
        team,
        owner: "",
        due: "",
        status: "할 일",
        notes: "",
        meeting: meeting?.id || "",
      },
      doc: { title: "", team, content: "" },
    };
    setEditor({
      kind,
      record,
      payload: { ...(record?.payload || base[kind]), ...defaults },
    });
    setNotice("");
  }
  async function save(
    kind: string,
    payload: Record<string, string | number>,
    record?: Item,
  ) {
    const id = record?.id || crypto.randomUUID();
    const d = await api<{ record: Item }>(
      "/api/collaboration/records" + (record ? "/" + id : ""),
      {
        method: record ? "PUT" : "POST",
        body: JSON.stringify({ id, kind, payload, revision: record?.revision }),
      },
      token,
    );
    await load();
    return d.record;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy.current) return;
    busy.current = true;
    setSaving(true);
    setNotice("");
    try {
      const r = await save(editor.kind, editor.payload, editor.record);
      if (r.kind === "meeting") {
        setMeetingId(r.id);
        setView("회의록");
      }
      setEditor(null);
      setNotice("저장했습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function changeStatus(r: Item, status: string) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await save("task", { ...r.payload, status }, r);
      setNotice("업무 상태를 변경했습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function send(isReply = false) {
    const content = isReply ? reply : message;
    if (!content.trim() || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await save("message", {
        channel,
        content,
        parent: isReply ? thread?.id || "" : "",
      });
      isReply ? setReply("") : setMessage("");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function importFile(file: File) {
    if (file.size > 700 * 1024) {
      setNotice("가져오기 파일은 700KB 이하로 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const data = JSON.parse(await file.text());
      const d = await api<{ count: number }>(
        "/api/collaboration/import",
        { method: "POST", body: JSON.stringify(data) },
        token,
      );
      await load();
      setNotice(`${d.count}개 기록을 가져왔습니다.`);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSaving(false);
      if (importInput.current) importInput.current.value = "";
    }
  }
  async function upload(file: File) {
    if (file.size > 12 * 1024 * 1024) {
      setNotice("12MB 이하 파일을 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/collaboration/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      if (!response.ok) {
        const d = await response.json();
        throw Error(d.message);
      }
      await load();
      setNotice("자료를 업로드했습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSaving(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }
  async function fetchFile(r: Item) {
    try {
      const response = await fetch("/api/collaboration/files/" + r.id, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw Error("자료를 내려받지 못했습니다.");
      download(await response.blob(), p(r, "name"));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function exportAll() {
    download(
      new Blob(
        [
          JSON.stringify(
            {
              format: "wyd-collaboration-v1",
              records: records
                .filter((r) => r.kind !== "file")
                .map(({ id, kind, payload, author }) => ({
                  id,
                  kind,
                  payload,
                  author,
                })),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "WYD-협업기록.json",
    );
    setNotice(
      "기록을 내보냈습니다. 첨부 자료 파일은 자료 목록에서 개별 다운로드해 주세요.",
    );
  }
  async function exportExcel() {
    if (!meeting) return;
    try {
      await downloadMeetingExcel(meeting, records);
      setNotice("기존 엑셀 양식으로 회의록을 내려받았습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function exportCsv() {
    if (!meeting) return;
    const rows = [
      ["회의명", p(meeting, "title")],
      ["일시", p(meeting, "date") + " " + p(meeting, "time")],
      ["장소", p(meeting, "location")],
      ["참석자", p(meeting, "attendees")],
      [],
      ["분과", "작성자", ...fields.map((f) => f[1])],
      ...reports.map((r) => [
        p(r, "team"),
        p(r, "author"),
        ...fields.map(([key]) => p(r, key)),
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map(
              (x) =>
                '"' +
                (/^[=+\-@]/.test(x) ? "'" + x : x).replace(/"/g, '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    download(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      p(meeting, "title") + ".csv",
    );
  }
  const set = (key: string, value: string) =>
    editor &&
    setEditor({ ...editor, payload: { ...editor.payload, [key]: value } });
  const select = (
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
  ) => (
    <label className="collab-select">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  const add = (
    kind: string,
    label: string,
    defaults?: Record<string, string | number>,
  ) => (
    <button
      className="collab-primary"
      disabled={!ready || saving}
      onClick={() => start(kind, undefined, defaults)}
    >
      <Plus size={17} />
      {label}
    </button>
  );
  const empty = (title: string, description: string) => (
    <div className="collab-empty">
      <Layers size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
  return (
    <section className="collab-workspace">
      <header className="collab-heading">
        <div>
          <span>WYD · 세곡동성당</span>
          <h2>우리의 워크스페이스</h2>
        </div>
        <div className="collab-actions">
          <button disabled={!ready} onClick={exportAll}>
            <Download size={16} />
            기록 백업
          </button>
          {role !== "committee" && (
            <button
              disabled={!ready || saving}
              onClick={() => importInput.current?.click()}
            >
              기록 가져오기
            </button>
          )}
          <button
            aria-label="최신 협업 기록 불러오기"
            onClick={() => void load()}
          >
            <RefreshCw size={17} />
          </button>
          <input
            hidden
            ref={importInput}
            type="file"
            accept="application/json,.json"
            onChange={(e) =>
              e.target.files?.[0] && void importFile(e.target.files[0])
            }
          />
        </div>
      </header>
      {(notice || failure) && (
        <div className="collab-notice" role="status">
          {failure || notice}
        </div>
      )}
      <div className="collab-layout">
        <aside className="collab-nav">
          <div className="collab-nav-title">협업 공간</div>
          {[
            ["회의록", FileText],
            ["후속 업무", CheckSquare],
            ["문서함", BookOpen],
            ["대화", MessageSquare],
          ].map(([label, Icon]: any) => (
            <button
              key={label}
              className={view === label ? "active" : ""}
              onClick={() => navigate(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          <div className="collab-nav-title">분과 채널</div>
          {["전체", ...teams].map((t) => (
            <button
              key={t}
              className={view === "대화" && channel === t ? "active" : ""}
              onClick={() => {
                navigate("대화");
                setChannel(t);
              }}
            >
              <Hash size={16} />
              {t === "전체" ? "전체 공지·대화" : t}
            </button>
          ))}
        </aside>
        <div className="collab-content">
          <div className="collab-view-header">
            <h3>{view === "대화" ? "# " + channel : view}</h3>
            <label className="collab-search">
              <Search size={16} />
              <input
                aria-label="현재 화면 기록 검색"
                value={search}
                placeholder="기록 검색"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {view === "회의록"
              ? add("meeting", "새 회의")
              : view === "후속 업무"
                ? add("task", "업무 추가")
                : view === "문서함"
                  ? add("doc", "새 문서")
                  : null}
          </div>
          {!ready && !failure && <p>공유 기록을 불러오는 중입니다.</p>}
          {view === "회의록" ? (
            <>
              {meetings.length === 0 ? (
                empty(
                  "첫 공동회의록을 만들어보세요",
                  "새 회의를 만들면 8개 분과의 작성란이 자동으로 생성됩니다. 기존 회의록은 기록 가져오기로 옮길 수 있습니다.",
                )
              ) : (
                <>
                  <div className="collab-meeting-picker">
                    <select
                      aria-label="회의 선택"
                      value={meeting?.id || ""}
                      onChange={(e) => setMeetingId(e.target.value)}
                    >
                      {meetings.map((m) => (
                        <option key={m.id} value={m.id}>
                          {p(m, "title")} · {p(m, "date")}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!ready}
                      onClick={() => void exportExcel()}
                    >
                      <Download size={15} /> 기존 양식 엑셀
                    </button>
                    <button onClick={exportCsv}>
                      <Download size={15} />
                      회의록 CSV
                    </button>
                    <button
                      disabled={!ready || saving}
                      onClick={() => start("meeting", meeting)}
                    >
                      <Pencil size={15} />
                      회의 정보 수정
                    </button>
                  </div>
                  <section className="collab-meeting">
                    <div>
                      <span>{p(meeting, "status")}</span>
                      <h3>{p(meeting, "title")}</h3>
                      <p>
                        <CalendarDays size={15} />
                        {p(meeting, "date")} {p(meeting, "time")} ·{" "}
                        {p(meeting, "location")}
                      </p>
                      <p>참석자: {p(meeting, "attendees") || "미작성"}</p>
                    </div>
                    <div className="collab-progress">
                      <span>분과 작성 현황</span>
                      <strong>
                        {
                          reports.filter((r) =>
                            fields.some(([key]) => p(r, key).trim()),
                          ).length
                        }
                        <small> / 8</small>
                      </strong>
                    </div>
                  </section>
                  <div className="collab-filter">
                    {select("분과", team, ["전체", ...teams], setTeam)}
                    <span>진행사항 · 논의 · 결정 · 향후 계획</span>
                  </div>
                  <div className="collab-reports">
                    {shown(reports).map((r) => (
                      <article key={r.id}>
                        <header>
                          <div>
                            <b>{p(r, "team")}</b>
                            <small>{p(r, "author") || "작성자 미정"}</small>
                          </div>
                          <button
                            disabled={!ready || saving}
                            onClick={() => start("report", r)}
                          >
                            <Pencil size={14} />
                            작성·수정
                          </button>
                        </header>
                        <section className="collab-report-preview">
                          <h4>진행사항</h4>
                          <p>
                            {p(r, "progress") || "아직 기록되지 않았습니다."}
                          </p>
                        </section>
                        <details
                          className="collab-report-details"
                          open={team !== "전체"}
                        >
                          <summary>
                            논의·결정·향후 계획 <ChevronDown size={15} />
                          </summary>
                          {fields
                            .filter(([key]) => key !== "progress")
                            .map(([key, label]) => (
                              <section key={key}>
                                <h4>{label}</h4>
                                <p>
                                  {p(r, key) || "아직 기록되지 않았습니다."}
                                </p>
                              </section>
                            ))}
                        </details>
                        {p(r, "plans") && (
                          <button
                            className="collab-link"
                            onClick={() =>
                              start("task", undefined, {
                                team: p(r, "team"),
                                notes: p(r, "plans"),
                                meeting: r.payload.meeting,
                              })
                            }
                          >
                            <Plus size={15} />
                            후속 업무로 등록
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                  <div className="collab-section-head">
                    <h3>전체회의 결정 및 후속조치</h3>
                    {add("task", "후속 업무 추가", {
                      meeting: meeting?.id || "",
                    })}
                  </div>
                  {tasks
                    .filter((t) => p(t, "meeting") === meeting?.id)
                    .map((t) => (
                      <button
                        key={t.id}
                        className="collab-task-row"
                        onClick={() => start("task", t)}
                      >
                        <CheckSquare size={17} />
                        <b>{p(t, "title")}</b>
                        <span>
                          {p(t, "team")} · {p(t, "due") || "기한 미정"} ·{" "}
                          {p(t, "status")}
                        </span>
                      </button>
                    ))}
                  {!tasks.some((t) => p(t, "meeting") === meeting?.id) && (
                    <p className="collab-muted">
                      회의에서 확정한 내용과 담당 분과, 기한을 기록해 주세요.
                    </p>
                  )}
                </>
              )}
            </>
          ) : view === "후속 업무" ? (
            <>
              <div className="collab-filter">
                {select("담당 분과", team, ["전체", ...teams], setTeam)}
              </div>
              {tasks.length === 0 ? (
                empty(
                  "다음 할 일을 등록해보세요",
                  "회의에서 결정한 내용을 담당 분과와 기한에 연결합니다.",
                )
              ) : (
                <div className="collab-board">
                  {["할 일", "진행 중", "완료"].map((status) => (
                    <section key={status}>
                      <h4>
                        {status}
                        <span>
                          {
                            shown(tasks).filter(
                              (r) => p(r, "status") === status,
                            ).length
                          }
                        </span>
                      </h4>
                      {shown(tasks)
                        .filter((r) => p(r, "status") === status)
                        .map((r) => (
                          <article key={r.id}>
                            <header>
                              <span>{p(r, "team")}</span>
                              <button
                                aria-label={p(r, "title") + " 수정"}
                                onClick={() => start("task", r)}
                              >
                                <Pencil size={14} />
                              </button>
                            </header>
                            <h4>{p(r, "title")}</h4>
                            <p>{p(r, "notes")}</p>
                            <small>
                              {p(r, "owner") || "담당자 미정"} ·{" "}
                              {p(r, "due") || "기한 미정"}
                            </small>
                            <select
                              aria-label={p(r, "title") + " 상태"}
                              value={p(r, "status")}
                              disabled={saving}
                              onChange={(e) =>
                                void changeStatus(r, e.target.value)
                              }
                            >
                              {["할 일", "진행 중", "완료"].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </article>
                        ))}
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : view === "문서함" ? (
            <>
              <div className="collab-filter">
                {select("분과", team, ["전체", ...teams], setTeam)}
              </div>
              <div className="collab-docs">
                {shown(docs).map((r) => (
                  <button key={r.id} onClick={() => setDetail(r)}>
                    <BookOpen size={25} />
                    <span>{p(r, "team")}</span>
                    <h4>{p(r, "title")}</h4>
                    <p>{p(r, "content")}</p>
                    <small>
                      {r.author} · {r.updated_at.slice(0, 10)}
                    </small>
                  </button>
                ))}
              </div>
              {!shown(docs).length &&
                empty(
                  "문서를 함께 쌓아보세요",
                  "안내, 아이디어와 준비 자료를 기록해 주세요.",
                )}
              <div className="collab-section-head">
                <div>
                  <h3>공유 자료</h3>
                  <p className="collab-muted">파일당 최대 12MB</p>
                </div>
                <button
                  disabled={!ready || saving}
                  onClick={() => uploadInput.current?.click()}
                >
                  <Paperclip size={16} />
                  자료 업로드
                </button>
                <input
                  hidden
                  type="file"
                  ref={uploadInput}
                  onChange={(e) =>
                    e.target.files?.[0] && void upload(e.target.files[0])
                  }
                />
              </div>
              {files.map((r) => (
                <button
                  key={r.id}
                  className="collab-file"
                  onClick={() => void fetchFile(r)}
                >
                  <Paperclip size={18} />
                  <b>{p(r, "name")}</b>
                  <span>{(Number(r.payload.size) / 1024).toFixed(0)}KB</span>
                  <Download size={17} />
                </button>
              ))}
              {!files.length && (
                <p className="collab-muted">공유할 자료를 업로드해 주세요.</p>
              )}
            </>
          ) : (
            <>
              <div className="collab-chat-heading">
                {select("채널", channel, ["전체", ...teams], (v) => {
                  setChannel(v);
                  setThread(null);
                })}
                <p>
                  {channel === "전체"
                    ? "모든 분과가 함께 이야기하는 공간"
                    : channel + " 분과의 대화"}
                </p>
              </div>
              <div className="collab-chat-feed">
                {messages
                  .filter(
                    (r) =>
                      !p(r, "parent") &&
                      JSON.stringify(r.payload).includes(search),
                  )
                  .map((r) => (
                    <article key={r.id}>
                      <header>
                        <b>{r.author}</b>
                        <time>
                          {new Intl.DateTimeFormat("ko-KR", {
                            timeZone: "Asia/Seoul",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(r.updated_at))}
                        </time>
                      </header>
                      <p>{p(r, "content")}</p>
                      <button
                        className="collab-link"
                        onClick={() => {
                          setThread(r);
                          setReply("");
                        }}
                      >
                        <MessageSquare size={14} />
                        {messages.filter((m) => p(m, "parent") === r.id).length}
                        개의 답글
                      </button>
                    </article>
                  ))}
                {!messages.some((r) => !p(r, "parent")) &&
                  empty(
                    "첫 대화를 시작해보세요",
                    "분과의 소식과 협조가 필요한 내용을 남겨 주세요.",
                  )}
              </div>
              <div className="collab-composer">
                <textarea
                  aria-label="채널 메시지"
                  placeholder={"# " + channel + "에 메시지 남기기"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <footer>
                  <span>{user} · Ctrl / ⌘ + Enter로 보내기</span>
                  <button
                    className="collab-primary"
                    disabled={!ready || saving || !message.trim()}
                    onClick={() => void send()}
                  >
                    <Send size={16} />
                    보내기
                  </button>
                </footer>
              </div>
            </>
          )}
        </div>
      </div>
      {liveDetail && (
        <div className="collab-detail">
          <header>
            <div>
              <small>{p(liveDetail, "team")} · 공유 문서</small>
              <h3>{p(liveDetail, "title")}</h3>
            </div>
            <div className="collab-actions">
              <button onClick={() => start("doc", liveDetail)}>
                <Pencil size={15} />
                수정
              </button>
              <button onClick={() => setDetail(null)}>닫기</button>
            </div>
          </header>
          <div className="collab-doc-text">
            {p(liveDetail, "content")
              .split("\n")
              .map((line, i) =>
                line.startsWith("# ") ? (
                  <h3 key={i}>{line.slice(2)}</h3>
                ) : line.startsWith("## ") ? (
                  <h4 key={i}>{line.slice(3)}</h4>
                ) : (
                  <p key={i}>
                    {line.startsWith("- ")
                      ? "• " + line.slice(2)
                      : line || "\u00a0"}
                  </p>
                ),
              )}
          </div>
        </div>
      )}
      {thread && (
        <div className="collab-detail">
          <header>
            <h3>대화의 답글</h3>
            <button onClick={() => setThread(null)}>닫기</button>
          </header>
          <article className="collab-thread-original">
            <b>{thread.author}</b>
            <p>{p(thread, "content")}</p>
          </article>
          {messages
            .filter((r) => p(r, "parent") === thread.id)
            .map((r) => (
              <article className="collab-thread-reply" key={r.id}>
                <b>{r.author}</b>
                <p>{p(r, "content")}</p>
              </article>
            ))}
          <div className="collab-composer">
            <textarea
              aria-label="답글 내용"
              placeholder="관련 논의를 이어가세요"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <footer>
              <button
                className="collab-primary"
                disabled={saving || !reply.trim()}
                onClick={() => void send(true)}
              >
                <Send size={15} />
                답글 보내기
              </button>
            </footer>
          </div>
        </div>
      )}
      <dialog
        ref={dialog}
        className="collab-dialog"
        aria-labelledby="collab-editor-title"
        onCancel={(e) => {
          if (saving) e.preventDefault();
          else setEditor(null);
        }}
      >
        <header>
          <h3 id="collab-editor-title">
            {editor?.kind === "report"
              ? String(editor.payload.team) + " 분과 기록"
              : editor?.kind === "meeting"
                ? "회의 정보"
                : editor?.kind === "task"
                  ? "후속 업무"
                  : "공유 문서"}
          </h3>
          <button
            aria-label="편집 창 닫기"
            disabled={saving}
            onClick={() => setEditor(null)}
          >
            ×
          </button>
        </header>
        {editor && (
          <form onSubmit={submit}>
            {editor.kind === "report" ? (
              <>
                <label>
                  작성자
                  <input
                    value={String(editor.payload.author)}
                    maxLength={200}
                    onChange={(e) => set("author", e.target.value)}
                  />
                </label>
                {fields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      rows={key === "requests" ? 2 : 4}
                      value={String(editor.payload[key])}
                      maxLength={30000}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </label>
                ))}
              </>
            ) : (
              <>
                <label>
                  {editor.kind === "task"
                    ? "업무 제목"
                    : editor.kind === "meeting"
                      ? "회의 제목"
                      : "문서 제목"}
                  <input
                    required
                    maxLength={200}
                    value={String(editor.payload.title)}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </label>
                {editor.kind === "meeting" ? (
                  <>
                    <div className="collab-form-grid">
                      <label>
                        날짜
                        <input
                          required
                          type="date"
                          value={String(editor.payload.date)}
                          onChange={(e) => set("date", e.target.value)}
                        />
                      </label>
                      <label>
                        시간
                        <input
                          required
                          type="time"
                          value={String(editor.payload.time)}
                          onChange={(e) => set("time", e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      장소
                      <input
                        value={String(editor.payload.location)}
                        onChange={(e) => set("location", e.target.value)}
                      />
                    </label>
                    <label>
                      참석자
                      <textarea
                        rows={2}
                        value={String(editor.payload.attendees)}
                        onChange={(e) => set("attendees", e.target.value)}
                      />
                    </label>
                    {select(
                      "회의 상태",
                      String(editor.payload.status),
                      ["작성 중", "진행 중", "완료"],
                      (v) => set("status", v),
                    )}
                  </>
                ) : (
                  <>
                    {select(
                      "담당 분과",
                      String(editor.payload.team),
                      ["전체", ...teams],
                      (v) => set("team", v),
                    )}
                    {editor.kind === "task" ? (
                      <>
                        <div className="collab-form-grid">
                          <label>
                            담당자
                            <input
                              maxLength={200}
                              value={String(editor.payload.owner)}
                              onChange={(e) => set("owner", e.target.value)}
                            />
                          </label>
                          <label>
                            기한
                            <input
                              type="date"
                              value={String(editor.payload.due)}
                              onChange={(e) => set("due", e.target.value)}
                            />
                          </label>
                        </div>
                        {select(
                          "업무 상태",
                          String(editor.payload.status),
                          ["할 일", "진행 중", "완료"],
                          (v) => set("status", v),
                        )}
                        <label>
                          관련 회의
                          <select
                            value={String(editor.payload.meeting)}
                            onChange={(e) => set("meeting", e.target.value)}
                          >
                            <option value="">연결하지 않음</option>
                            {meetings.map((m) => (
                              <option key={m.id} value={m.id}>
                                {p(m, "title")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          상세 내용
                          <textarea
                            rows={5}
                            value={String(editor.payload.notes)}
                            maxLength={30000}
                            onChange={(e) => set("notes", e.target.value)}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <p className="collab-muted">
                          # 제목과 - 목록으로 내용을 정리할 수 있습니다.
                        </p>
                        <label>
                          문서 내용
                          <textarea
                            rows={12}
                            value={String(editor.payload.content)}
                            maxLength={30000}
                            onChange={(e) => set("content", e.target.value)}
                          />
                        </label>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {notice && (
              <p className="collab-notice" role="alert">
                {notice}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditor(null)}
              >
                취소
              </button>
              <button
                type="submit"
                className="collab-primary"
                disabled={saving}
              >
                {saving ? "저장 중…" : "저장하기"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </section>
  );
}

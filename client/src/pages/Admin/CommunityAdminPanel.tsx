import React, { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, MessageSquareText, Pencil, Save, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import type { FaqItem, QnaPost } from "../../types.js";

type AnswerFeedback = { id: string; tone: "success" | "error"; text: string } | null;

export function CommunityAdminPanel({ token }: { token: string }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [qnas, setQnas] = useState<QnaPost[]>([]);
  const [faq, setFaq] = useState({ category: "일반", question: "", answer: "", sortOrder: 0, published: true });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>(null);

  const load = () => api<{ faqs: FaqItem[]; qnas: QnaPost[] }>("/api/admin/community", {}, token).then((data) => {
    setFaqs(data.faqs);
    setQnas(data.qnas);
    setAnswers(Object.fromEntries(data.qnas.map((q) => [q.id, q.answer || ""])));
  });

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, [token]);

  const addFaq = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await api("/api/admin/faqs", { method: "POST", body: JSON.stringify(faq) }, token);
      setFaq({ category: "일반", question: "", answer: "", sortOrder: 0, published: true });
      setMessage("FAQ를 등록했습니다.");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const saveAnswer = async (item: QnaPost) => {
    const answer = (answers[item.id] ?? "").trim();
    setAnswerFeedback(null);
    if (answer.length < 2) {
      setAnswerFeedback({ id: item.id, tone: "error", text: "답변을 입력해 주세요." });
      return;
    }
    setSavingId(item.id);
    try {
      const data = await api<{ qna: { id: string; answer: string; status: string; answeredAt: string } }>(`/api/admin/qna/${item.id}/answer`, {
        method: "PATCH",
        body: JSON.stringify({ answer })
      }, token);
      setQnas((current) => current.map((qna) => qna.id === item.id ? { ...qna, ...data.qna } : qna));
      setAnswers((current) => ({ ...current, [item.id]: data.qna.answer }));
      setEditingId(null);
      setAnswerFeedback({ id: item.id, tone: "success", text: item.status === "answered" ? "답변 수정 내용을 저장했습니다." : "답변을 저장했습니다." });
    } catch (error) {
      setAnswerFeedback({ id: item.id, tone: "error", text: (error as Error).message });
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (item: QnaPost) => {
    setAnswers((current) => ({ ...current, [item.id]: item.answer || "" }));
    setEditingId(item.id);
    setAnswerFeedback(null);
  };

  const cancelEditing = (item: QnaPost) => {
    setAnswers((current) => ({ ...current, [item.id]: item.answer || "" }));
    setEditingId(null);
    setAnswerFeedback(null);
  };

  return (
    <section className="admin-feature-panel">
      <header><div><span>Community</span><h2>FAQ 및 Q&A 관리</h2><p>자주 묻는 질문을 게시하고 접수된 문의에 답변합니다.</p></div></header>
      {message && <p className="form-message">{message}</p>}
      <div className="admin-feature-grid">
        <form className="feature-form" onSubmit={addFaq}>
          <div className="section-title"><CircleHelp /><h3>FAQ 등록</h3></div>
          <div className="form-grid two">
            <label><span>분류</span><input value={faq.category} onChange={(event) => setFaq({ ...faq, category: event.target.value })} /></label>
            <label><span>정렬 순서</span><input type="number" min={0} value={faq.sortOrder} onChange={(event) => setFaq({ ...faq, sortOrder: Number(event.target.value) })} /></label>
          </div>
          <label><span>질문</span><input required value={faq.question} onChange={(event) => setFaq({ ...faq, question: event.target.value })} /></label>
          <label><span>답변</span><textarea required value={faq.answer} onChange={(event) => setFaq({ ...faq, answer: event.target.value })} /></label>
          <label className="inline-check"><input type="checkbox" checked={faq.published} onChange={(event) => setFaq({ ...faq, published: event.target.checked })} />바로 공개</label>
          <button className="primary" type="submit">FAQ 등록</button>
          <div className="compact-list">
            {faqs.map((item) => <div key={item.id}><span>{item.category}</span><strong>{item.question}</strong><button title="삭제" onClick={async () => { await api(`/api/admin/faqs/${item.id}`, { method: "DELETE" }, token); await load(); }} type="button"><Trash2 size={16} /></button></div>)}
          </div>
        </form>

        <div className="feature-form">
          <div className="section-title"><MessageSquareText /><h3>Q&A 답변</h3></div>
          <div className="admin-qna-list">
            {qnas.map((item) => {
              const answered = item.status === "answered" && Boolean(item.answer);
              const editing = editingId === item.id || !answered;
              const feedback = answerFeedback?.id === item.id ? answerFeedback : null;
              return (
                <article key={item.id} className={answered ? "answered" : "waiting"}>
                  <header>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <small>{item.authorName} · {item.createdAt.slice(0, 10)}</small>
                  </header>
                  <div className="qna-answer-state"><span className={answered ? "answered" : "waiting"}>{answered ? "답변 완료" : "답변 대기"}</span>{item.answeredAt && <small>최근 저장 {item.answeredAt.slice(0, 16).replace("T", " ")}</small>}</div>
                  <p>{item.content}</p>
                  <textarea
                    value={answers[item.id] ?? ""}
                    readOnly={!editing}
                    className={!editing ? "answer-readonly" : ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="운영자 답변"
                  />
                  {feedback && <p className={`qna-save-feedback ${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.tone === "success" ? <CheckCircle2 /> : <CircleAlert />}{feedback.text}</p>}
                  <div className="button-row qna-answer-actions">
                    {answered && !editing ? (
                      <button type="button" className="primary" onClick={() => startEditing(item)}><Pencil size={17} /> 답변 수정</button>
                    ) : (
                      <>
                        <button type="button" className="primary" disabled={savingId === item.id} onClick={() => void saveAnswer(item)}><Save size={17} /> {savingId === item.id ? "저장 중" : answered ? "수정 내용 저장" : "답변 저장"}</button>
                        {answered && <button type="button" className="secondary" onClick={() => cancelEditing(item)}>수정 취소</button>}
                      </>
                    )}
                    <button type="button" className="secondary danger" onClick={async () => { if (!confirm("문의를 삭제하시겠습니까?")) return; await api(`/api/admin/qna/${item.id}`, { method: "DELETE" }, token); await load(); }}><Trash2 size={16} /> 삭제</button>
                  </div>
                </article>
              );
            })}
            {!qnas.length && <p className="empty-copy">접수된 문의가 없습니다.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

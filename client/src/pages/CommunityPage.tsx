import React, { useEffect, useMemo, useState } from "react";
import { CircleHelp, MessageSquarePlus, MessageSquareText, Search, Send } from "lucide-react";
import { api } from "../api.js";
import type { FaqItem, QnaPost } from "../types.js";

export function CommunityPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [qnas, setQnas] = useState<QnaPost[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ authorName: "", password: "", category: "일반", title: "", content: "" });
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const load = () => api<{ faqs: FaqItem[]; qnas: QnaPost[] }>("/api/community").then((data) => {
    setFaqs(data.faqs);
    setQnas(data.qnas);
  });
  useEffect(() => { load().catch(() => setMessage("게시판을 불러오지 못했습니다.")); }, []);
  useEffect(() => {
    if (!inquiryModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setInquiryModalOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [inquiryModalOpen]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? faqs.filter((item) => `${item.category} ${item.question} ${item.answer}`.toLowerCase().includes(needle)) : faqs;
  }, [faqs, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) return setMessage("개인정보 수집 및 이용 안내에 동의해 주세요.");
    try {
      const result = await api<{ message: string }>("/api/community/qna", { method: "POST", body: JSON.stringify(form) });
      setMessage(result.message);
      setForm({ authorName: "", password: "", category: "일반", title: "", content: "" });
      setConsent(false);
      setInquiryModalOpen(false);
      await load();
    } catch (error) { setMessage((error as Error).message); }
  };

  return (
    <main className="single community-page">
      <div className="page-heading">
        <span>Help & Community</span><h2>FAQ 및 Q&A</h2>
        <p>자주 묻는 질문을 확인하고 행사 운영에 관한 문의를 남길 수 있습니다.</p>
      </div>
      <section className="panel community-section">
        <div className="section-title"><CircleHelp /><h3>자주 묻는 질문</h3></div>
        <label className="community-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="질문과 답변 통합 검색" /></label>
        <div className="faq-list">
          {filtered.map((item) => <details key={item.id}><summary><span>{item.category}</span>{item.question}</summary><p>{item.answer}</p></details>)}
          {!filtered.length && <p className="empty-copy">등록된 FAQ가 없습니다.</p>}
        </div>
      </section>
      <section className="panel community-section inquiry-entry">
        <div className="section-title"><MessageSquarePlus /><div><h3>궁금한 내용이 있으신가요?</h3><p>FAQ에서 찾지 못한 내용은 운영자에게 문의해 주세요.</p></div></div>
        {message && !inquiryModalOpen && <p className="form-message">{message}</p>}
        <button className="primary inquiry-open-button" type="button" onClick={() => { setMessage(""); setInquiryModalOpen(true); }}><MessageSquarePlus size={18} /> 문의 등록</button>
      </section>
      <section className="panel community-section">
        <div className="section-title"><MessageSquareText /><h3>최근 문의</h3></div>
        <div className="qna-list">{qnas.map((item) => <article key={item.id}><div><span>{item.category}</span><strong>{item.title}</strong><small>{item.authorName} · {item.createdAt.slice(0, 10)}</small></div><p>{item.content}</p>{item.answer && <blockquote><b>운영자 답변</b>{item.answer}</blockquote>}</article>)}</div>
      </section>
      {inquiryModalOpen && (
        <div className="community-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title" onClick={() => setInquiryModalOpen(false)}>
          <div className="community-inquiry-modal" onClick={(event) => event.stopPropagation()}>
            <header><div><span>Q&amp;A</span><h3 id="inquiry-modal-title">문의 등록</h3></div><button type="button" className="modal-close-button" onClick={() => setInquiryModalOpen(false)}>닫기</button></header>
            <form className="community-form" onSubmit={submit}>
              <div className="form-grid two"><label><span>작성자명</span><input autoFocus required value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} /></label><label><span>문의 비밀번호</span><input type="password" minLength={4} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label></div>
              <div className="form-grid inquiry-subject-grid"><label><span>분류</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>일반</option><option>홈스테이</option><option>자원봉사</option><option>순례자</option></select></label><label><span>제목</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label></div>
              <label><span>문의 내용</span><textarea required minLength={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
              <button type="button" className={consent ? "consent-row selected" : "consent-row"} onClick={() => setConsent(!consent)} aria-pressed={consent}><i>{consent ? "✓" : ""}</i><span>문의 처리 및 공개 답변을 위해 작성자명, 문의 내용, 접수 시각을 수집하는 데 동의합니다. 연락처, 주소, 건강정보 등 민감정보는 작성하지 마세요.</span></button>
              {message && <p className="form-message">{message}</p>}
              <div className="community-modal-actions"><button className="secondary" type="button" onClick={() => setInquiryModalOpen(false)}>취소</button><button className="primary" type="submit"><Send size={18} /> 문의 등록</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

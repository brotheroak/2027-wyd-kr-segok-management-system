import React, { useState, useEffect } from "react";
import { ShieldCheck, Users, Home, Languages, CheckCircle2, Unlock, Lock, Download, FileText, Search, RefreshCw, AlertCircle, XCircle, BedDouble, Sparkles } from "lucide-react";
import { BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { AdminRole, ApplicationPayload } from "../../types.js";
import { api } from "../../api.js";
import { languages, chartColors } from "../../utils/constants.js";
import { Metric } from "../../components/Metric.js";
import { DashboardBar } from "../../components/DashboardBar.js";
import { Toggle } from "../../components/Toggle.js";
import { AdminModeTabs } from "./AdminModeTabs.js";
import { VolunteerAdminPanel } from "./VolunteerAdminPanel.js";
import { ApplicationForm } from "../ApplicationForm.js";
import { AdminMaskedDetail } from "./AdminMaskedDetail.js";

type LoginState = {
  mfaRequired: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
};

export function AdminConsoleZip() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("wydAdminToken"));
  const [role, setRole] = useState<AdminRole | null>((localStorage.getItem("wydAdminRole") as AdminRole | null) ?? null);
  
  // New login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loginState, setLoginState] = useState<LoginState>({ mfaRequired: false });
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  // Search & Filter states
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterPets, setFilterPets] = useState("all");
  const [filterBed, setFilterBed] = useState("all");
  const [sortField, setSortField] = useState("applicationNo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeAdminTab, setActiveAdminTab] = useState<"homestay" | "volunteer">("homestay");
  
  const [data, setData] = useState<{ role: AdminRole; canViewPersonalData: boolean; stats: any; applications: ApplicationPayload[] } | null>(null);
  const [selected, setSelected] = useState<ApplicationPayload | null>(null);
  const [match, setMatch] = useState({ capacity: 1, language: "", bedNeeded: false, petAllergy: false, gender: "" });
  const [candidates, setCandidates] = useState<any[]>([]);

  const load = async (nextToken = token) => {
    if (!nextToken) return;
    const params = new URLSearchParams({ q: query, status });
    const response = await api<{ role: AdminRole; canViewPersonalData: boolean; stats: any; applications: ApplicationPayload[] }>(`/api/admin/applications?${params}`, {}, nextToken);
    setRole(response.role);
    localStorage.setItem("wydAdminRole", response.role);
    setData(response);
  };

  useEffect(() => {
    load().catch(() => {
      logout();
    });
  }, [token, status]);

  const handleLoginStep1 = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setBusy(true);
    try {
      const response = await api<LoginState>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (response.mfaRequired) {
        setLoginState(response);
      }
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoginStep2 = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setBusy(true);
    try {
      const response = await api<{ token: string; role: AdminRole }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password, code: otpCode })
      });
      localStorage.setItem("wydAdminToken", response.token);
      localStorage.setItem("wydAdminRole", response.role);
      setToken(response.token);
      setRole(response.role);
      resetLoginState();
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetLoginState = () => {
    setLoginState({ mfaRequired: false });
    setOtpCode("");
    setLoginError("");
  };

  const logout = () => {
    localStorage.removeItem("wydAdminToken");
    localStorage.removeItem("wydAdminRole");
    setToken(null);
    setRole(null);
    setData(null);
    setSelected(null);
    setEmail("");
    setPassword("");
    resetLoginState();
  };

  const downloadAuditLogs = async () => {
    const response = await fetch("/api/admin/audit-logs.csv", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return alert("감사 로그를 내려받지 못했습니다.");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  };

  if (!token) {
    return (
      <section className="single">
        <div className="bg-white rounded-3xl border border-gold-100 shadow-xl overflow-hidden max-w-md mx-auto">
          <div className="bg-catholic-navy px-8 py-9 text-white">
            <span className="text-gold-300 text-xs tracking-[0.22em] uppercase font-bold">Admin Access</span>
            <h2 className="font-serif font-black text-3xl mt-3">운영자 로그인</h2>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              운영자 이메일, 비밀번호 및 구글 OTP 2차 인증(MFA)을 진행합니다.
            </p>
          </div>
          <div className="p-8 space-y-5">
            {!loginState.mfaRequired ? (
              <form onSubmit={handleLoginStep1} className="space-y-4">
                <label className="block space-y-1">
                  <span className="font-bold text-gray-700 text-sm">운영자 이메일</span>
                  <input
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-gold-500 focus:outline-none"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@segok.parish"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-bold text-gray-700 text-sm">비밀번호</span>
                  <input
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-gold-500 focus:outline-none"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                {loginError && <p className="text-rose-600 text-xs font-bold">{loginError}</p>}
                <button type="submit" className="primary w-full justify-center" disabled={busy}>로그인</button>
              </form>
            ) : (
              <form onSubmit={handleLoginStep2} className="space-y-4">
                {!loginState.mfaEnabled && (() => {
                  const label = `2027 서울 WYD 세곡동성당:${email}`;
                  const issuer = `2027 서울 WYD 세곡동성당`;
                  const otpauthUri = `otpauth://totp/${encodeURIComponent(label)}?secret=${loginState.mfaSecret}&issuer=${encodeURIComponent(issuer)}`;
                  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUri)}`;
                  return (
                    <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4 text-xs space-y-2 text-gold-900 leading-relaxed">
                      <strong>⚠️ 구글 OTP(MFA) 초기 설정 안내</strong>
                      <p>OTP 인증 앱(Google Authenticator 등)을 실행하여 아래 <b>QR 코드</b>를 스캔하거나 <b>비밀키(MFA Secret)</b>를 직접 입력하여 추가하세요.</p>
                      
                      <div className="flex flex-col items-center justify-center p-3 bg-white border border-gold-200 rounded-xl my-2">
                        <img src={qrCodeUrl} alt="OTP QR Code" className="w-[180px] h-[180px] object-contain" />
                        <span className="text-[10px] text-gray-400 mt-1">인증 앱에서 이 QR 코드를 스캔하세요.</span>
                      </div>

                      <div className="bg-white border border-gold-300 rounded px-2 py-1.5 font-mono text-center text-sm font-bold tracking-wider select-all">
                        {loginState.mfaSecret}
                      </div>
                    </div>
                  );
                })()}
                <label className="block space-y-1">
                  <span className="font-bold text-gray-700 text-sm">OTP 인증번호 (6자리)</span>
                  <input
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-gold-500 focus:outline-none text-center font-mono text-xl tracking-widest"
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                </label>
                {loginError && <p className="text-rose-600 text-xs font-bold">{loginError}</p>}
                <div className="flex gap-2">
                  <button type="button" className="secondary w-1/3 justify-center" onClick={resetLoginState}>취소</button>
                  <button type="submit" className="primary w-2/3 justify-center" disabled={busy || otpCode.length !== 6}>인증 및 완료</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  }

  const canViewPersonalData = data?.canViewPersonalData ?? role === "privacy_admin";
  const applications = data?.applications ?? [];
  const statusLabel = (value?: string) => (value === "confirmed" ? "✅ 승인" : value === "canceled" ? "🚫 취소" : "⏳ 대기");
  const statusTone = (value?: string) => (value === "confirmed" ? "confirmed" : value === "canceled" ? "canceled" : "submitted");

  if (activeAdminTab === "volunteer") {
    return (
      <div className="space-y-8" id="admin-dashboard">
        <AdminModeTabs active={activeAdminTab} onChange={setActiveAdminTab} />
        <VolunteerAdminPanel token={token} canViewPersonalData={canViewPersonalData} statusLabel={statusLabel} statusTone={statusTone} />
      </div>
    );
  }

  const totalCapacity = applications.reduce((sum, item) => sum + (item.homestay.capacity || 0), 0);
  const confirmedCount = applications.filter((item) => item.status === "confirmed").length;
  const pendingCount = applications.filter((item) => item.status === "submitted").length;
  
  const languageCounts = applications.reduce<Record<string, number>>((acc, item) => {
    item.homestay.languages.forEach((language) => {
      acc[language] = (acc[language] ?? 0) + 1;
    });
    return acc;
  }, {});
  const languageData = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count]) => ({ name, count }));
  
  const housingData = ["아파트", "단독주택", "기타"].map((name) => ({
    name,
    value: applications.filter((item) => item.homestay.housingType === name).length
  }));

  const filteredApplications = applications
    .filter((item) => filterGender === "all" || item.homestay.preferredGender === filterGender)
    .filter((item) => filterLanguage === "all" || item.homestay.languages.includes(filterLanguage))
    .filter((item) => filterPets === "all" || (filterPets === "yes" ? item.homestay.hasPet : !item.homestay.hasPet))
    .filter((item) => filterBed === "all" || (filterBed === "yes" ? item.homestay.hasBed : !item.homestay.hasBed))
    .sort((a, b) => {
      let result = 0;
      if (sortField === "capacity") result = a.homestay.capacity - b.homestay.capacity;
      if (sortField === "name") result = a.representative.name.localeCompare(b.representative.name);
      if (sortField === "members") result = a.members.length - b.members.length;
      if (sortField === "applicationNo") result = String(a.applicationNo ?? "").localeCompare(String(b.applicationNo ?? ""));
      return sortOrder === "asc" ? result : -result;
    });

  const runMatch = async () => {
    const params = new URLSearchParams({
      capacity: String(match.capacity),
      language: match.language,
      bedNeeded: String(match.bedNeeded),
      petAllergy: String(match.petAllergy),
      gender: match.gender
    });
    const result = await api<{ role: AdminRole; canViewPersonalData: boolean; candidates: any[] }>(`/api/admin/match-candidates?${params}`, {}, token);
    setRole(result.role);
    setCandidates(result.candidates.slice(0, 5));
  };

  const updateStatus = async (application: ApplicationPayload, nextStatus: string) => {
    if (!application.id) return;
    const response = await api<{ application: ApplicationPayload }>(`/api/admin/applications/${application.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    }, token);
    setSelected((current) => (current?.id === application.id ? response.application : current));
    await load();
  };

  return (
    <div className="space-y-8" id="admin-dashboard">
      <AdminModeTabs active={activeAdminTab} onChange={setActiveAdminTab} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-dashboard">
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-gold-50 p-3 rounded-xl text-gold-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">총 신청 호스트 가정</span>
            <strong className="font-serif font-black text-2xl text-catholic-navy">{data?.stats?.total ?? applications.length} 가구</strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-catholic-navy/5 p-3 rounded-xl text-catholic-navy">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">수용 가능 총 순례자 수</span>
            <strong className="font-serif font-black text-2xl text-gold-600">{data?.stats?.capacity ?? totalCapacity} 명</strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-xl text-catholic-red">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">최종 승인 완료 비율</span>
            <strong className="font-serif font-black text-2xl text-catholic-navy">
              {applications.length ? Math.round((confirmedCount / applications.length) * 100) : 0}% ({confirmedCount}건)
            </strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">미결 승인대기 신청</span>
            <strong className="font-serif font-black text-2xl text-emerald-700">{pendingCount} 건</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts">
        <div className="bg-white p-6 rounded-3xl border border-gold-100 shadow-sm space-y-4">
          <span className="font-serif font-bold text-gray-800 text-base block">가정별 소통 언어 분포</span>
          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languageData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#c5a85c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gold-100 shadow-sm space-y-4">
          <span className="font-serif font-bold text-gray-800 text-base block">신청가정 주택유형 비율</span>
          <div className="h-64 text-xs flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={housingData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {housingData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-catholic-navy p-6 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-gold-200/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${canViewPersonalData ? "bg-amber-500 text-catholic-navy" : "bg-white/10 text-gold-200"}`}>
            {canViewPersonalData ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <span className="font-serif font-bold text-lg block">
              개인정보 보호 감시 장치
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${canViewPersonalData ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-gold-200"}`}>
                {canViewPersonalData ? "비가면 정보 노출 중" : "1급 마스킹 가동 중"}
              </span>
            </span>
            <p className="text-white/70 text-xs mt-1 max-w-xl">
              일반 운영자는 익명화된 정보만 확인합니다. 대표 성명, 연락처, 주소 원본은 개인정보 관리자 권한에서만 표시됩니다.
            </p>
          </div>
        </div>
        <div className="button-row">
          {canViewPersonalData && (
            <button className="secondary" onClick={downloadAuditLogs}>
              <Download size={18} /> 감사 로그 CSV
            </button>
          )}
          <button className={canViewPersonalData ? "secondary" : "primary"} onClick={logout}>
            {canViewPersonalData ? "잠금/로그아웃" : "개인정보 관리자 로그인으로 전환"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gold-100 overflow-hidden shadow-xl" id="table-filter-tab-container">
        <div className="bg-gold-50/50 border-b border-gold-100 flex overflow-x-auto">
          <span className="py-4 px-6 font-serif font-black text-lg text-catholic-navy flex items-center gap-2 shrink-0">
            <FileText className="w-5 h-5 text-gold-600" /> 세곡동성당 신청서 일람표
          </span>
        </div>
        <div className="p-6 bg-gray-50/40 border-b border-gold-100 space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="admin-search-label md:col-span-2 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                className="admin-search-input w-full bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="성명, 연락처, 이메일, 접수번호 통합 검색"
              />
            </label>
            <select
              className="w-full px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">⚡ 모든 심사 상태</option>
              <option value="submitted">⏳ 승인 대기</option>
              <option value="confirmed">✅ 최종 승인</option>
              <option value="canceled">🚫 취소</option>
            </select>
            <select
              className="w-full px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value="all">🌐 소통 언어 전체</option>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
            <select
              className="w-full px-2 py-2 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none text-xs"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
            >
              <option value="all">🧑‍🤝‍🧑 희망순례자 성별 전체</option>
              <option value="남성">남성 선호</option>
              <option value="여성">여성 선호</option>
              <option value="상관없음">성별 무관</option>
            </select>
            <select
              className="w-full px-2 py-2 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none text-xs"
              value={filterPets}
              onChange={(e) => setFilterPets(e.target.value)}
            >
              <option value="all">🐾 반려동물 유무 전체</option>
              <option value="no">반려동물 없음</option>
              <option value="yes">반려동물 있음</option>
            </select>
            <select
              className="w-full px-2 py-2 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none text-xs"
              value={filterBed}
              onChange={(e) => setFilterBed(e.target.value)}
            >
              <option value="all">🛏️ 침대방 제공 여부 전체</option>
              <option value="yes">침대 제공</option>
              <option value="no">침대 없음</option>
            </select>
            <select
              className="w-full px-2 py-2 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none text-xs"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="applicationNo">🧾 접수번호 정렬</option>
              <option value="capacity">👥 수용 가능 인원 정렬</option>
              <option value="name">🔤 대표 성명 정렬</option>
              <option value="members">🏠 가족구성원 수 정렬</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full py-2 border-2 border-gray-100 hover:border-gold-500 bg-white rounded-xl text-xs font-bold text-gray-600 transition-all flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gold-600" /> {sortOrder === "asc" ? "🔼 오름차순" : "🔽 내림차순"}
            </button>
          </div>
          <div className="flex justify-end">
            <button className="secondary" onClick={() => load()}>
              조회
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredApplications.length === 0 ? (
            <div className="p-16 text-center text-gray-400 space-y-2">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="font-bold">해당 필터에 매칭되는 신청서가 없습니다.</p>
              <p className="text-xs">다른 검색어나 필터 값을 조절해 보세요.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm text-gray-700 min-w-[900px]">
              <thead>
                <tr className="bg-gold-50/40 border-b border-gold-100 text-gray-700 font-bold">
                  <th className="p-4">호스트 성명 (세례명)</th>
                  <th className="p-4">연락처</th>
                  <th className="p-4">거주 주소</th>
                  <th className="p-4 text-center">가능 인원</th>
                  <th className="p-4">동반언어</th>
                  <th className="p-4 text-center">침대 / 애완</th>
                  <th className="p-4 text-center">심사 상태</th>
                  <th className="p-4 text-right">상세조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplications.map((item) => (
                  <tr key={item.id} className="hover:bg-gold-50/10 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">
                      {item.representative.name}
                      <span className="text-xs text-gray-400 block font-normal">({item.representative.baptismalName || "-"})</span>
                    </td>
                    <td className="p-4 font-mono text-xs">{item.representative.phone}</td>
                    <td className="p-4 max-w-xs truncate text-xs">{item.representative.address}</td>
                    <td className="p-4 text-center font-bold text-gold-700 font-mono">
                      {item.homestay.capacity}명<span className="text-[10px] text-gray-400 block font-normal">({item.homestay.preferredGender})</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.homestay.languages.map((language) => (
                          <span
                            key={language}
                            className="bg-gold-50 text-[10px] text-gold-800 font-medium px-1.5 py-0.5 rounded border border-gold-200/50"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center text-xs">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.homestay.hasBed ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.homestay.hasBed ? "🛏️ 침대방" : "온돌"}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] block font-bold ${
                            item.homestay.hasPet ? "bg-rose-50 text-catholic-red" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.homestay.hasPet ? "🐾 반려동물" : "애완무"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item, e.target.value)}
                        className={`status-control status-control-${statusTone(item.status)}`}
                      >
                        <option value="submitted">⏳ 대기</option>
                        <option value="confirmed">✅ 승인</option>
                        <option value="canceled">🚫 취소</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelected(item)}
                        className="bg-gold-100 hover:bg-gold-200 text-gold-800 font-bold text-xs py-1.5 px-3 rounded-lg transition-all"
                      >
                        상세조회
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gold-200 overflow-hidden shadow-xl" id="match-assistant-card">
        <div className="bg-gradient-to-r from-catholic-navy to-catholic-navy/90 p-6 text-white flex items-center justify-between border-b border-gold-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-gold-500/15 p-2 rounded-xl text-gold-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-black text-xl">실시간 순례객 매칭 도우미 (Algorithmic Match Assistant)</h3>
              <p className="text-gold-100/70 text-xs mt-0.5">
                국가별 외국 청년 순례자의 성별, 소통 언어, 침대 요구 사항을 입력해 최적의 호스트 가정을 다차원 지수로 실시간 정렬합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gold-50/10 border-b border-gold-100 grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <label className="space-y-1.5">
            <span className="font-bold text-gray-700">인원</span>
            <input
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gold-500 text-xs"
              type="number"
              min="1"
              value={match.capacity}
              onChange={(e) => setMatch({ ...match, capacity: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-bold text-gray-700">성별</span>
            <select
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gold-500 text-xs"
              value={match.gender}
              onChange={(e) => setMatch({ ...match, gender: e.target.value })}
            >
              <option value="">무관</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-bold text-gray-700">언어</span>
            <select
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gold-500 text-xs"
              value={match.language}
              onChange={(e) => setMatch({ ...match, language: e.target.value })}
            >
              <option value="">언어 무관</option>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={match.bedNeeded ? "match-check-card active" : "match-check-card"}
            aria-pressed={match.bedNeeded}
            onClick={() => setMatch({ ...match, bedNeeded: !match.bedNeeded })}
          >
            <i aria-hidden="true">{match.bedNeeded && <CheckCircle2 size={14} />}</i>
            <span>
              <strong>침실 제공 우대</strong>
              <small>수면 침대 가정이 필수 조건인 경우</small>
            </span>
          </button>
          <button
            type="button"
            className={match.petAllergy ? "match-check-card active" : "match-check-card"}
            aria-pressed={match.petAllergy}
            onClick={() => setMatch({ ...match, petAllergy: !match.petAllergy })}
          >
            <i aria-hidden="true">{match.petAllergy && <CheckCircle2 size={14} />}</i>
            <span>
              <strong>애완동물 회피</strong>
              <small>알레르기 등의 이유로 애완동물 금지</small>
            </span>
          </button>
          <div className="md:col-span-5 flex justify-end">
            <button className="primary" onClick={runMatch}>
              후보 찾기
            </button>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <span className="font-serif font-bold text-gray-800 text-sm block">추천 최적 가정 정렬 리스트</span>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {candidates.length === 0 ? (
              <p className="text-sm text-gray-400">조건을 입력한 뒤 후보 찾기를 눌러 주세요.</p>
            ) : (
              candidates.map((candidate, index) => (
                <div
                  key={candidate.application.id}
                  className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl flex items-center justify-between gap-4 text-sm hover:border-gold-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-gold-100 border border-gold-300 text-gold-800 font-bold rounded-lg w-8 h-8 flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {candidate.application.representative.name}{" "}
                        <span className="text-gray-400 font-normal">({candidate.application.applicationNo})</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">{candidate.reasons.join(" / ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-serif font-black text-emerald-700 whitespace-nowrap">{candidate.score}% Match</span>
                    <small className="block text-[11px] text-gold-700 font-bold mt-1">상세 및 매칭 배정</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-catholic-navy/70 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-3xl max-w-4xl w-full border border-gold-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-catholic-navy text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className={`status-badge status-badge-${statusTone(selected.status)}`}>{statusLabel(selected.status)}</span>
                <h3 className="font-serif font-black text-2xl">{selected.representative.name} 신청 상세</h3>
                <p className="text-white/60 text-xs mt-1">{selected.applicationNo}</p>
              </div>
              <button className="ghost text-white" onClick={() => setSelected(null)}>
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Metric icon={<Users />} label="가족 구성" value={`${selected.members.length}명`} />
                <Metric icon={<Home />} label="수용 인원" value={`${selected.homestay.capacity}명`} />
                <Metric icon={<BedDouble />} label="침대" value={selected.homestay.hasBed ? "제공 가능" : "제공 어려움"} />
              </div>
              <div className="flex flex-wrap gap-2">
                {["submitted", "confirmed", "canceled"].map((next) => (
                  <button
                    key={next}
                    className={`status-action status-action-${statusTone(next)}`}
                    onClick={() => updateStatus(selected, next)}
                  >
                    {statusLabel(next)}
                  </button>
                ))}
              </div>
              {canViewPersonalData ? (
                <ApplicationForm
                  initial={selected}
                  submitLabel="운영자 수정 저장"
                  mode="full"
                  onSubmit={async (payload) => {
                    if (!selected.id) return;
                    const response = await api<{ application: ApplicationPayload }>(`/api/admin/applications/${selected.id}`, {
                      method: "PUT",
                      body: JSON.stringify(payload)
                    }, token);
                    setSelected(response.application);
                    await load();
                  }}
                />
              ) : (
                <AdminMaskedDetail application={selected} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

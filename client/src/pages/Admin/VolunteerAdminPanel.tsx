import React, { useState, useEffect } from "react";
import { Heart, ClipboardList, Languages, ShieldCheck, Search, AlertCircle, XCircle, User, Sparkles, Download, MapPinned } from "lucide-react";
import { BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { VolunteerPayload } from "../../types.js";
import { api } from "../../api.js";
import { calculateAge } from "../../utils/age.js";
import { volunteerFields, chartColors, splitVolunteerLanguages } from "../../utils/constants.js";
import { Metric } from "../../components/Metric.js";

type VolunteerAdminPanelProps = {
  token: string;
  canViewPersonalData: boolean;
  statusLabel: (value?: string) => string;
  statusTone: (value?: string) => string;
};

type VolunteerDashboardTab = "summary" | "district";
type DistributionDatum = {
  name: string;
  count: number;
  percent: number;
};

const percentOf = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);
const districtOptionLabel = (no?: string) => (!no || no === "99" ? "구역외 (99구역)" : `${no}구역`);
const districtSort = (a: string, b: string) => Number(a) - Number(b);

export function VolunteerAdminPanel({ token, canViewPersonalData, statusLabel, statusTone }: VolunteerAdminPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [dashboardTab, setDashboardTab] = useState<VolunteerDashboardTab>("summary");
  const [data, setData] = useState<{ stats: any; volunteers: VolunteerPayload[] } | null>(null);
  const [selected, setSelected] = useState<VolunteerPayload | null>(null);

  const load = async () => {
    const params = new URLSearchParams({ q: query, status });
    const response = await api<{ stats: any; volunteers: VolunteerPayload[] }>(`/api/admin/volunteers?${params}`, {}, token);
    setData(response);
  };

  useEffect(() => {
    load().catch(() => setData({ stats: {}, volunteers: [] }));
  }, [status]);

  const rawVolunteers = data?.volunteers ?? [];
  const availableLanguages = Array.from(
    new Set(
      rawVolunteers.flatMap((v) => splitVolunteerLanguages(v.supportLanguage))
    )
  ).filter(Boolean).sort();

  const volunteers = rawVolunteers.filter((v) => {
    if (fieldFilter !== "all" && !v.supportFields.includes(fieldFilter)) return false;
    if (availabilityFilter !== "all" && v.availability !== availabilityFilter) return false;
    if (languageFilter !== "all") {
      const langs = splitVolunteerLanguages(v.supportLanguage);
      if (!langs.includes(languageFilter)) return false;
    }
    return true;
  });

  const volunteerLanguageCounts = volunteers.reduce<Record<string, number>>((acc, volunteer) => {
    splitVolunteerLanguages(volunteer.supportLanguage).forEach((language) => {
      acc[language] = (acc[language] ?? 0) + 1;
    });
    return acc;
  }, {});
  const volunteerLanguageData = Object.entries(volunteerLanguageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  
  const volunteerFieldCounts = volunteerFields.map((name) => ({
    name,
    value: volunteers.filter((volunteer) => volunteer.supportFields.includes(name)).length
  }));
  const volunteerDistrictCounts = volunteers.reduce<Record<string, number>>((acc, volunteer) => {
    const no = volunteer.district?.no ?? "99";
    acc[no] = (acc[no] ?? 0) + 1;
    return acc;
  }, {});
  const volunteerDistrictData: DistributionDatum[] = Object.entries(volunteerDistrictCounts)
    .sort(([a], [b]) => districtSort(a, b))
    .map(([no, count]) => ({
      name: districtOptionLabel(no),
      count,
      percent: percentOf(count, volunteers.length)
    }));

  const updateStatus = async (volunteer: VolunteerPayload, nextStatus: string) => {
    if (!volunteer.id) return;
    const response = await api<{ volunteer: VolunteerPayload }>(`/api/admin/volunteers/${volunteer.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    }, token);
    setSelected((current) => (current?.id === volunteer.id ? response.volunteer : current));
    await load();
  };

  const downloadVolunteersExcel = async () => {
    const params = new URLSearchParams({
      q: query,
      status,
      field: fieldFilter,
      availability: availabilityFilter,
      language: languageFilter
    });
    const response = await fetch(`/api/admin/volunteers.xls?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return alert("자원봉사자 엑셀 파일을 내려받지 못했습니다.");
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    const plainName = disposition.match(/filename="([^"]+)"/)?.[1];
    const filename = encodedName ? decodeURIComponent(encodedName) : plainName || "wyd-volunteers.xls";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  };

  const renderDistributionList = (items: DistributionDatum[], unit: string) => (
    <div className="dashboard-breakdown">
      {items.map((item, index) => (
        <div className="dashboard-breakdown-row" key={item.name}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.percent}%</span>
          </div>
          <b>{item.count.toLocaleString()} {unit}</b>
          <div className="dashboard-breakdown-bar">
            <span style={{ width: `${item.percent}%`, background: chartColors[index % chartColors.length] }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-gold-50 p-3 rounded-xl text-gold-600">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">총 자원봉사자 신청</span>
            <strong className="font-serif font-black text-2xl text-catholic-navy">{data?.stats?.total ?? volunteers.length} 명</strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-catholic-navy/5 p-3 rounded-xl text-catholic-navy">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">승인 대기</span>
            <strong className="font-serif font-black text-2xl text-gold-600">{data?.stats?.submitted ?? 0} 명</strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">통역 지원 가능</span>
            <strong className="font-serif font-black text-2xl text-emerald-700">{data?.stats?.languageSupport ?? 0} 명</strong>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gold-100 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-xl text-catholic-red">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">의료 봉사 가능</span>
            <strong className="font-serif font-black text-2xl text-catholic-navy">{data?.stats?.medicalSupport ?? 0} 명</strong>
          </div>
        </div>
      </div>

      <section className="dashboard-tabs-card">
        <div className="dashboard-tabs-head">
          <div>
            <span className="dashboard-eyebrow">Volunteer dashboard</span>
            <h2>자원봉사자 신청 현황 분석</h2>
          </div>
          <div className="dashboard-tabs" role="tablist" aria-label="자원봉사자 대시보드 보기">
            <button className={dashboardTab === "summary" ? "active" : ""} onClick={() => setDashboardTab("summary")} type="button">
              <Languages size={16} /> 요약
            </button>
            <button className={dashboardTab === "district" ? "active" : ""} onClick={() => setDashboardTab("district")} type="button">
              <MapPinned size={16} /> 구역
            </button>
          </div>
        </div>

        {dashboardTab === "summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="dashboard-chart-panel">
              <span className="font-serif font-bold text-gray-800 text-base block">자원봉사자 소통 언어 분포</span>
              <div className="h-64 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volunteerLanguageData}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#c5a85c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dashboard-chart-panel">
              <span className="font-serif font-bold text-gray-800 text-base block">자원봉사 지원 유형 비율</span>
              <div className="h-64 text-xs flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={volunteerFieldCounts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {volunteerFieldCounts.map((entry, index) => (
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
        )}

        {dashboardTab === "district" && (
          <div className="dashboard-analysis-grid">
            <div className="dashboard-chart-panel">
              <span className="font-serif font-bold text-gray-800 text-base block">구역별 자원봉사자 비율 및 인원</span>
              <div className="h-72 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volunteerDistrictData}>
                    <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2f5f98" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="dashboard-chart-panel">
              <span className="font-serif font-bold text-gray-800 text-base block">구역별 상세 분포</span>
              {renderDistributionList(volunteerDistrictData, "명")}
            </div>
          </div>
        )}
      </section>

      <div className="bg-white rounded-3xl border border-gold-100 overflow-hidden shadow-xl">
        <div className="bg-gold-50/50 border-b border-gold-100 flex overflow-x-auto">
          <span className="py-4 px-6 font-serif font-black text-lg text-catholic-navy flex items-center gap-2 shrink-0">
            <Heart className="w-5 h-5 text-gold-600" /> 세곡동성당 자원봉사자 신청 일람표
          </span>
        </div>
        <div className="p-6 bg-gray-50/40 border-b border-gold-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
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
              <option value="all">모든 심사 상태</option>
              <option value="submitted">⏳ 승인 대기</option>
              <option value="confirmed">✅ 최종 승인</option>
              <option value="canceled">🚫 취소</option>
            </select>
            <select
              className="w-full px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
            >
              <option value="all">모든 지원 분야</option>
              {volunteerFields.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">모든 활동 가능 시간</option>
              <option value="주중 (월~금)">주중 (월~금)</option>
              <option value="주말 (토~일)">주말 (토~일)</option>
              <option value="주중 및 주말 전체">주중 및 주말 전체</option>
            </select>
            <select
              className="w-full px-3 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-gold-500 focus:outline-none"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <option value="all">모든 소통 언어</option>
              {availableLanguages.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button className="secondary" onClick={() => {
              setQuery("");
              setStatus("all");
              setFieldFilter("all");
              setAvailabilityFilter("all");
              setLanguageFilter("all");
            }}>
              필터 초기화
            </button>
            <button className="secondary" onClick={downloadVolunteersExcel}>
              <Download size={18} /> 엑셀 다운로드
            </button>
            <button className="primary" onClick={() => load()}>
              검색 조회
            </button>
          </div>
        </div>
        <div className="volunteer-admin-grid">
          {volunteers.length === 0 ? (
            <div className="p-16 text-center text-gray-400 space-y-2 md:col-span-2 xl:col-span-3">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="font-bold">등록된 자원봉사자 신청이 없습니다.</p>
            </div>
          ) : (
            volunteers.map((volunteer) => (
              <article key={volunteer.id} className="volunteer-admin-card">
                <div className="volunteer-admin-card-head">
                  <div>
                    <span>{volunteer.volunteerNo}</span>
                    <strong>
                      {volunteer.name}
                      {volunteer.baptismalName && (
                        <span className="text-[14px] font-normal text-gray-500 ml-1.5 inline-block">
                          ({volunteer.baptismalName})
                        </span>
                      )}
                    </strong>
                  </div>
                  <select
                    value={volunteer.status}
                    onChange={(e) => updateStatus(volunteer, e.target.value)}
                    className={`status-control status-control-${statusTone(volunteer.status)}`}
                  >
                    <option value="submitted">대기</option>
                    <option value="confirmed">승인</option>
                    <option value="canceled">취소</option>
                  </select>
                </div>
                <div className="volunteer-tags">
                  {volunteer.supportFields.map((field) => (
                    <span key={field}>{field}</span>
                  ))}
                </div>
                <dl>
                  <dt>연락처</dt>
                  <dd>{volunteer.phone}</dd>
                  <dt>활동 시간</dt>
                  <dd>{volunteer.availability}</dd>
                  <dt>언어</dt>
                  <dd>{volunteer.supportLanguage || "-"}</dd>
                  <dt>구역</dt>
                  <dd>{volunteer.district?.label ?? "-"}</dd>
                </dl>
                <button className="secondary" onClick={() => setSelected(volunteer)}>
                  상세조회
                </button>
              </article>
            ))
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-catholic-navy/70 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-gold-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-catholic-navy text-white px-6 py-5 flex items-center justify-between">
              <div>
                <span className={`status-badge status-badge-${statusTone(selected.status)}`}>{statusLabel(selected.status)}</span>
                <h3 className="font-serif font-black text-2xl">{selected.name} 자원봉사자 상세</h3>
                <p className="text-white/60 text-xs mt-1">{selected.volunteerNo}</p>
              </div>
              <button className="ghost text-white" onClick={() => setSelected(null)}>
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Metric icon={<User />} label="연령" value={`만 ${calculateAge(selected.birthDate) || "XX"}세`} />
                <Metric icon={<ClipboardList />} label="지원 분야" value={selected.supportFields.join(", ")} />
                <Metric icon={<Sparkles />} label="활동 시간" value={selected.availability} />
              </div>
              <div className="flex flex-wrap gap-2">
                {["submitted", "confirmed", "canceled"].map((next) => (
                  <button key={next} className={`status-action status-action-${statusTone(next)}`} onClick={() => updateStatus(selected, next)}>
                    {statusLabel(next)}
                  </button>
                ))}
              </div>
              <dl className="details">
                <dt>성명</dt>
                <dd>
                  {selected.name}
                  {selected.baptismalName && (
                    <span className="text-[14px] font-normal text-gray-500 ml-1.5 inline-block">
                      ({selected.baptismalName})
                    </span>
                  )}
                </dd>
                <dt>성별</dt>
                <dd>{selected.gender}</dd>
                <dt>생년월일</dt>
                <dd>{selected.birthDate}</dd>
                <dt>연락처</dt>
                <dd>{selected.phone}</dd>
                <dt>이메일</dt>
                <dd>{selected.email || "-"}</dd>
                <dt>주소</dt>
                <dd>
                  {selected.address} {selected.addressDetail}
                </dd>
                <dt>구역</dt>
                <dd>{selected.district?.label ?? "-"}</dd>
                <dt>지원 언어</dt>
                <dd>{selected.supportLanguage || "-"}</dd>
                <dt>봉사 경력 및 재능</dt>
                <dd>{selected.experience}</dd>
                <dt>신청일</dt>
                <dd>{selected.appliedDate}</dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

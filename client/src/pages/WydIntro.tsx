import React, { useState } from "react";
import { ChevronRight, HeartHandshake, Compass, Users, Sparkles, MapPin, Calendar, Award, ExternalLink } from "lucide-react";

type WydIntroProps = {
  onStartApply: (type: "homestay" | "volunteer") => void;
  onCheckStatus: () => void;
};

const wydSeoulLogo = "/images/logo-wyd-seoul-2027.png";

export function WydIntro({ onStartApply, onCheckStatus }: WydIntroProps) {
  const [tab, setTab] = useState<"what" | "symbol" | "schedule">("what");

  return (
    <div className="single intro-page-container">
      {/* Hero Section */}
      <section className="intro-hero-section my-12 space-y-6">
        <div className="flex justify-center mb-6">
          <img
            src={wydSeoulLogo}
            alt="WYD Seoul 2027 Official Logo"
            className="w-40 sm:w-48 object-contain"
          />
        </div>
        <span className="hero-tag px-4 py-1.5 rounded-full text-sm font-semibold tracking-wider uppercase bg-[var(--gold-100)] text-[var(--gold-600)] inline-block">
          World Youth Day Seoul 2027
        </span>
        <h1 className="hero-quote font-serif text-3xl sm:text-4xl font-extrabold text-[var(--color-catholic-navy)] leading-tight">
          “용기를 내어라, 내가 세상을 이겼다”
        </h1>
        <p className="hero-verse text-lg font-serif text-[var(--gold-600)] italic">
          (요한 복음서 16장 33절)
        </p>
        <div className="intro-official-actions">
          <a className="secondary large intro-official-link" href="https://wydseoul.org/" target="_blank" rel="noreferrer">
            공식 홈페이지 바로가기 <ExternalLink size={18} />
          </a>
        </div>
      </section>

      {/* Tabs Selector */}
      <div className="segmented-buttons intro-tabs-selector" style={{ margin: "32px 0" }}>
        <button
          type="button"
          className={tab === "what" ? "segment-option active" : "segment-option"}
          onClick={() => setTab("what")}
        >
          세계청년대회(WYD) 란?
        </button>
        <button
          type="button"
          className={tab === "symbol" ? "segment-option active" : "segment-option"}
          onClick={() => setTab("symbol")}
        >
          대회 상징 & 로고
        </button>
        <button
          type="button"
          className={tab === "schedule" ? "segment-option active" : "segment-option"}
          onClick={() => setTab("schedule")}
        >
          프로그램 & 일정
        </button>
      </div>

      {/* Tab 1: 세계청년대회란? */}
      {tab === "what" && (
        <section className="panel p-5 sm:p-8 rounded-3xl bg-white border border-[var(--control-border)] space-y-6">
          <div className="section-title flex items-center space-x-2 border-b border-[var(--control-border-soft)] pb-4">
            <Compass className="text-[var(--gold-600)]" size={24} />
            <h3 className="text-xl font-bold text-[var(--color-catholic-navy)]">세계청년대회(World Youth Day) 소개</h3>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
            <p>
              <strong>세계청년대회(World Youth Day, WYD)</strong>는 전 세계 젊은이들이 함께 모여 예수 그리스도 안에서 
              신앙의 기쁨을 선포하고 나누는 가톨릭 교회의 가장 큰 세계적 축제이자 은총의 순례입니다.
            </p>
            <p>
              1985년 유엔(UN)이 선포한 '세계 청년의 해'를 맞아 <strong>교황 성 요한 바오로 2세</strong>가 젊은이들을 초대하며 시작하였고, 
              이후 2~3년마다 대륙별로 개최되어 전 세계 젊은이들이 한자리에 모여 형제애를 누리는 문화와 친교의 장이 되었습니다.
            </p>
            <p>
              참가자들은 단순한 관광객이나 축제 방문객을 넘어서 하느님을 향해 한 걸음씩 나아가는 <strong>'순례자(Pilgrims)'</strong>로 
              설정되며 순례하는 젊은이들은 서로 다른 언어와 역사를 지녔지만 주님 안에서 한 가족임을 배웁니다.
            </p>
            <p>
              <strong>2027 서울 세계청년대회</strong>는 아시아 대륙에서 1995년 필리핀 마닐라 대회 이후 무려 32년 만에 열리는 
              기념비적인 아시아 대회의 부활입니다. 평화와 선교의 중심이자 성장의 동력이 되는 아시아 가톨릭 교회에 커다란 영적 은총이 될 것입니다.
            </p>
          </div>
        </section>
      )}

      {/* Tab 2: 대회 상징 & 로고 */}
      {tab === "symbol" && (
        <section className="panel p-5 sm:p-8 rounded-3xl bg-white border border-[var(--control-border)] space-y-8">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="section-title flex items-center space-x-2 border-b border-[var(--control-border-soft)] pb-4">
              <Award className="text-[var(--gold-600)]" size={24} />
              <h3 className="text-xl font-bold text-[var(--color-catholic-navy)]">2027 서울 WYD 로고 디자인 해설</h3>
            </div>
            <div className="logo-concept-content flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="logo-visual-container shrink-0 p-6 bg-[var(--gold-50)] rounded-2xl border border-[var(--control-border-soft)] flex items-center justify-center">
                <img
                  src={wydSeoulLogo}
                  alt="Official Logo Detail"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="logo-description-list space-y-4 text-sm leading-relaxed text-[var(--muted)]">
                <div>
                  <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">한글 '서울'과 'WYD'의 조화</strong>
                  <p>한국 전통 서예의 유려한 붓터치를 기반으로 한글 '서울'의 자모를 형상화하고, 그 자모의 흐름 안에 영어 약자인 'W', 'Y', 'D'를 유기적으로 조합하여 동서양 문화의 온전한 결합을 구현했습니다.</p>
                </div>
                <div>
                  <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">전통 삼색(적, 청, 황)의 영성</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>🔴 <strong>Cross Red (적색)</strong>: 예수 그리스도의 거룩한 희생과 헌신, 순교자들의 신앙 열정</li>
                    <li>🔵 <strong>Youth Blue (청색)</strong>: 젊은이들의 활력과 신선한 기상, 하느님의 지혜와 평화</li>
                    <li>🟡 <strong>Glorious Yellow (황색)</strong>: 어둠을 헤쳐 나가는 빛이신 그리스도의 영광과 영원한 생명</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Symbol Section */}
          <div className="space-y-4">
            <div className="section-title flex items-center space-x-2 border-b border-[var(--control-border-soft)] pb-4">
              <Sparkles className="text-[var(--gold-600)]" size={24} />
              <h3 className="text-xl font-bold text-[var(--color-catholic-navy)]">대회 공식 순례 상징물</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[var(--muted)]">
              <div className="panel p-6 rounded-2xl bg-gray-50/50 border border-[var(--control-border-soft)] space-y-2">
                <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">젊은이 십자가 (WYD Cross)</strong>
                <p className="leading-relaxed">
                  1984년 교황 요한 바오로 2세가 젊은이들에게 선물한 3.8m의 나무 십자가입니다. 
                  "그리스도 사랑의 표징으로 이를 지고 세상 구원을 선포하라"는 교황의 사명에 따라 
                  매 대회 개최국과 대륙의 교구들을 걸쳐 순례하며 평화와 화해의 은총을 나르고 있습니다.
                </p>
              </div>
              <div className="panel p-6 rounded-2xl bg-gray-50/50 border border-[var(--control-border-soft)] space-y-2">
                <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">로마 백성의 구원자 성모 성화 (Salus Populi Romani)</strong>
                <p className="leading-relaxed">
                  2003년부터 젊은이 십자가와 함께 순례하기 시작한 성화의 복제품입니다. 
                  로마 산타 마리아 마조레 대성전에 위치한 원화를 바탕으로 하며, 
                  어려운 순례길 속에서 젊은 순례자들을 지켜주고 신앙 속에서 동반하시는 성모 마리아의 자애로운 모성적 사랑을 전합니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: 주요 프로그램 & 일정 */}
      {tab === "schedule" && (
        <section className="panel p-5 sm:p-8 rounded-3xl bg-white border border-[var(--control-border)] space-y-6">
          <div className="section-title flex items-center space-x-2 border-b border-[var(--control-border-soft)] pb-4">
            <Calendar className="text-[var(--gold-600)]" size={24} />
            <h3 className="text-xl font-bold text-[var(--color-catholic-navy)]">2027 서울 WYD 주간 주요 프로그램</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4 text-center">
            <div className="panel p-5 rounded-2xl bg-[var(--gold-50)]/40 border border-[var(--gold-100)]">
              <h4 className="font-bold text-[var(--color-catholic-navy)] mb-1">교구 대회</h4>
              <p className="font-semibold text-xs text-[var(--gold-600)] mb-2">Days in Dioceses</p>
              <p className="text-sm text-[var(--ink)] font-bold">2027. 7. 28(수) ~ 8. 2(월)</p>
              <p className="text-xs text-[var(--muted)] mt-2">전국 15개 가톨릭 교구에서 본당 홈스테이 환대 및 지역 문화 교류</p>
            </div>
            <div className="panel p-5 rounded-2xl bg-[var(--gold-50)]/40 border border-[var(--gold-100)]">
              <h4 className="font-bold text-[var(--color-catholic-navy)] mb-1">본 대회</h4>
              <p className="font-semibold text-xs text-[var(--gold-600)] mb-2">Main Week in Seoul</p>
              <p className="text-sm text-[var(--ink)] font-bold">2027. 8. 3(화) ~ 8. 8(일)</p>
              <p className="text-xs text-[var(--muted)] mt-2">서울특별시 전역 및 한강공원 일대 대규모 영성 축제 및 전야 밤샘 기도</p>
            </div>
            <div className="panel p-5 rounded-2xl bg-[var(--gold-50)]/40 border border-[var(--gold-100)]">
              <h4 className="font-bold text-[var(--color-catholic-navy)] mb-1">파견 미사</h4>
              <p className="font-semibold text-xs text-[var(--gold-600)] mb-2">Missioning Mass</p>
              <p className="text-sm text-[var(--ink)] font-bold">2027. 8. 8(일) 오전</p>
              <p className="text-xs text-[var(--muted)] mt-2">교황 프란치스코 집전으로 세상을 향한 젊은 선교 순례자 축복 파견</p>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-serif font-black text-lg text-[var(--color-catholic-navy)] border-b border-gray-100 pb-2">대회 주간 핵심 순례 액티비티</h4>
            <div className="space-y-3 text-sm text-[var(--muted)] leading-relaxed">
              <p>
                🟢 <strong>개막 미사 (Opening Mass):</strong> 화요일 저녁, 서울에서 첫 발걸음을 딛는 웅장한 가톨릭 전례 행사
              </p>
              <p>
                🟢 <strong>주교단 카테체시스 (Catechesis):</strong> 수~금요일 오전, 언어권별로 주교단과 젊은이들이 신앙과 현대적 현안을 묵상하는 교리 나눔
              </p>
              <p>
                🟢 <strong>젊은이 축제 & 가톨릭 박람회 (Youth Festival & VOCATIO):</strong> 수~금요일 오후, 도시 전체가 연주회, 연극, 성사 상담 등을 진행하는 문화 광장
              </p>
              <p>
                🟢 <strong>도보 순례 & 십자가의 길 (Way of the Cross):</strong> 금요일 저녁, 고해 성사를 거친 순례자들이 주님 고난을 기억하며 침묵으로 도보 행진
              </p>
              <p>
                🟢 <strong>교황님과의 밤샘 기도 (Vigil):</strong> 토요일 저녁, 야외 대광장 제단에서 침묵 성체조배와 전 세계 청년들의 찬양 밤샘 묵상
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Homestay & Volunteer Choice Section */}
      <section className="intro-actions-section my-12 space-y-8">
        <div className="intro-actions-heading text-center space-y-2">
          <h3 className="text-2xl font-bold text-[var(--color-catholic-navy)]">세곡동 성당 공동체와 함께하는 여정</h3>
          <p className="text-[var(--muted)]">젊은 순례자들을 내 집처럼 맞이하고 기쁨을 채워나갈 주인공을 기다립니다.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel action-card-item p-5 sm:p-8 rounded-3xl bg-white border border-[var(--control-border)] flex flex-col justify-between space-y-6 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-[var(--gold-600)]">
                <Users size={32} />
                <h4 className="text-xl font-bold text-[var(--color-catholic-navy)]">홈스테이 호스트 가정 신청</h4>
              </div>
              <p className="text-[15px] leading-relaxed text-[var(--muted)]">
                외국인 청년 순례자 2명 이상에게 따뜻한 잠자리와 아침 식사를 제공하는 자발적 나눔입니다. 
                우리 가정이 전 세계 청년들과 국경을 초월한 신앙의 우정을 나누는 특별한 은총의 여정입니다.
              </p>
            </div>
            <button className="primary large w-full justify-center" onClick={() => onStartApply("homestay")}>
              홈스테이 신청하기 <ChevronRight size={18} />
            </button>
          </div>
          <div className="panel action-card-item p-5 sm:p-8 rounded-3xl bg-white border border-[var(--control-border)] flex flex-col justify-between space-y-6 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-[var(--gold-600)]">
                <HeartHandshake size={32} />
                <h4 className="text-xl font-bold text-[var(--color-catholic-navy)]">자원봉사자 신청</h4>
              </div>
              <p className="text-[15px] leading-relaxed text-[var(--muted)]">
                언어/통역, 행사 진행, 시설 안내, 보건 의료 등 다양한 부서에서 자신의 재능을 기부하는 활동입니다. 
                순례자들이 축제를 즐겁고 안전하게 보낼 수 있도록 보이지 않는 곳에서 빛을 밝히는 은총의 나눔입니다.
              </p>
            </div>
            <button className="primary large w-full justify-center" onClick={() => onStartApply("volunteer")}>
              자원봉사자 신청하기 <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="intro-footer-actions text-center pt-4">
          <button className="secondary" onClick={onCheckStatus}>
            이미 접수하셨나요? 접수 내역 확인하기
          </button>
        </div>
      </section>
    </div>
  );
}

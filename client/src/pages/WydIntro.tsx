import React from "react";
import { ChevronRight, HeartHandshake, Compass, Users, Sparkles, MapPin, Calendar, Award } from "lucide-react";

type WydIntroProps = {
  onStartApply: () => void;
  onCheckStatus: () => void;
};

export function WydIntro({ onStartApply, onCheckStatus }: WydIntroProps) {
  return (
    <div className="single intro-page-container">
      {/* Hero Section */}
      <section className="intro-hero-section text-center max-w-3xl mx-auto my-12 space-y-6">
        <span className="hero-tag px-4 py-1.5 rounded-full text-sm font-semibold tracking-wider uppercase bg-[var(--gold-100)] text-[var(--gold-600)] inline-block">
          World Youth Day Seoul 2027
        </span>
        <h1 className="hero-quote font-serif text-3xl sm:text-4xl font-extrabold text-[var(--color-catholic-navy)] leading-tight">
          “용기를 내어라, 내가 세상을 이겼다”
        </h1>
        <p className="hero-verse text-lg font-serif text-[var(--gold-600)] italic">
          (요한 복음서 16장 33절)
        </p>
        <p className="hero-description text-[16px] leading-relaxed text-[var(--muted)] max-w-2xl mx-auto">
          세계청년대회(World Youth Day, WYD)는 전 세계 젊은이들이 함께 모여 신앙을 나누고 
          평화와 화해를 도모하는 전 세계 가톨릭 청년들의 최대 축제입니다. 
          2027년, 대한민국 서울에서 아시아에서는 32년 만에 개최되는 이 특별한 여정에 
          세곡동 성당 공동체는 기쁨으로 순례자들을 환영하며 동행하고자 합니다.
        </p>
      </section>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
        <div className="panel info-card-item p-6 rounded-2xl flex flex-col items-center text-center space-y-3 bg-white border border-[var(--control-border-soft)] transition hover:shadow-md">
          <div className="p-3 bg-[var(--gold-50)] rounded-xl">
            <Calendar className="text-[var(--gold-600)]" size={28} />
          </div>
          <h4 className="font-bold text-lg text-[var(--color-catholic-navy)]">대회 일정</h4>
          <p className="info-detail font-semibold text-[var(--ink)]">2027년 8월 3일(화) ~ 8월 8일(일)</p>
          <p className="info-sub text-xs text-[var(--muted)]">본대회 전 각 교구별 교구 대회가 진행됩니다.</p>
        </div>
        <div className="panel info-card-item p-6 rounded-2xl flex flex-col items-center text-center space-y-3 bg-white border border-[var(--control-border-soft)] transition hover:shadow-md">
          <div className="p-3 bg-[var(--gold-50)] rounded-xl">
            <MapPin className="text-[var(--gold-600)]" size={28} />
          </div>
          <h4 className="font-bold text-lg text-[var(--color-catholic-navy)]">대회 장소</h4>
          <p className="info-detail font-semibold text-[var(--ink)]">대한민국 서울특별시</p>
          <p className="info-sub text-xs text-[var(--muted)]">세곡동 성당 공동체 및 서울교구 일원</p>
        </div>
        <div className="panel info-card-item p-6 rounded-2xl flex flex-col items-center text-center space-y-3 bg-white border border-[var(--control-border-soft)] transition hover:shadow-md">
          <div className="p-3 bg-[var(--gold-50)] rounded-xl">
            <Compass className="text-[var(--gold-600)]" size={28} />
          </div>
          <h4 className="font-bold text-lg text-[var(--color-catholic-navy)]">대회 주제 성구</h4>
          <p className="info-detail font-semibold text-[var(--ink)]">“용기를 내어라, 내가 세상을 이겼다”</p>
          <p className="info-sub text-xs text-[var(--muted)]">예수 그리스도의 평화와 승리를 청년들과 함께 선포합니다.</p>
        </div>
      </div>

      {/* Logo & Symbol Concept Section */}
      <section className="panel logo-concept-section p-8 rounded-3xl bg-white border border-[var(--control-border)] my-10 space-y-6">
        <div className="section-title flex items-center space-x-2 border-b border-[var(--control-border-soft)] pb-4">
          <Award className="text-[var(--gold-600)]" size={24} />
          <h3 className="text-xl font-bold text-[var(--color-catholic-navy)]">공식 로고 콘셉트</h3>
        </div>
        <div className="logo-concept-content flex flex-col lg:flex-row items-center lg:items-start gap-8">
          <div className="logo-visual-container shrink-0 p-6 bg-[var(--gold-50)] rounded-2xl border border-[var(--control-border-soft)]">
            <svg viewBox="0 0 200 200" width="140" height="140" className="wyd-logo-svg">
              <circle cx="100" cy="100" r="85" fill="#fcfcfc" stroke="#e8e2d8" strokeWidth="2" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#a88c45" strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx="100" cy="90" r="45" fill="#fff9db" opacity="0.65" />
              <path d="M70,120 Q100,50 130,120" stroke="#8a1c14" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.85" />
              <path d="M100,60 Q100,100 100,140" stroke="#121e31" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.85" />
              <circle cx="100" cy="140" r="10" fill="#a88c45" />
            </svg>
          </div>
          <div className="logo-description-list space-y-5">
            <div className="desc-item space-y-1">
              <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">적색과 청색의 서예 십자가</strong>
              <p className="text-sm text-[var(--muted)] leading-relaxed">한국의 전통 서예 기법의 붓터치로 표현된 십자가는 태극의 조화와 함께 순교자들의 신앙 열정(빨강) 및 하느님의 부르심을 받은 청년들의 미래(파랑)를 상징합니다.</p>
            </div>
            <div className="desc-item space-y-1">
              <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">노란색 원 (세상의 빛)</strong>
              <p className="text-sm text-[var(--muted)] leading-relaxed">십자가 뒤의 노란색 원은 세상의 빛이신 예수 그리스도를 상징하며 동방에서 떠오르는 태양처럼 전 세계의 청년들을 비추어 하나로 모읍니다.</p>
            </div>
            <div className="desc-item space-y-1">
              <strong className="text-[var(--color-catholic-navy)] font-bold text-[16px] block">한글 '서울'과 'WYD'의 결합</strong>
              <p className="text-sm text-[var(--muted)] leading-relaxed">'서울'이라는 한글 자모 속에서 세계청년대회를 상징하는 알파벳 'W', 'Y', 'D'를 발견할 수 있도록 교차하여 동양과 서양의 유기적 조화를 표현했습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Homestay & Volunteer Choice Section */}
      <section className="intro-actions-section my-12 space-y-8">
        <div className="intro-actions-heading text-center space-y-2">
          <h3 className="text-2xl font-bold text-[var(--color-catholic-navy)]">세곡동 성당 공동체와 함께하는 여정</h3>
          <p className="text-[var(--muted)]">젊은 순례자들을 내 집처럼 맞이하고 기쁨을 채워나갈 주인공을 기다립니다.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel action-card-item p-8 rounded-3xl bg-white border border-[var(--control-border)] flex flex-col justify-between space-y-6 hover:shadow-md transition">
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
            <button className="primary large w-full justify-center" onClick={onStartApply}>
              홈스테이 신청하기 <ChevronRight size={18} />
            </button>
          </div>
          <div className="panel action-card-item p-8 rounded-3xl bg-white border border-[var(--control-border)] flex flex-col justify-between space-y-6 hover:shadow-md transition">
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
            <button className="primary large w-full justify-center" onClick={onStartApply}>
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

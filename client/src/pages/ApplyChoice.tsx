import React from "react";
import { Heart, Cross, ChevronRight } from "lucide-react";

type ApplyChoiceProps = {
  navigate: (path: string) => void;
};

export function ApplyChoice({ navigate }: ApplyChoiceProps) {
  return (
    <section className="single apply-choice-page">
      <div className="page-heading">
        <span>Application Center</span>
        <h2>
          <span className="title-line">2027 서울 WYD</span>
          <span className="title-line">세곡동 성당 신청</span>
        </h2>
        <p>참여하실 신청 유형을 선택해 주세요.</p>
      </div>
      <div className="apply-choice-grid">
        <button type="button" className="apply-choice-card host" onClick={() => navigate("/apply/homestay")}>
          <i>
            <Heart size={38} />
          </i>
          <span>Host Family</span>
          <strong>
            <em>2027 서울 WYD</em>
            <em>홈스테이 신청</em>
          </strong>
          <small>순례자를 가정으로 맞이하는 호스트 신청서</small>
          <b>
            신청하기 <ChevronRight size={18} />
          </b>
        </button>
        <button type="button" className="apply-choice-card volunteer" onClick={() => navigate("/apply/volunteer")}>
          <i>
            <Cross size={38} />
          </i>
          <span>Volunteer</span>
          <strong>
            <em>2027 서울 WYD</em>
            <em>자원봉사자 신청</em>
          </strong>
          <small>순례자 환대, 행사 운영, 외국어, 의료 등 본당 봉사 신청서</small>
          <b>
            신청하기 <ChevronRight size={18} />
          </b>
        </button>
      </div>
    </section>
  );
}

# 현재 프로젝트 상태

최종 갱신: 2026-07-04 KST

## 1. 운영 현황

| 항목 | 현재값 |
| --- | --- |
| 운영 플랫폼 | Google Cloud Run |
| GCP 프로젝트 | `mystic-planet-347807` |
| 리전 | `asia-northeast3` |
| Cloud Run 서비스 | `wyd-2027-kr-segok-mgmt` |
| 운영 URL | `https://wyd-2027-kr-segok-mgmt-yftakontba-du.a.run.app` |
| Artifact Registry | `asia-northeast3-docker.pkg.dev/mystic-planet-347807/wyh-registry` |
| 운영 DB | Cloud SQL PostgreSQL |
| Cloud SQL 인스턴스 | `mystic-planet-347807:asia-northeast3:wyh-postgres` |
| 현재 배포 커밋 | `35e955b` |
| 현재 배포 내용 | 스크롤바 폭으로 인한 좌우 밀림 방지 |
| 현재 Cloud Run revision | `wyd-2027-kr-segok-mgmt-00045-g9j` |

Cloud Run은 stateless 환경이므로 운영 DB는 PostgreSQL을 기준으로 관리합니다. SQLite는 로컬 개발 또는 단일 VM 대안으로만 취급합니다.

## 2. 최근 정리된 이슈

- GitHub Actions 동시 배포 경합으로 과거 커밋이 운영을 덮는 문제가 있었고, `gcp-cloud-run` 워크플로우에 `concurrency`를 적용했습니다.
- 모바일/데스크톱 페이지 간 좌측 여백 차이는 스크롤바 생성 여부로 인한 레이아웃 이동이었고, 전역 `scrollbar-gutter: stable` 및 `overflow-y: scroll`로 고정했습니다.
- 신규 구역반 편성표 기준으로 한양수자인은 12구역, 강남아이파크는 8구역, 구역 외는 99구역으로 분리했습니다.
- 푸터에는 세곡동성당 배너 이미지를 서버 정적 자산으로 포함했고, 클릭 시 `https://www.segokc.or.kr/`로 이동합니다.
- 브라우저 탭 제목은 `2027 WYD 세곡동 성당`으로 맞췄습니다.

## 3. 기능 상태

| 영역 | 상태 |
| --- | --- |
| 대회 소개 | 공식 홈페이지 링크 포함 |
| 신청 유형 선택 | 홈스테이, 자원봉사자 분리 및 아이콘 적용 |
| 홈스테이 신청 | 카카오 주소검색, 구역반 자동 매핑, 수동 수정, 접수 조회/수정/취소 |
| 자원봉사자 신청 | 원페이지 신청, 복수 지원 분야, 복수 언어, 자동 신청일/서명 |
| 접수 조회 | 홈스테이는 이름/연락처/PIN, 자원봉사자는 이름/연락처 기준 |
| 운영자 콘솔 | 홈스테이/자원봉사자 탭, 통합 검색, 구역/반 필터, 카드 관리 |
| 운영자 계정 | 회원가입, 비밀번호 변경, super admin 승인/권한 관리 |
| 개인정보 접근 | `admin`, `privacy_admin`, `super_admin` 역할 분리 |
| 엑셀 다운로드 | 홈스테이 및 자원봉사자 관리자 다운로드 지원 |

## 4. 보안 상태

운영 모드에서는 `DATA_ENCRYPTION_KEY`가 필수이며, 주요 개인정보 컬럼은 AES-256-GCM으로 암호화됩니다. 관리자 로그인은 개별 이메일/비밀번호를 사용하고, 원본 개인정보에 접근 가능한 `privacy_admin`, `super_admin`은 TOTP MFA를 추가로 요구합니다. 신청자 세션은 기본 5분, 관리자 세션은 기본 30분이며 유효한 관리자 API 호출 시 만료 시간이 갱신됩니다.

현재 애플리케이션 레벨 방어:

- 보안 헤더, CSP, HSTS
- CORS 허용 origin 제한
- IP 기준 rate limit
- 동시 처리 웹퍼널
- 1MB JSON body 제한
- 명백한 스캔 경로 404 처리
- 개인정보 관리자 행위 감사 로그

운영 인프라에서 별도 확인이 필요한 항목:

- Cloud Armor 또는 CDN/WAF rate-based rule
- Cloud SQL 자동 백업과 PITR 활성화 여부
- SMTP/SMS 실제 발송 채널의 일일 발송 제한
- 감사 로그 장기 보존 및 다운로드 권한 정기 점검

## 5. CI/CD 상태

`main` 브랜치 push 시 GitHub Actions가 타입 검사, 단위 테스트, Docker build/push, Cloud Run 배포를 수행합니다. 단, `docs/**`, `README.md`, `k8s/**`, `argocd/**`만 바뀐 커밋은 운영 배포를 트리거하지 않습니다.

DB 관련 파일이 바뀌면 `wyh-db-setup` Cloud Run Job을 최신 이미지로 업데이트한 뒤 실행하고, 그 후 서비스를 배포합니다.

## 6. 운영상 남은 결정

| 항목 | 권장 결정 |
| --- | --- |
| WAF/DDoS | Cloud Armor 또는 CDN WAF를 Cloud Run 앞단에 배치 |
| 백업 리허설 | 행사 전 Cloud SQL 복구 리허설 1회 수행 |
| 검색 성능 | 신청 수 5,000건 이상이면 이름/전화/이메일 정규화 해시 컬럼 추가 검토 |
| 알림 발송 | SMTP/SMS 벤더별 bounce, quota, retry 정책 문서화 |
| 개인정보 보존 | 행사 종료 후 삭제/익명화 기준을 운영자 문서로 확정 |

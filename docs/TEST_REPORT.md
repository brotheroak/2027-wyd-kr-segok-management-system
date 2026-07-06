# 테스트 리포트

최종 갱신: 2026-07-04 KST

## 1. 테스트 범위

이번 점검은 문서 현행화와 함께 현재 코드 기준의 기본 전수 테스트를 다시 수행하기 위한 기준 문서입니다.

| 분류 | 명령 또는 확인 항목 | 목적 |
| --- | --- | --- |
| 타입 검사 | `npm run typecheck` | 클라이언트/서버 TypeScript 타입 검증 |
| 단위 테스트 | `npm test` | 암호화, 비밀번호, TOTP, 입력 검증, 구역반 매핑 검증 |
| 스크립트 문법 | `node --check scripts/setup-db.mjs`, `node --check scripts/create-admin.mjs` | 운영 스크립트 문법 검증 |
| 프로덕션 빌드 | `npm run build` | 서버 컴파일 및 Vite 정적 빌드 |
| 헬스 체크 | `/api/health`, `/api/ready`, `/api/funnel/status` | 로컬 서버 상태 및 readiness 확인 |
| 운영 readiness | Cloud Run `/api/ready` | 운영 DB 연결 및 암호화 활성화 확인 |
| 구역반 API | `/api/district/assign` | 신규 구역표 기준 자동 매핑 회귀 확인 |
| 경량 부하 | `npm run stress` | rate limit/웹퍼널 전 정상 응답 확인 |

## 2. 2026-07-04 실행 결과

아래 결과는 이번 문서 현행화 후 실제 명령 실행 결과로 갱신합니다.

| 항목 | 결과 | 비고 |
| --- | --- | --- |
| 타입 검사 | 통과 | `npm run typecheck` |
| 단위 테스트 | 통과 | `npm test`, 36개 통과 |
| 운영 스크립트 문법 검사 | 통과 | `scripts/setup-db.mjs`, `scripts/create-admin.mjs` |
| 프로덕션 빌드 | 통과 | `npm run build`, Vite chunk size 경고만 있음 |
| 헬스 체크 | 통과 | `/api/health`, `/api/ready`, `/api/funnel/status` |
| 운영 readiness | 통과 | Cloud Run `db:"ready"`, `encryption:true` |
| 구역반 API 확인 | 통과 | 한양수자인은 `12구역`, 강남아이파크는 `8구역`, 미매칭 주소는 `99구역` |
| 경량 부하 테스트 | 통과 | 28,251건, 실패 0, 200 응답 28,251건, p95 5.2ms |
| 의존성 보안 감사 | 통과 | `npm audit --audit-level=moderate`, 취약점 0건 |

로컬 `/api/ready`는 개발 환경이라 `encryption:false`, `notifications.email:false`, `notifications.sms:false`로 확인되었습니다. 운영 Cloud Run에서는 `NODE_ENV=production`과 `DATA_ENCRYPTION_KEY`가 적용되어 `encryption:true`가 정상 기준입니다.

## 3. 회귀 테스트 체크리스트

- `/apply` 신청 유형 카드가 홈스테이와 자원봉사자를 명확히 분리한다.
- `/apply/homestay` 주소 입력 후 자동 구역반이 표시되고 수동 수정할 수 있다.
- 한양수자인 401~426동은 12구역으로 매핑된다.
- 강남아이파크 7단지는 8구역 8-2반으로 매핑된다.
- 편성표에 없는 주소는 99구역 구역외로 매핑된다.
- `/apply/volunteer` 지원 언어는 복수 선택 가능하고 기타 입력은 기타 선택 시에만 열린다.
- 자원봉사자 접수 조회는 PIN을 요구하지 않는다.
- `/admin` 검색은 접수번호뿐 아니라 성명, 연락처, 이메일 통합 검색을 지원한다.
- 개인정보 원본 조회, 수정, 감사 로그 다운로드는 권한 있는 관리자에게만 허용된다.

## 4. 추가 수동 검증 권장

카카오 주소검색은 외부 iframe/script에 의존하므로 자동 단위 테스트만으로 충분하지 않습니다. 운영 배포 후 실제 브라우저에서 다음을 확인합니다.

- 카카오 주소검색 팝업 또는 레이어가 열린다.
- 우편번호, 기본 주소, 상세 주소가 분리 입력된다.
- 모바일 화면에서 신청 단계 이동 시 불필요하게 최상단으로 튀지 않는다.
- 관리자 로그인 화면과 관리자 대시보드가 모바일/데스크톱에서 좌우 흰 여백 없이 표시된다.

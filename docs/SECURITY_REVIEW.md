# 보안성 검토

최종 갱신: 2026-07-21 KST

이 검토는 OWASP ASVS, Authentication Cheat Sheet, Session Management Cheat Sheet, REST Security Cheat Sheet, Denial of Service Cheat Sheet를 기준선으로 삼아 현재 구현과 운영 설정을 점검한 것입니다.

## 1. 적용된 보호 장치

| 영역 | 적용 내용 |
| --- | --- |
| 운영 암호화 | `NODE_ENV=production`에서 `DATA_ENCRYPTION_KEY`가 없으면 서버 시작 차단 |
| 개인정보 저장 | 이름, 연락처, 이메일, 주소, 서명 등 주요 PII AES-256-GCM 암호화 |
| 신청자 PIN | 신청서 ID와 조합한 SHA-256 해시로 저장 |
| 인증번호 | 이메일은 안정 해시로 조회, 코드는 이메일 해시와 조합해 해시 저장, 인증 성공 후 삭제 |
| 관리자 인증 | 개별 계정, PBKDF2-SHA512 210,000회 비밀번호 해시, 개인정보 접근 역할 TOTP MFA |
| 권한 분리 | `admin`은 마스킹 데이터, `privacy_admin`과 `super_admin`은 원본 개인정보 |
| 운영자 승인 | 최고 관리자만 운영자 승인, 역할 변경, 계정 상태 변경 가능 |
| 고정 최고 관리자 보호 | `brotheroak@gmail.com`, `livelab21@nate.com` 권한 하향 차단 |
| 감사 로그 | 관리자 로그인, 상태 변경, 개인정보 수정, CSV 다운로드, 샘플 데이터 생성 기록 |
| 보안 헤더 | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP, HSTS |
| CORS | `ALLOWED_ORIGINS` 기반 제한 |
| 요청 제한 | JSON body 1MB 제한, IP별 API rate limit |
| 웹 퍼널 | `MAX_CONCURRENT_REQUESTS`로 동시 처리 요청 제한 |
| 스캔 경로 차단 | `/.env`, `/.git`, `/wp-admin`, `/phpmyadmin` 등 명백한 탐색 경로 즉시 404 |
| 주소검색 | Kakao/Daum 우편번호 스크립트와 iframe만 CSP에 허용 |
| 순례자 민감정보 | 성명, 세례명, 이메일, 카드 토큰, 성별, 교구, 지역, 학년, 식단, 알레르기, 건강·발열 정보를 AES-256-GCM 암호화 |
| 공개 일정 | 운영자 식별자와 신청자 명단을 제외한 일정·정원 집계만 공개 |
| 카드 토큰 | 256비트 난수 토큰, SHA-256 조회 인덱스, 만료 시각, URL fragment 사용으로 접근 로그 노출 방지 |
| 호스트 권한 | 확정된 호스트 세션과 `host_application_id` 배정이 모두 일치할 때만 최소 순례자·식단 정보 반환 |
| 바코드·카메라 | 바코드는 촬영 안정성을 위해 비밀 카드 토큰만 포함하고 영상은 브라우저 안에서만 판독. `Permissions-Policy`는 동일 출처 카메라만 허용하며 HTTPS/권한 오류를 구분해 안내 |

## 2. 운영 전 필수 체크리스트

- `DATA_ENCRYPTION_KEY`를 운영 난수로 교체했습니다.
- 운영 도메인을 `ALLOWED_ORIGINS`에 등록했습니다.
- HTTPS는 CDN, 로드밸런서, reverse proxy 중 한 곳에서 강제합니다.
- 저장소 기본 관리자 계정은 없으며, 운영자별 개별 계정을 만들고 MFA 등록을 완료했습니다.
- SMTP 또는 SMS 인증번호 발송이 실제로 동작합니다.
- `/api/ready` 응답에서 `encryption:true`가 확인됩니다.
- `/admin`은 가능하면 WAF 또는 reverse proxy에서 운영자 IP 제한을 적용합니다.
- SQLite 운영 시 `/app/data` 볼륨 백업이 설정되어 있습니다.
- PostgreSQL 운영 시 자동 백업과 PITR 정책이 설정되어 있습니다.
- `ENABLE_STRESS_ENDPOINT=true`는 운영 환경에 넣지 않았습니다.

## 3. 주요 리스크와 대응

| 리스크 | 현재 상태 | 권장 대응 |
| --- | --- | --- |
| 인증번호 발송 남용 | IP별 rate limit만 적용 | 이메일/전화번호별 쿨다운과 일일 제한 추가 |
| 암호화 컬럼 검색 성능 | 서버 복호화 후 필터링 | 신청 수 증가 시 검색용 해시 컬럼 추가 |
| 운영자 계정 공격 | IP별 rate limit 적용, 개인정보 접근 역할 TOTP 적용 | 이메일별 로그인 실패 제한, 잠금/해제 절차 추가 |
| SQLite 단일 파일 장애 | 운영 Cloud Run은 Cloud SQL 사용 | SQLite는 로컬/단일 VM 대안으로만 운영 |
| DB 파일 자체 암호화 | 컬럼 암호화 적용 | 필요 시 디스크 암호화 또는 SQLCipher 검토 |
| Secret 관리 | 샘플에서는 외부 주입 전제 | Secret Manager 또는 External Secrets Operator 권장 |
| WAF/DDoS | 앱 내부 rate limit과 웹퍼널 적용 | Cloud Armor/CDN WAF rate-based rule 추가 |
| 백업 검증 | 문서상 Cloud SQL 백업 권장 | PITR 활성화와 복구 리허설 결과 기록 |

## 4. 권장 운영 설정

동시접속 100명 기준 시작값:

```text
MAX_CONCURRENT_REQUESTS=120
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
USER_SESSION_MINUTES=5
ADMIN_SESSION_MINUTES=30
TRUST_PROXY=1
```

집중 접수 이벤트에서 429가 많으면 `RATE_LIMIT_MAX`를 조금 올리고, 503이 많으면 서버 CPU/메모리/DB I/O를 먼저 확인한 뒤 `MAX_CONCURRENT_REQUESTS`를 조정합니다.

현재 Cloud Run 자동 배포 기준:

```text
min-instances=0
max-instances=3
concurrency=50
cpu=1
memory=512Mi
timeout=30s
```

이 설정은 플랫폼 레벨 최대 동시 처리량을 약 150개 요청으로 제한해 비용 폭증을 막고, 앱 내부 웹퍼널은 인스턴스별 120개 요청에서 한 번 더 방어합니다. `max-instances`는 비용 상한이지만 대규모 DDoS를 흡수하는 장치는 아니므로, Cloud Armor 또는 CDN/WAF 앞단 배치는 별도 운영 항목으로 유지합니다.

## 5. 개인정보 관리자 행위

다음 행위는 감사 로그에 남겨야 합니다.

- 관리자 로그인
- 홈스테이 신청 상태 변경
- 자원봉사자 신청 상태 변경
- 개인정보 관리자 신청서 수정
- 감사 로그 CSV 다운로드
- 샘플 데이터 생성

감사 로그 보존 기준은 [감사 로그 정책](AUDIT_LOG_POLICY.md)을 따릅니다.

## 6. OWASP 기준 매핑

| 기준 | 현재 대응 |
| --- | --- |
| 인증 | 개별 계정, 강한 해시, 개인정보 접근 역할 TOTP MFA, 세션 만료 적용 |
| 세션 | `nanoid(48)` 토큰, 신청자 기본 5분 만료, 관리자 기본 30분 만료 및 활동 중 갱신, 서버 저장 세션 |
| 접근 제어 | 역할별 API guard, 개인정보 원본 접근 분리 |
| 입력 검증 | Zod schema, JSON body 제한, 주소/구역반 서버 재검증 |
| 저장 무결성 | 접수번호 생성 트랜잭션 잠금, 신청서 optimistic locking(409), 인증번호 원자적 교체·1회 소비 |
| 오류 처리 | 알려진 스캔 경로 404, API 오류 메시지 단순화 |
| 가용성 | IP rate limit, 웹퍼널, Cloud Run max-instances 상한 |

## 7. 참고 기준

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP Denial of Service Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html

## 8. 2026-07-21 재점검 결과

| 항목 | 결과 |
| --- | --- |
| TypeScript 타입 검사 | 통과 |
| 단위 테스트 | 45개 통과 |
| 프로덕션 빌드 | 통과 |
| 로컬 readiness | 통과 |
| 의존성 감사 | `npm audit --audit-level=moderate`, 취약점 0건 |

이번 점검에서 유효한 일반 관리자 세션의 권한 부족 응답을 401에서 403으로 교정했고, 공개 일정 응답을 허용 필드 목록으로 제한했습니다. 일정 정원·시간 중복 신청, 홈스테이 생성·삭제, 순례자 번호 생성은 트랜잭션으로 묶어 partial commit을 방지합니다. 남은 보완은 Cloud Armor/CDN WAF, Cloud SQL 백업 복구 리허설, 발송 채널 quota/abuse 제한 같은 운영 인프라 항목입니다.

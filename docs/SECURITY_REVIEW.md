# 보안성 검토

## 1. 적용된 보호 장치

| 영역 | 적용 내용 |
| --- | --- |
| 운영 암호화 | `NODE_ENV=production`에서 `DATA_ENCRYPTION_KEY`가 없으면 서버 시작 차단 |
| 개인정보 저장 | 이름, 연락처, 이메일, 주소, 서명 등 주요 PII AES-256-GCM 암호화 |
| 신청자 PIN | 신청서 ID와 조합한 SHA-256 해시로 저장 |
| 인증번호 | 이메일은 안정 해시로 조회, 인증 성공 후 코드 삭제 |
| 관리자 인증 | 개별 계정, 비밀번호 PBKDF2-SHA512, TOTP MFA |
| 권한 분리 | `admin`은 마스킹 데이터, `privacy_admin`은 원본 개인정보 |
| 감사 로그 | 관리자 로그인, 상태 변경, 개인정보 수정, CSV 다운로드 기록 |
| 보안 헤더 | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP, HSTS |
| CORS | `ALLOWED_ORIGINS` 기반 제한 |
| 요청 제한 | JSON body 1MB 제한, IP별 API rate limit |
| 웹 퍼널 | `MAX_CONCURRENT_REQUESTS`로 동시 처리 요청 제한 |
| 스캔 경로 차단 | `/.env`, `/.git`, `/wp-admin`, `/phpmyadmin` 등 명백한 탐색 경로 즉시 404 |
| 주소검색 | Kakao/Daum 우편번호 스크립트와 iframe만 CSP에 허용 |

## 2. 운영 전 필수 체크리스트

- `DATA_ENCRYPTION_KEY`를 운영 난수로 교체했습니다.
- 운영 도메인을 `ALLOWED_ORIGINS`에 등록했습니다.
- HTTPS는 CDN, 로드밸런서, reverse proxy 중 한 곳에서 강제합니다.
- 기본 시딩 계정은 운영 계정 생성 후 비활성화하거나 비밀번호를 교체했습니다.
- 운영자별 개별 계정을 만들고 MFA 등록을 완료했습니다.
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
| 관리자 비밀번호 변경 UI 부재 | CLI로 계정 재생성 가능 | 운영 UI 또는 별도 관리 절차 정의 |
| 암호화 컬럼 검색 성능 | 서버 복호화 후 필터링 | 신청 수 증가 시 검색용 해시 컬럼 추가 |
| SQLite 단일 파일 장애 | 단일 VM 운영 가능 | 백업 자동화, 장애 복구 리허설 |
| DB 파일 자체 암호화 | 컬럼 암호화 적용 | 필요 시 디스크 암호화 또는 SQLCipher 검토 |
| Secret 관리 | 샘플에서는 외부 주입 전제 | Secret Manager 또는 External Secrets Operator 권장 |

## 4. 권장 운영 설정

동시접속 100명 기준 시작값:

```text
MAX_CONCURRENT_REQUESTS=120
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
USER_SESSION_MINUTES=5
ADMIN_SESSION_MINUTES=5
TRUST_PROXY=1
```

집중 접수 이벤트에서 429가 많으면 `RATE_LIMIT_MAX`를 조금 올리고, 503이 많으면 서버 CPU/메모리/DB I/O를 먼저 확인한 뒤 `MAX_CONCURRENT_REQUESTS`를 조정합니다.

Cloud Run 자동 배포 기준:

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

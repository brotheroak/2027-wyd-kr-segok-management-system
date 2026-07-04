# 2027 서울 WYD 세곡동 성당 접수 시스템

세곡동 성당의 2027 서울 WYD 홈스테이 호스트 신청, 자원봉사자 신청, 접수 확인, 운영자 관리를 위한 웹 애플리케이션입니다.

- 신청 홈: `http://127.0.0.1:4177/apply`
- 접수 확인: `http://127.0.0.1:4177/check`
- 운영자 콘솔: `http://127.0.0.1:4177/admin`
- 본당 표기 주소: 서울특별시 강남구 헌릉로618길 34 세곡동성당
- 대표 번호: 02-459-8211

## 핵심 기능

- 홈스테이 호스트 신청서 작성, 수정, 취소, 접수 확인
- 자원봉사자 신청서 작성 및 운영자 관리
- 카카오 우편번호 서비스 기반 주소 검색
- 일반 운영자와 개인정보 관리자 권한 분리
- 관리자 개별 계정 로그인 및 TOTP MFA
- 개인정보 컬럼 AES-256-GCM 암호화
- 감사 로그 CSV 다운로드 및 보존 정책
- SQLite/PostgreSQL 하이브리드 DB 지원
- Docker Compose, Kubernetes, Argo CD 배포 예시

## 빠른 시작

```bash
npm install
npm run db:setup
npm run build
npm start
```

서버 상태 확인:

```bash
curl http://127.0.0.1:4177/api/ready
curl http://127.0.0.1:4177/api/funnel/status
```

개발 모드:

```bash
npm run dev
```

## 운영 전 필수 설정

운영 환경에서는 최소한 다음 값을 지정합니다.

- `NODE_ENV=production`
- `DATA_ENCRYPTION_KEY`: 운영 시작 전 생성한 긴 난수. 운영 중 변경하면 기존 암호화 개인정보를 복호화할 수 없습니다.
- `ALLOWED_ORIGINS`: 운영 도메인
- `SMTP_*` 또는 `SMS_WEBHOOK_*`: 인증번호 발송 서비스
- `DATABASE_URL`: PostgreSQL 운영 시 필요. 미설정 시 SQLite 파일 DB 사용

운영자 계정 생성:

```bash
node scripts/create-admin.mjs operator@example.org StrongPassword123! admin
node scripts/create-admin.mjs privacy@example.org StrongPassword123! privacy_admin
```

초기 DB 생성 시 `scripts/setup-db.mjs`가 기본 개인정보 관리자 계정을 시딩할 수 있습니다. 운영 배포 직후에는 반드시 별도 계정을 만들고 임시 계정/비밀번호를 교체하거나 비활성화하십시오.

## 문서 구조

| 문서 | 목적 |
| --- | --- |
| [프로젝트 사양](docs/PROJECT_SPEC.md) | 제품 범위, 사용자 흐름, 권한, 화면, 기능 요구사항의 정본 |
| [데이터베이스](docs/DATABASE.md) | DB 모드, 테이블, 개인정보 암호화, 마이그레이션, readiness |
| [배포 가이드](docs/DEPLOYMENT.md) | 로컬, Docker Compose, Kubernetes, Cloud Run 배포 절차 |
| [운영 리소스 산정](docs/CLOUD_RESOURCE_PLAN.md) | 동시접속 100명 기준 서버/DB/WAF 비용 및 리소스 판단 |
| [보안성 검토](docs/SECURITY_REVIEW.md) | 적용 보안 장치, 운영 전 체크리스트, 남은 리스크 |
| [감사 로그 정책](docs/AUDIT_LOG_POLICY.md) | 감사 로그 다운로드 및 보존 정책 |
| [WAF/CDN 정책](docs/WAF_CDN_POLICY.md) | 국가, 봇, 비정상 트래픽 차단 기준 |
| [스트레스 테스트](docs/STRESS_TEST.md) | 부하 테스트와 웹 퍼널 검증 절차 |
| [CI/CD](docs/CICD.md) | GitHub Actions, Kustomize, Argo CD 운영 방식 |

## 품질 확인

```bash
npm run typecheck
npm test
npm run build
```

현재 기본 단위 테스트는 신청서 검증 로직을 중심으로 구성되어 있습니다. 배포 전에는 주소검색, 관리자 로그인, 개인정보 관리자 상세 조회, 감사 로그 다운로드를 브라우저에서 함께 확인하십시오.

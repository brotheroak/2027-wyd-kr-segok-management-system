# 운영 리소스 산정: 최대 동시접속 100명

## 전제

- 예상 최대 동시접속: 100명
- 주요 트래픽: 신청서 조회/작성, 관리자 조회, 정적 React 파일 제공
- 현재 운영 DB: Cloud Run 배포 시 Cloud SQL PostgreSQL 권장, 로컬/단일 서버는 SQLite 가능
- 개인정보 포함 시스템이므로 백업, 접근 제어, TLS, rate limit이 필수
- 현재 앱에는 서버 내부 웹퍼널이 있으며 운영 기본값은 `MAX_CONCURRENT_REQUESTS=120`

## 권장 결론

현재 Google Cloud Run 운영 기준에서는 “Cloud Run 0~3 인스턴스 + Cloud SQL PostgreSQL + 앱 내부 웹퍼널” 구성이 비용 통제와 운영 단순성의 균형이 가장 좋습니다.

- 추천: Cloud Run `min-instances=0`, `max-instances=3`, `concurrency=50`
- 서버: 인스턴스당 1 vCPU / 512 MiB RAM
- DB: Cloud SQL PostgreSQL, 단일 리전, 자동 백업 활성화
- TLS: Cloud Run 기본 HTTPS 또는 HTTPS Load Balancer
- 백업: Cloud SQL 자동 백업 7~14일, 필요 시 PITR
- 앱 설정:
  - `MAX_CONCURRENT_REQUESTS=120`
  - `RATE_LIMIT_WINDOW_MS=60000`
  - `RATE_LIMIT_MAX=120`
  - `USER_SESSION_MINUTES=5`
  - `ADMIN_SESSION_MINUTES=5`
  - `ALLOWED_ORIGINS=https://운영도메인`

이 값은 예상 최대 동시접속 100명에 약간의 여유를 둔 시작점입니다. 접수 개시 직후 429가 많으면 rate limit을 먼저 조정하고, 503이 늘면 Cloud SQL 연결/CPU/메모리를 확인한 뒤 `max-instances` 증설을 검토합니다.

## DB 사이즈 및 RDS 필요 여부

결론: 최대 동시접속 100명, 첨부파일 없음, 단일 서버 운영 기준이면 RDS 외부 DB는 필수가 아닙니다. SQLite로 충분합니다.

현재 로컬 샘플 데이터 기준:

| 항목 | 현재 값 |
| --- | --- |
| 홈스테이 신청 | 3건 |
| 가족 구성원 | 6건 |
| 홈스테이 조건 인덱스 | 22건 |
| 자원봉사자 신청 | 6건 |
| 감사 로그 | 29건 |
| SQLite logical size | 약 98 KB |
| SQLite WAL 포함 파일 크기 | 약 1.6 MB |

보수적 산정:

| 예상 규모 | DB 예상 크기 | 판단 |
| --- | --- | --- |
| 홈스테이 100건 + 봉사자 100건 | 3~10 MB | SQLite 충분 |
| 홈스테이 1,000건 + 봉사자 1,000건 | 20~60 MB | SQLite 충분 |
| 총 신청 10,000건 | 150~300 MB | SQLite 가능, 백업/관리 강화 필요 |
| 총 신청 50,000건 이상 | 1 GB 이상 가능 | RDS PostgreSQL 검토 |

디스크는 DB 원본보다 백업/로그/운영 여유가 더 중요합니다. DB만 보면 1~5 GB도 넉넉하지만, 서버 운영까지 고려해 60~80 GB SSD를 권장합니다.

RDS가 필요한 경우:

- 앱 서버를 2대 이상으로 수평 확장해야 한다.
- 무중단 배포, 자동 failover, Multi-AZ 수준의 가용성이 필요하다.
- 접수 시작 직후 쓰기 요청이 초당 수십 건 이상 지속된다.
- 운영자가 여러 명이고 관리자 조회/검색/다운로드가 동시에 빈번하다.
- 개인정보 DB 암호화, PITR, 감사/백업 정책을 관리형 서비스로 가져가야 한다.
- App Runner, ECS, EKS 같은 stateless/다중 인스턴스 구조를 쓰려 한다.

RDS가 아직 필요 없는 경우:

- 접수는 주로 폼 제출이고 첨부파일이 없다.
- 총 신청 건수가 수천 건 수준이다.
- 서버 1대 장애 시 백업에서 복구하는 운영이 허용된다.
- 관리자 사용자가 소수다.
- 비용과 단순성이 중요하다.

따라서 이 프로젝트의 현재 100명 동시접속 기준 권장안은 `SQLite 유지 + 단일 VM + 촘촘한 백업`입니다. 다만 “장애 시 자동 복구” 또는 “수평 확장”을 요구하면 그 시점에는 RDS PostgreSQL 전환이 선행 조건입니다.

## 구성안 A: 최소 운영형

이벤트성 접수, 단일 담당자 운영, 비용 민감도가 높은 경우.

| 항목 | 권장값 |
| --- | --- |
| Compute | Lightsail/EC2 2 vCPU, 2 GB RAM |
| Disk | SSD 60 GB 이상 |
| Process | Docker Compose 1 container |
| DB | SQLite, `/app/data` volume |
| 동시접속 제한 | 100~150 |
| 백업 | 매일 SQLite 파일 백업 |
| 장점 | 저렴하고 단순함 |
| 단점 | 서버 장애 시 수동 복구 필요 |

## 구성안 B: 권장 운영형

행사 신청 기간에 실제 사용자를 안정적으로 받는 기준.

| 항목 | 권장값 |
| --- | --- |
| Compute | Lightsail/EC2 2 vCPU, 4 GB RAM |
| Disk | SSD 80 GB 이상 |
| Process | Docker Compose + systemd restart |
| Reverse proxy | Caddy/Nginx |
| TLS | 자동 갱신 인증서 |
| DB | SQLite WAL + 매일 백업 |
| Monitoring | CPU, Memory, Disk, 5xx, `/api/ready` |
| 동시접속 제한 | 150 |
| 관리자 접근 | 개별 계정 로그인 + MFA (Google OTP), IP 제한 가능하면 적용 |
| 장점 | 현재 코드 변경 없이 안정적 |
| 단점 | SQLite 사용으로 인한 단일 복제본(Replicas: 1) 제한 (수평 확장 시 PostgreSQL 전환 필수) |

## 구성안 C: 관리형 확장 구조

운영자가 거의 손대지 않아야 하거나 무중단/다중 인스턴스가 필요한 경우.

| 항목 | 권장값 |
| --- | --- |
| Compute | ECS Fargate 또는 EKS |
| App task/pod | 0.5~1 vCPU, 1~2 GB RAM |
| Replica | 최소 1, 최대 2 |
| DB | RDS PostgreSQL |
| Load balancer | ALB |
| WAF | IP rate-based rule |
| Backup | RDS automated backup 7~14일 |
| 장점 | 장애 복구와 무중단 수평 확장에 유리 |
| 단점 | 추가적인 인프라 비용 (RDS 및 로드밸런서 사용 등) |

현재 프로젝트는 **PostgreSQL/SQLite 하이브리드 커넥션 풀 드라이버가 이미 적용되어 있어 별도의 코드 변경 없이** `DATABASE_URL` 환경 변수 지정 및 `npm run db:setup` 마이그레이션 실행만으로 즉시 무상태 관리형 서비스로 이관 및 스케일아웃 확장이 가능합니다.

## EKS 판단 및 노드 풀 격리 구성안

최대 동시접속 100명만 보면 EKS는 과할 수 있으나, 성당 전체 인프라가 이미 EKS 상에 구성되어 있거나 Argo CD 기반의 GitOps 자동 배포 체계를 탑재하고자 하는 경우 매우 훌륭한 선택이 됩니다.

EKS 상에 배포할 경우 다음과 같이 **노드 격리 배치(App, DB, Management)**를 적용하여 자원 경합 및 보안 위협을 선제 차단합니다:

1. **배포 규모 (HPA)**:
   - App Replicas: min 2, max 5 (HPA 활성화)
   - Pod Request/Limit: `cpu: 250m` / `1000m`, `memory: 512Mi` / `1Gi`
2. **격리 노드 배치 기법 (K8S_NODE_ISOLATION)**:
   - **App Node Pool (Spot 인스턴스)**: 메인 `wyd-homestay` Pod들이 올라갑니다. (`nodeSelector: { role: app }`)
   - **DB Node Pool (On-Demand / Memory 최적화)**: 디스크 I/O와 높은 IOPS 보장을 위해 격리된 데이터베이스 노드에 PostgreSQL StatefulSet을 올리고 Taint 및 Tolerations를 강제합니다. (`nodeSelector: { role: db }`, `tolerations` 적용)
   - **Management Node Pool (Argo CD 및 운영 도구)**: 고권한 배포 권한을 다루는 Argo CD 인스턴스들을 전용 관리 노드 풀에 탑재하여 웹서버 침투 시의 Blast Radius를 최소화합니다. (`nodeSelector: { role: management }`)

## App Runner 판단

AWS App Runner는 요청 동시성 기반 자동 확장 설정을 제공하지만, 파일 저장소가 영구 보장되지 않는 stateless 성격입니다. 따라서 기본 SQLite 모드로 구동할 경우 적합하지 않으며, **반드시 외부 PostgreSQL(RDS 등)을 연동한 상태에서만 App Runner를 가동해야 합니다.**

또한 AWS 문서상 App Runner 자동 확장은 `MaxConcurrency`, `MinSize`, `MaxSize`로 조절할 수 있고, `MaxConcurrency` 기본값은 100입니다. 하지만 이 앱은 개인정보/신청 데이터가 파일 DB에 저장되므로, 현재 구조 그대로는 App Runner보다 단일 VM 또는 ECS/EKS+RDS가 더 적합합니다.

## 백업/복구 기준

- SQLite DB 경로: `/app/data/wyd-homestay.sqlite`
- 매일 새벽 백업
- 행사 접수 기간에는 6시간 단위 백업 권장
- 백업 대상:
  - `wyd-homestay.sqlite`
  - `wyd-homestay.sqlite-wal`
  - `wyd-homestay.sqlite-shm`
- 최소 보관:
  - 일별 14개
  - 주별 8개
  - 행사 종료 후 암호화 보관본 1개

## 운영 모니터링 기준

| 지표 | 경고 기준 |
| --- | --- |
| CPU | 5분 평균 70% 이상 |
| Memory | 80% 이상 |
| Disk | 70% 이상 |
| 5xx | 5분간 10건 이상 |
| `/api/ready` | 2회 연속 실패 |
| Funnel refused | 접수 시간대에 지속 증가 |
| DB size | 급증 시 확인 |

## 출처

- AWS App Runner auto scaling: https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html
- AWS App Runner auto scaling API: https://docs.aws.amazon.com/apprunner/latest/api/API_CreateAutoScalingConfiguration.html
- AWS App Runner runtime/storage: https://docs.aws.amazon.com/apprunner/latest/dg/develop.html
- AWS Lightsail pricing/spec examples: https://aws.amazon.com/lightsail/pricing/
- AWS WAF rate-based rules: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
- Amazon RDS automated backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html

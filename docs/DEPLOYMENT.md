# 배포 가이드

## 1. 공통 원칙

- 운영 전 `DATA_ENCRYPTION_KEY`를 긴 난수로 설정합니다.
- 운영 중 `DATA_ENCRYPTION_KEY`를 바꾸지 않습니다.
- 외부 공개 도메인은 `ALLOWED_ORIGINS`에 등록합니다.
- 운영자 인증은 공용 PIN이 아니라 개별 계정 + TOTP MFA를 사용합니다.
- 새 DB는 앱 서버 시작 전에 `npm run db:setup`으로 초기화합니다.

## 2. 환경변수

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | 운영 필수 | 운영은 `production` |
| `PORT` | 선택 | 기본값 `4177` |
| `DATA_ENCRYPTION_KEY` | 운영 필수 | 개인정보 AES-256-GCM 암호화 키 |
| `ALLOWED_ORIGINS` | 운영 필수 | 쉼표 구분 허용 origin |
| `DATABASE_URL` | 선택 | PostgreSQL 연결 문자열. 없으면 SQLite |
| `DATABASE_SSL` | 선택 | PostgreSQL SSL 강제 |
| `DATA_DIR` | SQLite 시 선택 | SQLite 파일 저장 경로 |
| `MAX_CONCURRENT_REQUESTS` | 선택 | 내부 동시 처리 제한 |
| `RATE_LIMIT_WINDOW_MS` | 선택 | rate limit 시간창 |
| `RATE_LIMIT_MAX` | 선택 | IP별 API 요청 제한 |
| `TRUST_PROXY` | 프록시 사용 시 | Express trust proxy |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | 메일 발송 시 | 인증번호 이메일 발송 |
| `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_TOKEN` | SMS 발송 시 | 인증번호 SMS 웹훅 |

## 3. 로컬 프로덕션 실행

```bash
npm install
npm run db:setup
npm run build
npm start
```

상태 확인:

```bash
curl http://127.0.0.1:4177/api/ready
curl http://127.0.0.1:4177/api/funnel/status
```

## 4. Docker Compose

1. 환경파일을 준비합니다.

```bash
copy .env.example .env
```

2. `.env`에서 다음 값을 운영값으로 바꿉니다.

- `DATA_ENCRYPTION_KEY`
- `ALLOWED_ORIGINS`
- SMTP 또는 SMS 설정

3. 새 DB라면 먼저 setup을 실행합니다.

```bash
docker compose run --rm wyd-homestay npm run db:setup
```

4. 서비스를 시작합니다.

```bash
docker compose up --build -d
```

5. 상태를 확인합니다.

```bash
docker compose ps
curl http://127.0.0.1:4177/api/ready
```

SQLite 데이터는 Docker volume `wyd-data`의 `/app/data`에 저장됩니다.

## 5. Kubernetes / EKS

`k8s/wyd-homestay.yaml`에는 Secret 값을 직접 포함하지 않습니다. 운영 Secret은 클러스터에 별도 생성합니다.

```bash
kubectl create namespace wyd-homestay || true

kubectl create secret generic wyd-homestay-secrets \
  --namespace wyd-homestay \
  --from-literal=DATABASE_URL="postgres://user:password@hostname:5432/dbname" \
  --from-literal=DATA_ENCRYPTION_KEY="replace-with-real-random-secret" \
  --from-literal=SMTP_HOST="smtp.example.org" \
  --from-literal=SMTP_PORT="587" \
  --from-literal=SMTP_SECURE="false" \
  --from-literal=SMTP_USER="wyd@example.org" \
  --from-literal=SMTP_PASS="replace-with-smtp-password" \
  --from-literal=SMTP_FROM="wyd@example.org" \
  --from-literal=SMS_WEBHOOK_URL="" \
  --from-literal=SMS_WEBHOOK_TOKEN=""
```

이미지 빌드와 push:

```bash
docker build -t ghcr.io/your-org/wyd-homestay-system:latest .
docker push ghcr.io/your-org/wyd-homestay-system:latest
```

스키마 초기화는 같은 이미지와 운영 DB 환경변수로 1회 실행합니다. CI 러너 또는 운영 PC에서 `.env.production`에 운영 `DATABASE_URL`, `DATA_ENCRYPTION_KEY` 등을 넣고 실행하는 방식을 권장합니다.

```bash
docker run --rm --env-file .env.production ghcr.io/your-org/wyd-homestay-system:latest npm run db:setup
```

배포:

```bash
kubectl apply -k k8s
kubectl -n wyd-homestay get pods
kubectl -n wyd-homestay port-forward svc/wyd-homestay 4177:80
curl http://127.0.0.1:4177/api/ready
```

SQLite로 Kubernetes를 운영할 경우 replica는 1개로 유지합니다. 다중 replica가 필요하면 `DATABASE_URL`로 PostgreSQL을 사용합니다.

## 6. GCP Cloud Run (시나리오 B: 서버리스 운영 가이드)

Cloud Run은 컨테이너가 필요시에만 뜨는 stateless 환경이므로 SQLite를 사용할 수 없으며, **반드시 Cloud SQL(PostgreSQL)을 연동**해야 합니다.

### 1) Artifact Registry 저장소 생성 및 이미지 빌드/푸시
GCP의 도커 이미지 저장소를 생성하고 이미지를 올립니다.
```bash
# 1. Artifact Registry에 Docker 저장소 생성
gcloud artifacts repositories create wyh-registry \
  --repository-format=docker \
  --location=asia-northeast3 \
  --description="2027 WYD Homestay Docker repository"

# 2. 로컬 빌드 및 푸시 (또는 GitHub Actions 활용)
gcloud builds submit --tag asia-northeast3-docker.pkg.dev/your-gcp-project/wyh-registry/wyd-homestay:latest .
```

### 2) 데이터베이스 초기화 및 시딩 (Cloud Run Jobs 사용)
일회성 작업인 `db:setup` 스크립트를 Cloud SQL의 보안 네트워크 환경 내부에서 실행하기 위해 **Cloud Run Jobs**를 활용합니다.

```bash
# 1. DB 초기화용 일회성 Job 생성
gcloud run jobs create wyh-db-setup \
  --image asia-northeast3-docker.pkg.dev/your-gcp-project/wyh-registry/wyd-homestay:latest \
  --region asia-northeast3 \
  --command "npm","run","db:setup" \
  --set-env-vars NODE_ENV=production,DATA_ENCRYPTION_KEY="replace-with-real-random-secret",DATABASE_URL="postgres://wyd_user:비밀번호@localhost:5432/wyh_2027_kr" \
  --add-cloudsql-instances your-gcp-project:asia-northeast3:your-cloudsql-instance \
  --set-env-vars DATABASE_URL="postgres://wyd_user:비밀번호@/cloudsql/your-gcp-project:asia-northeast3:your-cloudsql-instance/wyh_2027_kr"

# 2. Job 실행 (마이그레이션 및 brotheroak 계정 자동 주입 완료)
gcloud run jobs execute wyh-db-setup --region asia-northeast3
```

### 3) API 웹 서버 배포 (Cloud Run Service)
사용자가 도메인으로 유입되는 실시간 웹앱 서비스를 가동합니다.

```bash
gcloud run deploy wyd-homestay \
  --image asia-northeast3-docker.pkg.dev/your-gcp-project/wyh-registry/wyd-homestay:latest \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --add-cloudsql-instances your-gcp-project:asia-northeast3:your-cloudsql-instance \
  --set-env-vars NODE_ENV=production,DATA_ENCRYPTION_KEY="replace-with-real-random-secret",ALLOWED_ORIGINS="https://wyd-homestay.your-parish.org" \
  --set-env-vars DATABASE_URL="postgres://wyd_user:비밀번호@/cloudsql/your-gcp-project:asia-northeast3:your-cloudsql-instance/wyh_2027_kr"
```

## 7. 운영자 계정 생성

```bash
node scripts/create-admin.mjs operator@segok.parish StrongPassword123! admin
node scripts/create-admin.mjs privacy-chief@segok.parish StrongPassword123! privacy_admin
```

역할:

- `admin`: 마스킹된 신청 데이터와 통계 확인
- `privacy_admin`: 원본 개인정보 확인, 수정, 감사 로그 다운로드

초기 로그인 시 안내되는 MFA Secret을 Google Authenticator 등 TOTP 앱에 등록합니다.

## 8. 배포 후 확인 목록

- `/api/ready`가 `200 OK`인지 확인
- `encryption:true`인지 확인
- 인증번호 메일/SMS 실제 발송 확인
- `/apply`, `/apply/homestay`, `/apply/volunteer`, `/check`, `/admin` 브라우저 확인
- 개인정보 관리자 계정으로 감사 로그 CSV 다운로드 확인
- WAF/CDN 적용 시 카카오 주소검색 iframe/script가 차단되지 않는지 확인

# CI/CD 운영 가이드

이 문서에서는 본 프로젝트의 지속적 통합(CI) 및 지속적 배포(CD) 파이프라인의 설계와 운영 방법을 설명합니다.

현재 활성 운영 배포는 **GitHub Actions -> Artifact Registry -> Google Cloud Run**입니다. Kubernetes/Argo CD 파이프라인은 수동 실행 또는 향후 EKS/GKE 전환을 위한 대안 경로입니다.

## 0. 현재 활성 Cloud Run 배포

| 항목 | 값 |
| --- | --- |
| Workflow | `.github/workflows/gcp-cloud-run.yml` |
| Trigger | `main` 브랜치 push |
| 제외 경로 | `docs/**`, `README.md`, `k8s/**`, `argocd/**`, `.gitignore` |
| Artifact Registry | `asia-northeast3-docker.pkg.dev/${GCP_PROJECT_ID}/${GCP_ARTIFACT_REPOSITORY}` |
| Cloud Run service | `wyd-2027-kr-segok-mgmt` |
| Region | `asia-northeast3` |
| Deploy guard | 동일 브랜치 동시 실행 시 이전 run 취소 |

동시 배포 경합으로 예전 커밋이 운영 revision을 덮는 사고를 방지하기 위해 다음 설정을 사용합니다.

```yaml
concurrency:
  group: gcp-cloud-run-${{ github.ref }}
  cancel-in-progress: true
```

문서만 수정한 커밋은 운영 배포를 트리거하지 않습니다. 코드, DB, 패키지, 워크플로우 변경 커밋만 Cloud Run 배포 대상입니다.

---

## 1. CI/CD 시스템 아키텍처 개요

GitOps는 Git 리포지토리를 시스템 상태의 "단일 진실 공급원(Single Source of Truth)"으로 정의하는 인프라 관리 및 배포 패턴입니다.

```mermaid
graph TD
    Developer[개발자] -->|Code Push| GitRepo[Git 리포지토리 - main]
    GitRepo -->|Trigger CI| GHA[GitHub Actions]
    GHA -->|1. Test & Build| Test[유효성 테스트 & 타입 검사]
    GHA -->|2. Docker Push| GHCR[GitHub Container Registry]
    GHA -->|3. Update Image Tag| Kustomize[k8s/kustomization.yaml]
    Kustomize -->|4. Push Back| GitRepo
    
    ArgoCD[Argo CD] -->|Sync State| K8s[EKS / K8s Cluster]
    GitRepo -->|Pull Manifests| ArgoCD
```

1. **지속적 통합 (CI - GitHub Actions)**
   - 개발자가 코드 변경을 `main` 브랜치에 푸시합니다.
   - GitHub Actions가 트리거되어 린트, 타입 검사(`npm run typecheck`), 그리고 단위 테스트(`npm run test`)를 차례대로 실행합니다.
   - 테스트 완료 후 Docker 이미지를 빌드하여 **GitHub Container Registry(GHCR)**에 업로드합니다.
   - 빌드 완료된 이미지의 SHA 태그값을 `k8s/kustomization.yaml`에 반영하고 Git 리포지토리에 다시 커밋하여 버전을 갱신합니다.
2. **지속적 배포 (CD - Argo CD)**
   - Argo CD가 Git 리포지토리의 `k8s/` 경로에 정의된 인프라 스펙을 모니터링합니다.
   - Git 리포지토리에서 갱신된 새로운 이미지 태그 정보를 탐색하여, 쿠버네티스 클러스터의 현재 인프라 상태와 차이(OutOfSync)가 생기면 자동으로 배포 및 동기화(Sync)합니다.

---

## 2. CI/CD 파일 구조 및 명세

### 1) CI/CD 워크플로우 명세 ([.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml))
- `paths-ignore`: `k8s/` 또는 `docs/` 경로의 리소스를 직접 수정하여 생기는 GitOps 커밋 피드백 루프(무한 루프)를 차단합니다.
- `[skip ci]`: CI가 Git에 빌드 결과 커밋을 보낼 때 GitHub Actions 트리거를 생략하도록 커밋 메시지에 접미사를 부여합니다.
- **캐싱 지원**: Docker Buildx 캐시 및 npm 캐시를 구성하여 평균 빌드 속도를 1분 내외로 단축시킵니다.

### 2) Kustomize 선언 ([k8s/kustomization.yaml](../k8s/kustomization.yaml))
- 쿠버네티스 순수 YAML 파일을 베이스로 상속하여 이미지 버전을 동적으로 주입하기 위해 Kustomize를 사용합니다.
- `ghcr.io/your-org/wyd-homestay-system` 이미지 경로를 탐색하여 CI 단계에서 타겟 커밋 SHA 값으로 교체합니다.

### 3) Argo CD Application 명세 ([argocd/application.yaml](../argocd/application.yaml))
- `destination`: 쿠버네티스 서비스가 위치할 `wyd-homestay` 네임스페이스와 마스터 클러스터를 지정합니다.
- `syncPolicy.automated`: `prune` 및 `selfHeal`을 활성화하여 수동 변경을 무시하고 항상 Git의 선언 상태를 강제 동기화합니다.
- `CreateNamespace=true`: 타겟 네임스페이스가 존재하지 않는 경우 자동으로 생성하도록 설정합니다.

---

## 3. 비밀 데이터(Secret) 및 DB 자원 관리 가이드

> [!WARNING]
> 암호화되지 않은 중요 정보(`DATABASE_URL`, `DATA_ENCRYPTION_KEY` 등)를 Git 리포지토리에 저장하는 행위는 심각한 보안 사고를 초래할 수 있습니다. 

GitOps 아키텍처에서 Secret을 안전하게 관리하기 위해 아래 두 가지 방식 중 하나를 사용해야 합니다.

### 권장안 A: 쿠버네티스 수동 Secret 배포 (기본 방식)
Argo CD 동기화 대상인 `k8s/` 명세에 Secret 파일(`wyd-homestay-secrets`)을 포함하지 않고, 클러스터에 관리자가 명령어로 직접 Secret을 주입해 둡니다.

```bash
# EKS 또는 쿠버네티스 클러스터 터미널에 접속하여 실행
kubectl create namespace wyd-homestay || true

kubectl create secret generic wyd-homestay-secrets \
  --namespace wyd-homestay \
  --from-literal=DATABASE_URL="postgres://username:password@rds-instance:5432/dbname" \
  --from-literal=DATA_ENCRYPTION_KEY="32자리이상의임의암호화키" \
  --from-literal=SMTP_HOST="smtp.gmail.com" \
  --from-literal=SMTP_PORT="587" \
  --from-literal=SMTP_SECURE="false" \
  --from-literal=SMTP_USER="myemail@gmail.com" \
  --from-literal=SMTP_PASS="my-app-password" \
  --from-literal=SMTP_FROM="myemail@gmail.com"
```

위 명령어를 실행하면 `argocd/application.yaml`이 동기화될 때 동일한 이름의 Secret 레퍼런스를 알아서 찾아 컨테이너 환경 변수로 연동합니다.

### 권장안 B: External Secrets Operator (ESO) 및 AWS Parameter Store/GCP Secret Manager 연동
운영 인프라가 AWS 또는 GCP인 경우 클러스터 내에 ESO를 구성한 뒤 Cloud Secret Manager에서 값을 가져와 쿠버네티스 Secret으로 변환해 주는 Custom Resource(ExternalSecret)를 구성하십시오.

---

## 4. Argo CD 어플리케이션 설치 및 수동 동기화 절차

### 1) Argo CD CLI 또는 kubectl로 배포 설정 로드
준비된 `argocd/application.yaml` 파일을 쿠버네티스 관리용 PC(Argo CD 컨트롤러가 설치된 클러스터)에서 아래와 같이 적용합니다.

```bash
kubectl apply -f argocd/application.yaml
```

### 2) Argo CD 콘솔을 통한 상태 모니터링
1. Argo CD Web UI에 접속합니다.
2. `wyd-homestay`라는 이름의 어플리케이션 카드가 생성되며, 자동으로 Git 저장소를 복제(Clone)하여 `k8s/` 산하 리소스를 파싱하는 것을 확인합니다.
3. 최초 상태는 `OutOfSync` 일 수 있으며, 동기화가 활성화되면 네임스페이스 생성 -> Secret 참조 바인딩 -> PVC 마운트 -> Pod 정상 실행 흐름으로 녹색(`Synced`, `Healthy`) 체크 마크가 점등됩니다.

### 3) 실시간 동기화 Webhook 트리거 (선택사항)
Argo CD의 기본 폴링 주기(3분)를 거치지 않고 소스코드 푸시 즉시 동기화하게 하려면, GitHub Repository 설정의 Webhooks 메뉴에 아래 주소로 웹훅을 추가하십시오.

- **Payload URL**: `https://<argocd-host>/api/webhook`
- **Content type**: `application/json`
- **Secret**: Argo CD 설정에서 구성한 Webhook Secret 토큰 값
- **Events**: `Just the push event`

---

## 5. Google Cloud Run 자동 CI/CD 가이드 (현재 운영)

서버리스 서비스 환경에서는 클러스터 내부의 Argo CD 대신, **GitHub Actions 워크플로우([.github/workflows/gcp-cloud-run.yml](../.github/workflows/gcp-cloud-run.yml))**가 빌드, 푸시, DB 셋업 실행(Job) 및 서비스 배포를 직접 핸들링합니다.

### 1) GitHub Secrets 설정
GitHub 리포지토리의 **Settings ➔ Secrets and variables ➔ Actions** 메뉴에 아래의 보안 변수(Secret)들을 추가해야 합니다:

| Secret 이름 | 설명 | 설정 예시 |
| :--- | :--- | :--- |
| `GCP_PROJECT_ID` | GCP 프로젝트 ID | `segok-wyd-2027` |
| `GCP_SA_KEY` | GCP 배포용 서비스 계정의 **JSON 키 전체** | `{"type": "service_account", ...}` |
| `GCP_ARTIFACT_REPOSITORY` | Artifact Registry 도커 저장소명 | `wyh-registry` |

### 2) GCP 서비스 계정(Service Account) 최소 권한 권장 설정
배포에 사용할 GCP 서비스 계정에 아래 IAM 권한(역할)들이 적절히 부여되어 있어야 GitHub Actions 배포 스텝이 성공합니다:

- **서비스 계정 사용자 (`roles/iam.serviceAccountUser`)**: Cloud Run 서비스 가동 시 런타임 서비스 계정을 가장하기 위함
- **Artifact Registry 작성자 (`roles/artifactregistry.writer`)**: 빌드한 Docker 이미지를 레지스트리에 업로드하기 위함
- **Cloud Run 개발자 (`roles/run.developer`)**: Cloud Run Service 업데이트 및 Cloud Run Jobs를 제어하고 업데이트하기 위함
- **Cloud Run 소스 개발자 (`roles/run.sourceDeveloper`)**: 빌드 소스로부터 서비스를 재가동하기 위함
- **Cloud SQL 클라이언트 (`roles/cloudsql.client`)**: DB 마이그레이션 실행 시 Cloud SQL 인스턴스에 보안 소켓 터널링을 하기 위함

### 3) 빌드 및 배포 동작 프로세스
1. 개발자가 소스코드를 수정하여 `main` 브랜치에 `push`합니다.
2. **CI 단계**: 코드 유효성 검사, 린트 및 단위 테스트가 순서대로 성공하면 Docker 빌드가 진행됩니다.
3. **Registry Push**: 빌드된 이미지는 서울 리전(`asia-northeast3`)의 Artifact Registry에 `latest` 태그 및 `commit sha` 태그로 병렬 업로드됩니다.
4. **DB Migration (Cloud Run Job)**: 원격 데이터베이스에 이미지를 반영하기 전, 미리 생성해 둔 `wyh-db-setup` Job을 최신 커밋 이미지 태그로 업데이트하고 `execute`하여 데이터베이스 테이블 구조를 선 갱신합니다.
5. **App 런칭 (Cloud Run Service)**: 마지막으로 최신 이미지 태그를 가지고 Cloud Run Service를 배포하여 무중단 배포를 완료합니다.

### 4) 배포 후 확인

```bash
gcloud run services describe wyd-2027-kr-segok-mgmt --region asia-northeast3
curl https://wyd-2027-kr-segok-mgmt-yftakontba-du.a.run.app/api/ready
```

정상 기준:

- Cloud Run latest ready revision이 방금 push한 commit SHA 이미지다.
- Traffic 100%가 최신 revision을 바라본다.
- `/api/ready`가 `ok:true`, `db:"ready"`, `encryption:true`를 반환한다.

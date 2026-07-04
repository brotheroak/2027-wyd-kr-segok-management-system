# 스트레스 테스트

최종 갱신: 2026-07-04 KST

현재 운영 기준은 최대 동시접속 100명입니다. Cloud Run은 `max-instances=3`, `concurrency=50`으로 플랫폼 레벨 상한을 두고, 애플리케이션 내부에서는 `MAX_CONCURRENT_REQUESTS=120` 웹퍼널과 `RATE_LIMIT_MAX=120` IP rate limit을 적용합니다.

## 기본 헬스 체크 부하

```bash
npm run stress -- --url http://127.0.0.1:4177 --path /api/health --concurrency 100 --duration 20
```

## 실제 페이지 부하

```bash
npm run stress -- --url http://127.0.0.1:4177 --path /apply --concurrency 300 --duration 30
```

## 500명 퍼널 제한 검증

퍼널은 동시 처리 요청 기준입니다. 요청이 너무 빨리 끝나면 500 제한에 걸리지 않을 수 있으므로 테스트 전용 sleep 엔드포인트를 켠 상태에서 검증합니다.

PowerShell 예시:

```powershell
$env:ENABLE_STRESS_ENDPOINT="true"
$env:MAX_CONCURRENT_REQUESTS="500"
npm run build
npm start
```

다른 터미널에서 실행:

```bash
npm run stress -- --url http://127.0.0.1:4177 --path "/api/test/sleep?ms=2000" --concurrency 650 --duration 10
curl http://127.0.0.1:4177/api/funnel/status
```

정상이라면 `200` 응답과 함께 일부 `503` 응답이 발생합니다. `503`은 500개 초과 요청이 퍼널에서 차단되었다는 뜻입니다.

## 결과 해석 기준

- `Status counts`에 `429`가 많으면 IP별 rate limit이 먼저 작동한 것입니다.
- `Status counts`에 `503`이 보이면 동시접속 퍼널이 작동한 것입니다.
- `p95`가 급격히 늘어나면 DB 쓰기, CPU, 메모리, 디스크 I/O를 확인해야 합니다.
- 신청서 제출 POST 부하는 개인정보가 생성되므로 운영 DB가 아닌 별도 테스트 DB에서만 수행합니다.

## 2026-07-04 경량 재점검

문서 현행화 시점에는 로컬 서버를 대상으로 다음 경량 테스트를 수행합니다.

```bash
npm run stress -- --url http://127.0.0.1:4177 --path /api/health --concurrency 20 --duration 5
```

목표:

- `200` 응답이 대부분이어야 합니다.
- `429`, `503`, `5xx`가 없어야 합니다.
- p95가 로컬 기준 비정상적으로 튀지 않아야 합니다.

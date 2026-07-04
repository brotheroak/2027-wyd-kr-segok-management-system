# WAF/CDN 차단 정책

## 권장 구조

```text
사용자 -> CDN/ALB + WAF -> 앱 서버
```

정적 파일 캐시, TLS 종료, 국가/봇/비정상 트래픽 차단은 앱 서버보다 CDN/WAF 계층에서 처리합니다.

AWS WAFv2 예시 템플릿은 `infra/aws-waf-regional.example.yaml`에 포함되어 있습니다.

## 기본 WAF 규칙

| 우선순위 | 규칙 | 동작 |
| --- | --- | --- |
| 1 | 운영 허용 국가 allow list | 한국 및 필요한 국가만 허용 |
| 2 | 명시 차단 국가 block list | 운영상 불필요한 국가 차단 |
| 3 | AWS Managed Rules Common Rule Set | 일반 웹 공격 차단 |
| 4 | Known Bad Inputs | 알려진 악성 패턴 차단 |
| 5 | SQLi/XSS managed rules | SQL injection/XSS 차단 |
| 6 | Rate-based rule | IP별 5분 500~1,000 요청 초과 차단 |
| 7 | Admin path 제한 | `/admin`은 가능하면 사무실/운영자 IP allow list |

## Rate 기준

최대 동시접속 100명 예상 기준:

- 일반 페이지: IP별 5분 500~1,000 요청
- API: IP별 5분 300~600 요청
- 관리자 경로: IP별 5분 100~200 요청

앱 내부 rate limit은 `RATE_LIMIT_MAX=120`으로 시작하고, WAF에서는 더 넓은 외곽 차단망으로 운영합니다.

## 국가 차단 정책

WYD 특성상 해외 접속이 있을 수 있으므로 무조건 한국만 허용하지 않습니다.

권장:

- 기본 허용: KR
- 필요 시 허용: 교구/본당이 안내한 순례자 국가
- 관리자 페이지: 가능하면 KR + 운영자 IP만 허용
- 공격 발생 시 임시 block list 적용

## 봇/비정상 트래픽

- User-Agent가 비어 있거나 명백한 스캐너 패턴이면 차단합니다.
- `/wp-admin`, `/phpmyadmin`, `/.env`, `/server-status` 같은 스캔 경로는 즉시 차단합니다.
- 404가 짧은 시간 과도하게 발생하는 IP는 차단 후보로 봅니다.

## CDN 캐시

| 경로 | 캐시 |
| --- | --- |
| `/assets/*` | 장기 캐시 |
| `/images/*` | 장기 캐시 |
| `/api/*` | 캐시 금지 |
| `/admin` | 캐시 금지 |
| `/apply`, `/check` | 짧은 캐시 또는 캐시 금지 |

## 운영 점검

- WAF blocked count가 급증하면 국가/IP/URI를 확인합니다.
- 정상 사용자의 국가가 차단되지 않았는지 행사 전 테스트합니다.
- 관리자 페이지 접근 로그는 행사 기간 매일 확인합니다.

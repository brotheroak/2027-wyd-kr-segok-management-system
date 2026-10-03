# 채팅 전용 주소

목표 주소는 `https://chat.segokwyd.kr`입니다. 홈페이지의 상단·하단 메뉴에는 협업 또는 채팅 항목을 추가하지 않습니다. 같은 Cloud Run 서비스와 DB를 사용하되, 채팅 도메인의 `/`에서는 채팅 로그인과 대화 탭이 먼저 열립니다. 로그인하지 않은 사람에게 대화 내용이나 첨부 파일을 공개하지 않습니다.

## 현재 확인된 상태 (2026-10-03)

- DNS 이름 서버: Gabia.
- `chat.segokwyd.kr`과 `segokwyd.kr` 모두 `136.69.22.73`으로 연결되어 있습니다. DNS 변경은 아직 수행하지 않았습니다.
- `https://chat.segokwyd.kr`은 인증서 호스트 이름 불일치로 검증에 실패합니다. 따라서 채팅 주소 연결 완료 상태가 아닙니다.
- Cloud Run 서비스는 `wyd-2027-kr-segok-mgmt`, 배포 지역은 `asia-northeast3`입니다.

## 콘솔에서 확인한 관리 정보

- 프로젝트 이름: `2027-wyd-kr-segok-mgmt`
- 프로젝트 ID: `mystic-planet-347807`
- 대상 HTTPS 프록시: `wyd-https-proxy`
- 기존 SSL 인증서: `wyd-ssl-cert`
- 기존 활성 인증서의 도메인: `segokwyd.kr`, `sgwyd2027.kr`
- [부하분산기 관리](https://console.cloud.google.com/net-services/loadbalancing/list/loadBalancers?project=mystic-planet-347807)
- [클래식 SSL 인증서 관리](https://console.cloud.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=mystic-planet-347807)

로그인된 Google Cloud 콘솔에서 위 구성을 확인했습니다. 2026-10-03에 Google 관리형 전역 인증서 `wyd-ssl-cert-chat`을 생성했으며, 도메인은 `segokwyd.kr`, `sgwyd2027.kr`, `chat.segokwyd.kr`입니다. `wyd-https-proxy`에는 기존 활성 인증서 `wyd-ssl-cert`와 새 인증서를 함께 연결했고, 저장된 프록시의 두 인증서 목록을 확인했습니다. 기존 인증서는 제거하지 않았습니다.

- HTTPS 전달 규칙: `wyd-https-rule`, `136.69.22.73:443`.
- URL 맵: `wyd-url-map`, 모든 호스트·경로의 기본 백엔드 `wyd-backend`.
- 서버리스 NEG: `wyd-neg`, `asia-northeast3`, Cloud Run 서비스 `wyd-2027-kr-segok-mgmt`.
- 채팅 호스트도 기본 백엔드에 매칭되므로 별도 호스트 규칙은 추가하지 않았습니다.
- 새 인증서는 아직 `PROVISIONING` 상태입니다. 활성화 및 실제 HTTPS 검증은 남아 있습니다.
- 변경 후 두 기존 도메인은 인증서 검증을 켠 HTTPS 요청에서 HTTP 200을 반환했습니다.

## 운영 점검 및 남은 작업

1. `wyd-ssl-cert-chat`과 세 도메인의 `ACTIVE` 상태를 확인합니다. Google 관리형 인증서는 대상 프록시에 연결되어야 활성화됩니다. 기존 활성 인증서는 계속 유지합니다.
2. GitHub 변경안의 앱 버전을 운영에 반영합니다. 배포 작업에 채팅 Origin을 기존 허용 목록에 추가했습니다.
3. 인증서가 활성 상태가 된 뒤 HTTPS 접속, 로그인, 파일 업로드·다운로드를 확인합니다. 인증서 검증을 끄거나 브라우저 경고를 우회하지 않습니다.

인증서 생성·프록시 추가 연결은 콘솔에서 적용했습니다. 앱 기능은 draft PR에 있으며 운영 앱은 아직 해당 변경안을 배포하지 않았습니다. 인증서 활성화만으로 새 채팅 UI가 배포되는 것은 아닙니다.

인증서 공식 안내: [Google 관리형 SSL 인증서 사용](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs).

도메인 공식 안내: [Cloud Run 사용자 도메인 연결](https://docs.cloud.google.com/run/docs/mapping-custom-domains). 서울 지역에서 현재 구성에 추가할 때는 기존 HTTPS 로드밸런서 구성을 유지하는 방식을 사용합니다.

## 로컬 확인

`http://127.0.0.1:4177/chat`에서 채팅으로 바로 진입합니다. `/workspace`는 회의록을 기본 화면으로 유지합니다. 다른 도메인 사이의 브라우저 로그인 저장소는 공유되지 않으므로 채팅 도메인에서는 기존 구성원 계정으로 다시 로그인할 수 있습니다.

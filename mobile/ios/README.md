# 세곡동성당 iPhone 앱 — Mac 작업 시작

기존 성당 홈페이지와 WYD 접수 사이트를 WKWebView에서 여는 UIKit 앱입니다. 웹페이지·회원·신청 데이터는 기존 서비스에서 계속 관리합니다.

이 브랜치에는 iOS 소스, XcodeGen 프로젝트 정의, XCTest와 공유 테스트 HTML이 포함돼 있습니다. Windows에서 작성했으므로 **iOS 빌드·시뮬레이터 실행은 아직 확인하지 않았습니다.** Mac에서 아래 검사부터 진행해 주세요.

## 처음 받는 Mac

저장소에 접근 가능한 GitHub 계정과 Xcode, iPhone Simulator, XcodeGen이 필요합니다. 자동 검사 스크립트에는 Python 3도 사용합니다.

```sh
git clone --branch codex/ios-webview-handoff --single-branch \
  https://github.com/brotheroak/2027-wyd-kr-segok-management-system.git
cd 2027-wyd-kr-segok-management-system/mobile/ios
brew install xcodegen
xcodegen generate
open SegokChurch.xcodeproj
```

이미 저장소를 받은 Mac이라면 저장소 루트에서 다음 명령으로 브랜치를 받습니다. 같은 이름의 로컬 브랜치가 이미 있으면 `git switch codex/ios-webview-handoff`를 사용합니다.

```sh
git fetch origin
git switch --track origin/codex/ios-webview-handoff
cd mobile/ios
xcodegen generate
open SegokChurch.xcodeproj
```

Xcode에서 `SegokChurch` scheme과 iPhone Simulator를 선택하고 Run을 실행합니다. 생성된 `.xcodeproj`는 Git에서 제외돼 있으므로, 빌드 설정은 `project.yml`에 기록한 뒤 `xcodegen generate`로 다시 생성하세요.

## 자동 검사

```sh
# mobile/ios 폴더에서 실행. 설치된 iOS 16 이상 iPhone Simulator를 자동 선택합니다.
bash scripts/test-simulator.sh
# 특정 시뮬레이터를 선택하려면:
SIMULATOR_UDID='설치된-기기의-UDID' bash scripts/test-simulator.sh
```

전체 Xcode 대신 Command Line Tools만 선택된 상태라면 Xcode의 Settings > Locations > Command Line Tools에서 설치된 Xcode를 선택합니다. 사용 가능한 Simulator가 없으면 Xcode의 플랫폼/컴포넌트 설정에서 iOS Simulator를 설치하고 기기를 추가합니다.

검사 결과는 `TestResults/<날짜-시간>.xcresult`, 빌드 결과는 `DerivedData`에 생성됩니다. 현재 테스트는 링크 정책 3개, 로컬 WebKit 폼 1개, 운영 사이트 TLS·로딩 및 뒤로가기 2개(네트워크 필요)입니다. Mac에서 iOS 27.0·27.1 Simulator로 통과를 확인했습니다. Debug 빌드는 `-SegokStartPage apply|fixture` 실행 인자로 시작 화면을 바꿀 수 있습니다. 실제 파일 선택 창과 iPhone 실기기 동작을 모두 검증하는 테스트는 아닙니다.

## 파일 구성

| 경로 | 내용 |
| --- | --- |
| `Sources/AppDelegate.swift` | 앱 시작 |
| `Sources/BrowserViewController.swift` | WKWebView, 메뉴, 새 창, 알림·확인창, 파일 입력 기본 처리 |
| `Sources/NavigationPolicy.swift` | 앱 내부에서 열 도메인과 외부 링크 정책 |
| `Tests/` | XCTest |
| `project.yml` | XcodeGen 빌드 설정의 원본 |
| `../fixtures/compatibility.html` | 서버 전송을 차단한 가상 입력·첨부 테스트 화면 |

최소 iOS는 16.0, 현재 Bundle ID는 `kr.segokc.shell.preview`입니다. UIKit/WebKit을 사용하며 별도 Swift 패키지 의존성은 없습니다.

## 이어서 확인할 사항

1. 시뮬레이터 빌드와 XCTest를 먼저 실행하고 발견한 오류를 수정합니다.
2. 앱의 `테스트` 버튼으로 가상 입력, 파일 선택·취소·재선택, 사진/PDF 첨부, 알림창을 확인합니다. 가상 정보와 테스트 파일만 사용합니다.
3. 성당 홈 `https://www.segokc.or.kr/`와 신청 페이지 `https://sgwyd2027.kr/apply`의 표시, 키보드, 뒤로가기, 새 창을 확인합니다.
4. 별도의 테스트 계정으로 이메일·카카오 로그인, 재실행 후 로그인 유지, 로그아웃을 확인합니다. 계정 비밀번호나 인증번호를 Git에 넣지 않습니다.
5. 실제 서버의 신청·첨부 저장은 테스트 경로가 마련된 뒤 확인합니다. 현재 WYD 봉사 신청폼에는 파일 첨부 항목이 없습니다.

Android 검증에서는 오래된 Android 12 이미지가 성당 도메인의 Sectigo R46 인증서를 신뢰하지 못했고, Android 16에서는 정상 접속했습니다. iOS에서도 지원할 OS 버전별 TLS 호환성을 확인해야 합니다. 인증서 검증을 우회하는 코드는 넣지 않았습니다.

푸시 알림, 앱 아이콘·스토어 자료, 실제 계정 인증 왕복, iPhone 실기기 검사, App Store 심사는 남아 있습니다. 카메라·마이크의 실시간 웹 접근은 차단하며, 파일 입력의 시스템 사진 선택기는 별도로 유지합니다.

## iPhone 실기기 및 출시

실기기에 설치할 때 Xcode의 Signing & Capabilities에서 사용할 Apple Developer Team을 선택합니다. 기존 성당 앱의 업데이트로 출시하려면 기존 App Store Connect 앱과 Bundle ID, Apple Developer 권한을 확인한 뒤 `project.yml`을 수정해야 합니다.

서명 인증서·개인 키·프로비저닝 파일은 Git에서 제외합니다. 사용자별 Xcode 설정과 생성된 프로젝트도 공유 소스에 포함하지 않습니다.

## Mac에서 수정한 코드 올리기

```sh
git add mobile/ios mobile/fixtures
git commit -m "Fix iOS build and verify simulator behavior"
git push origin codex/ios-webview-handoff
```

마지막 명령들은 저장소 루트에서 실행합니다. 실제 수정 내용에 맞게 커밋 메시지를 작성해 주세요.

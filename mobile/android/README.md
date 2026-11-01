# 세곡동성당 Android 앱

기존 성당 홈페이지(`https://www.segokc.or.kr/`)와 WYD 접수 사이트(`https://sgwyd2027.kr/apply`)를 WebView에서 여는 Kotlin 앱입니다. iOS 앱(`../ios`)과 같은 동작을 목표로 하며, 회원·신청 데이터는 기존 서비스에서 계속 관리합니다.

| 항목 | 값 |
| --- | --- |
| applicationId | `kr.segokc.shell.preview` (iOS Bundle ID와 동일) |
| minSdk / targetSdk / compileSdk | 24 / **36** / 37 |
| 빌드 도구 | Gradle 9.8.2(wrapper), Android Gradle Plugin 9.5.0(내장 Kotlin), JDK 17 |
| 버전 | `versionName 0.1.0`, `versionCode 1` (`app/build.gradle.kts`) |

targetSdk 36은 Google Play가 2026-08-31부터 신규 앱·업데이트에 요구하는 값입니다. compileSdk 37은 최신 AndroidX가 요구해서 올렸을 뿐, 앱 동작은 targetSdk 36 기준입니다.

## 동작

- **허용 도메인(앱 안에서 열기)**: `www.segokc.or.kr`, `segokc.or.kr`, `newsegok.imweb.me`, `sgwyd2027.kr`, `www.sgwyd2027.kr`, 카카오 로그인 `kauth.kakao.com`·`accounts.kakao.com`. HTTPS 443만 허용하고 사용자 정보(`user@`)가 붙은 주소와 비슷한 도메인은 거부합니다. 규칙은 `NavigationPolicy.kt`(iOS `NavigationPolicy.swift`와 같은 테스트 케이스).
- **외부 링크**: 그 밖의 `https` 링크와 `tel:`·`mailto:`·`sms:`는 시스템(브라우저·전화·메일)으로 엽니다. `intent:`, `file:`, `javascript:` 등은 "이 링크는 앱에서 열 수 없습니다." 안내만 표시합니다. 파일 다운로드는 브라우저로 넘깁니다.
- **새 창(window.open)**: 허용 도메인에서 열린 것만 전체 화면 팝업으로 보여 주고(쿠키 공유), 팝업이 허용 도메인 밖으로 이동하면 닫고 외부로 엽니다.
- **파일 업로드**: 시스템 문서 선택기(`ACTION_GET_CONTENT`)를 사용합니다. 취소해도 다시 열 수 있습니다. 카메라·저장소 권한은 요청하지 않습니다(권한은 `INTERNET`뿐). 웹의 실시간 카메라·마이크·위치는 거부합니다.
- **뒤로가기**: 팝업 → 페이지 기록 → 앱 종료 순서. 하단 `뒤로 / 성당 홈 / WYD 신청 / 새로고침`(홈·신청·새로고침은 iOS처럼 "작성 중인 내용이 사라질 수 있습니다" 확인).
- **쿠키**: 영구 저장(`onPause`와 페이지 로드 후 `flush`), 서드파티 쿠키 허용(카카오 로그인용).
- **HTTPS만**: `usesCleartextTraffic=false`, 네트워크 보안 설정에서 평문 차단, 혼합 콘텐츠 차단, 인증서 오류는 항상 중단(우회 코드 없음).
- **폴더블·대화면**: `resizeableActivity=true`, `configChanges="screenSize|smallestScreenSize|screenLayout|orientation|density|keyboard|keyboardHidden|uiMode"`로 접고 펼 때·회전·분할 화면에서 앱이 재시작되지 않습니다. 모든 방향 허용, edge-to-edge(상태바·내비게이션·노치·키보드 인셋 처리).
- **디버그 전용**: `adb shell am start -n kr.segokc.shell.preview/kr.segokc.shell.MainActivity --es SegokStartPage apply|fixture`로 시작 화면을 바꿉니다(`fixture`는 `../fixtures/compatibility.html`, 서버 전송 없는 입력·첨부 테스트 화면). 릴리스 빌드에는 포함되지 않습니다.

## 빌드 환경 (Mac, sudo 불필요)

```sh
brew install openjdk@17
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME="$HOME/Library/Android/sdk"
# Android 명령줄 도구를 $ANDROID_HOME/cmdline-tools/latest 에 설치한 뒤:
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
echo "sdk.dir=$ANDROID_HOME" > mobile/android/local.properties   # Git 제외됨
```

Android Studio를 쓰면 `mobile/android` 폴더를 열기만 하면 됩니다.

## 빌드·테스트

```sh
cd mobile/android
./gradlew testDebugUnitTest      # JVM 단위 테스트(주소 정책)
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew lintRelease bundleRelease   # app/build/outputs/bundle/release/app-release.aab (서명 없으면 unsigned)
```

### 에뮬레이터 테스트(폴더블 AVD)

```sh
sdkmanager "emulator" "system-images;android-36.1;google_apis;arm64-v8a"
avdmanager create avd -n segok_fold -k "system-images;android-36.1;google_apis;arm64-v8a" -d "7.6in Foldable"
emulator -avd segok_fold -no-window -no-audio -gpu swiftshader_indirect &   # 화면을 보려면 -no-window 제외
adb wait-for-device
./gradlew connectedDebugAndroidTest
```

`androidTest`에는 다음이 있습니다. 운영 사이트 로딩 테스트는 네트워크가 필요하고 읽기만 합니다(로그인·제출 없음).

| 테스트 | 내용 |
| --- | --- |
| `LiveSiteTest` | 성당 홈·WYD 신청 페이지 TLS 로딩, 뒤로 버튼, 평문 통신 차단 |
| `FixtureTest` | 로컬 폼 입력, 파일 선택창 열기·취소 후 재열기·파일 선택 전달 |
| `FoldableTest` | `wm size`/`wm density`로 접기·펴기, 회전 후에도 Activity가 재생성되지 않고 입력 값이 유지되는지 |

## Google Play 출시

### 1. 계정과 비용

- Play Console 개발자 등록: **US$25, 한 번만 결제**(연회비 없음). 신원 확인이 필요합니다.
- **2023-11-13 이후 만든 개인 계정**은 앱 출시 전에 비공개(closed) 테스트에서 **테스터 12명이 14일 연속** 참여해야 프로덕션 신청이 가능합니다. 조직 계정(D-U-N-S 번호 필요)은 면제입니다.
- 기존 성당 앱의 **업데이트**로 내려면 그 앱의 개발자 계정으로 같은 `applicationId`를 올려야 합니다. 현재 `kr.segokc.shell.preview`는 미리보기 이름이므로, 정식 앱 ID는 한 번 정하면 바꿀 수 없으니 확정 후 `app/build.gradle.kts`의 `applicationId`를 수정하세요(iOS의 Bundle ID도 함께 맞추면 좋습니다).

### 2. 업로드 키 만들기 (Git에 올리지 말 것)

```sh
keytool -genkeypair -v -keystore ~/segok-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

`mobile/android/keystore.properties`를 만듭니다(`.gitignore`로 제외됨).

```properties
storeFile=/Users/<사용자>/segok-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

이 파일이 있으면 `bundleRelease`가 자동으로 서명합니다. 키 파일과 비밀번호는 백업해 두세요. Play App Signing을 쓰면 Google이 앱 서명 키를 보관하고 이 키는 "업로드 키"로만 쓰므로, 분실해도 Play Console에서 재설정할 수 있습니다.

### 3. 업로드

1. `versionCode`를 올리고(`app/build.gradle.kts`, 업로드마다 증가) `./gradlew bundleRelease`.
2. Play Console → 앱 만들기 → 설정(앱 콘텐츠: 개인정보처리방침 URL, 데이터 보안, 광고 여부, 콘텐츠 등급, 대상 연령, 타깃 API 선언) → 테스트 및 출시 → **내부 테스트**(또는 비공개 테스트)에 `app-release.aab` 업로드.
3. 스토어 등록정보: 앱 이름, 짧은·긴 설명, **512×512 아이콘**, 1024×500 피처 그래픽, 휴대전화 스크린샷(2장 이상, 가능하면 폴더블·태블릿 스크린샷도). 현재 런처 아이콘은 보라색 십자가 자리표시자이므로 성당 이미지로 교체하세요(`app/src/main/res/mipmap-*`, `drawable/ic_launcher_*`).
4. 내부 테스트로 실기기 확인 → 비공개 테스트 12명·14일(개인 계정) → 프로덕션 신청 → 심사.

### 4. 알아둘 점

- 웹뷰 래퍼 앱도 Play의 "최소 기능" 정책 대상입니다. 웹사이트 링크 모음처럼 보이지 않도록 앱 설명에 회원 로그인·WYD 신청·첨부 등 제공 기능을 적어 주세요.
- 앱은 `INTERNET` 권한만 쓰고 자체 분석·광고 SDK는 없습니다. 다만 웹사이트(아임웹, 카카오 로그인)가 개인정보를 수집하므로 데이터 보안 양식과 개인정보처리방침에 반영해야 합니다.
- 구형 Android(특히 Android 7~12 일부 기기)는 성당 도메인 인증서(Sectigo R46) 루트를 신뢰하지 못할 수 있습니다. 인증서 검증 우회는 넣지 않았으므로, 이런 기기에서는 페이지가 열리지 않고 안내가 표시됩니다.

## 이 환경에서 확인하지 않은 것

- 실제 Android 기기(삼성 갤럭시 폴드·플립 등)에서의 동작. 접힘 힌지(Flex mode) 자세와 실제 접는 순간은 확인하지 못했고, 에뮬레이터에서 화면 크기·밀도 변경과 회전으로 대신 검증했습니다.
- 카카오·이메일 로그인 왕복, 로그인 유지, 로그아웃(테스트 계정 필요). 카카오가 WebView 로그인을 허용하는지는 실기기로 확인해야 합니다.
- 실제 사진·PDF 첨부 업로드(서버 저장), 팝업 로그인 흐름, Android 7~15 이하 구형 OS.
- Play Console 업로드·심사.

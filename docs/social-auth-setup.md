# 룩부기 소셜 로그인 설정

Google과 Kakao는 각 플랫폼의 네이티브 SDK에서 ID Token을 받은 뒤 Supabase 세션으로 교환한다.
Apple 브라우저 OAuth만 `lookboogie://auth/callback`으로 돌아오도록 구성되어 있다. Expo Go에는
네이티브 SDK가 포함되지 않으므로 소셜 로그인 테스트는 개발 빌드나 APK에서 진행한다.

## 공통 Supabase 설정

1. Supabase Dashboard의 **Authentication > URL Configuration**에서 Redirect URLs에 `lookboogie://**`를 추가한다.
2. Site URL은 웹 인증 화면에 사용할 `https://about-0xseo.vercel.app/`을 유지한다.
3. Apple 브라우저 OAuth에 등록할 Supabase callback URL은 아래와 같다. Google과 Kakao 네이티브 로그인은 이 redirect를 사용하지 않는다.

```text
https://rmmoppthvnkmbcsvuywr.supabase.co/auth/v1/callback
```

제공자 client secret은 앱의 `.env`에 넣지 않고 Supabase Dashboard의 provider 설정에만 입력한다.

## Google 네이티브 로그인

Google 버튼은 웹 OAuth가 아니라 Android Credential Manager와 iOS Google Sign-In SDK에서 받은 ID Token을 Supabase 세션으로 교환한다. 각 로그인 요청은 `expo-crypto`로 원본 nonce와 SHA-256 nonce를 만들고, 해시값은 Google에, 원본값은 Supabase `signInWithIdToken`에 전달한다.

1. Google Auth Platform에서 OAuth 동의 화면을 구성한다.
2. **Web application** OAuth Client를 만들고 Client ID와 Client Secret을 Supabase Dashboard의 **Authentication > Providers > Google**에 입력한다.
3. Android OAuth Client를 만들고 패키지 이름 `com.lookboogie.app`과 EAS 빌드 인증서의 SHA-1을 등록한다.

```text
C6:1B:FC:F7:98:F7:FE:3D:03:75:37:A3:53:0F:BA:9F:08:D8:15:0D
```

위 값은 2026-08-15 preview APK에서 검증한 인증서 지문이다. Google Play App Signing을 활성화하면 Play Console의 앱 서명 인증서 SHA-1도 별도의 Android OAuth Client에 등록한다.

기존 앱을 유지한 채 USB 디버깅하는 `룩부기 Dev`는 별도의 Android OAuth Client가 필요하다.

```text
Package name: com.lookboogie.app.debug
SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

4. 로컬 `.env`와 EAS의 `preview`, `production` 환경에 Web Client ID를 추가한다.

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<Web application Client ID>
```

5. iOS를 빌드할 때는 Bundle ID `com.lookboogie.app`으로 iOS OAuth Client를 만들고 아래 값도 추가한다. 이 값이 있으면 `app.config.js`가 Google URL Scheme config plugin을 자동 적용한다.

```text
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS Client ID>
```

Google Client ID는 공개 식별자지만 Client Secret은 앱 코드나 `.env`에 넣지 않는다. Google 네이티브 로그인은 Expo Go에서 실행되지 않으므로 개발 빌드 또는 APK가 필요하다.

로컬 Android 네이티브 빌드는 Java 21을 사용한다. 현재 시스템 기본값인 Java 25에서는 Android Gradle Prefab 단계가 실패한다.

## Kakao 네이티브 로그인

Kakao 버튼은 카카오톡 앱 로그인을 우선 사용하고, 카카오톡을 사용할 수 없는 경우 카카오 계정 로그인으로 전환한다. 각 요청에서 SHA-256 nonce를 Kakao SDK에 전달하고 원본 nonce, ID Token, access token을 Supabase에서 함께 검증한다.

1. Kakao Developers에서 앱을 만들고 **제품 설정 > 카카오 로그인**을 활성화한다.
2. 같은 화면의 **OpenID Connect**를 활성화한다. 이 설정이 꺼져 있으면 네이티브 SDK가 Supabase 교환에 필요한 ID Token을 발급하지 않는다.
3. **앱 > 플랫폼 키**에서 개발용 Native App Key를 추가하거나 선택한 뒤 Android 앱 정보에 현재 테스트 앱을 등록한다.

```text
Package name: com.lookboogie.app.debug
Key hash: Xo8WBi6jzSxKDVR4drqm84yr9iU=
```

4. 배포용은 별도의 Native App Key를 추가하고 앱 정보와 EAS preview 인증서 키 해시를 등록한다. 현재 Kakao Developers는 Native App Key별로 Android 패키지를 연결하므로 `.debug`와 배포 패키지를 같은 키에 섞지 않는다.

```text
Package name: com.lookboogie.app
Key hash: xhv895j3/j0DdTejUw+6nwjYFQ0=
```

Google Play App Signing을 사용하면 Play Console의 앱 서명 인증서 SHA-1을 Base64 키 해시로 변환해 추가 등록한다.

5. 동의 항목에서 이메일을 제공하도록 설정한다. 룩부기의 프로필과 친구 검색은 이메일을 식별자로 사용하며, 카카오 이메일 동의 항목은 Biz App 전환이 필요할 수 있다.
6. 로컬 `.env`에는 개발용 Native App Key를 추가하고, EAS의 `preview`, `production` 환경에는 배포용 Native App Key를 추가한다.

```text
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=<Kakao Native App Key>
```

Native App Key는 클라이언트 식별자다. Admin Key와 REST API Client Secret은 앱 코드나 `.env`에 넣지 않는다.

로컬 Android 개발 앱은 아래 플래그로 prebuild 또는 실행한다. 이 플래그가 `룩부기 Dev`와 `com.lookboogie.app.debug`를 생성해 배포 앱의 로컬 데이터를 덮어쓰지 않게 한다.

```text
LOOKBOOGIE_DEBUG_BUILD=1 npx expo prebuild --platform android
LOOKBOOGIE_DEBUG_BUILD=1 npx expo run:android
```

7. Supabase Dashboard의 **Authentication > Providers > Kakao**를 활성화한다. Client IDs에는 REST API Key를 먼저 두고 개발용 및 배포용 Native App Key를 쉼표로 구분해 입력하며 REST API Client Secret을 유지한다.
8. Kakao Biz App 인증 없이 이메일 동의를 요청하지 않는 경우 **Allow users without an email**을 활성화한다. Supabase의 **Anonymous Sign-Ins**는 카카오 계정과 별개의 게스트 사용자를 만들기 때문에 이 용도로 사용하지 않는다. 룩부기는 카카오 닉네임을 `닉네임@kakao`로 표시하고, 친구 추가에는 사용자가 변경할 수 있는 중복 불가 룩부기 ID를 사용한다.

```text
<REST API Key>,<Development Native App Key>,<Production Native App Key>
```

네이티브 로그인만 사용할 경우에도 ID Token의 `aud` 검증을 위해 Native App Key가 Client IDs에 반드시 포함되어야 한다. 앱 키나 config plugin이 바뀌면 JavaScript 새로고침만으로 적용되지 않으므로 개발 앱을 다시 빌드한다.

## Apple

1. Apple Developer에서 App ID `com.lookboogie.app`에 **Sign in with Apple** capability를 활성화한다.
2. 웹 인증용 Services ID를 만들고 Return URL에 위 Supabase callback URL을 등록한다.
3. Sign in with Apple 키를 만든 뒤 Services ID와 생성한 secret을 Supabase Dashboard의 **Authentication > Providers > Apple**에 입력한다.
4. Apple OAuth secret은 최대 6개월 유효하므로 만료 전에 교체한다.

## 확인 순서

1. Supabase Dashboard에서 Google, Kakao, Apple provider가 모두 Enabled인지 확인한다.
2. Redirect URLs에 `lookboogie://**`가 있는지 확인한다.
3. Google은 Web Client ID와 Android SHA-1이 등록된 새 개발 빌드 또는 APK의 **마이페이지 > 클라우드**에서 테스트한다.
4. Kakao는 Native App Key, 패키지 이름, 키 해시, OpenID Connect가 등록된 새 개발 빌드의 **마이페이지 > 클라우드**에서 테스트한다.
5. 로그인 후 Supabase **Authentication > Users**와 `public.profiles`에 사용자가 생성되는지 확인한다.

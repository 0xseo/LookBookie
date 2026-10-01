<div align="center">
  <img src="./icon.png" width="128" alt="룩부기 앱 아이콘" />
  <h1>룩부기 (LookBoogie)</h1>
  <p>거북이 마스코트와 함께 옷을 기록하고 코디를 만드는 오프라인 퍼스트 옷장 앱</p>
</div>

룩부기는 옷 사진과 메타데이터를 기기에 먼저 저장해 네트워크 없이도 개인 옷장, 마이핏, 코디북을 사용할 수 있게 만든 React Native 앱입니다. 로그인한 사용자는 Supabase에 데이터를 동기화하고 친구 요청을 주고받아 서로의 옷장, 마이핏, 코디북을 볼 수 있습니다.

- 현재 앱 버전: `1.3.0` (Android versionCode `6`)
- Android 패키지: `com.lookboogie.app`
- URL scheme: `lookboogie://`

## 주요 기능

### 옷장

- 카메라 또는 갤러리에서 옷 사진 등록
- 드래그·핀치 확대가 가능한 비율 크롭과 `0~360°` 회전
- 브러시 크기 조절, 실행 취소·다시 실행·초기화를 지원하는 수동 배경 지우개
- 사진 기반 대표색 추천과 사용자 색상 팔레트
- 이름, 브랜드, 카테고리, 계절, 색상, 태그, 핏/사이즈 메타데이터
- 이름·브랜드·계절·색상·태그 통합 검색과 정렬·필터
- 한 줄 3→2→1개씩 사진 크기 전환과 화면별 설정 저장
- 옷 상세 수정, 소속 코디 바로가기와 해당 옷의 마이핏 목록 보기
- 사용자 카테고리, 색상, 핏/사이즈 옵션 추가·수정·순서 변경

### 마이핏

- 직접 옷을 입은 사진에 이름과 입은 날짜를 기록
- 사진 크롭·회전·확대 편집
- 하나의 마이핏에 여러 옷과 0~1개의 코디북 연결
- 이름·날짜·연결된 옷·코디북 이름으로 검색과 정렬·필터
- 한 줄 3→2→1개씩 사진 크기 전환과 설정 저장
- 연결된 옷·코디 확인, 교체, 해제 및 마이핏 수정·삭제
- 코디 전체 배치로 연결할 코디북을 선택하고, 상세에서도 같은 미리보기 제공
- 옷·코디 상세에서 마이핏 목록으로 이동하고 뒤로가기로 원래 화면에 복귀
- 마이핏에서 연결된 옷·코디를 열고 뒤로가기로 마이핏에 복귀
- 로컬 SQLite 저장, JSON 백업 및 Supabase 이미지·메타데이터 동기화

### 코디북

- 옷장 검색과 카테고리 필터를 통한 옷 선택
- 캔버스 오른쪽 아래 원형 + 버튼으로 옷 추가
- 캔버스에서 옷 이동·크기 조절·회전·삭제
- 레이어 아이콘 주변의 네 버튼으로 맨앞·한 칸 앞으로·한 칸 뒤로·맨뒤 조절
- 레이어 변경 후에도 조작 버튼을 유지하고 중앙 아이콘을 다시 눌러 접기
- 별도 모달에서 코디 이름·계절·태그 입력과 수정
- 공통 검색·정렬·필터와 한 줄 3→2→1개씩 사진 크기 전환
- 저장된 배치 그대로 목록 미리보기 제공
- 마이핏과 같은 디자인의 입은 옷 목록과 옷 상세 화면 연결
- 상세 진입 시 옷을 선택하지 않은 상태로 시작하고 탭 이동 후 캔버스 상태 유지
- 원본 옷이 삭제돼도 코디의 이미지·이름·브랜드 스냅샷 유지

### 계정·친구·동기화

- 이메일, Google, Kakao 로그인
- 중복 불가 룩부기 ID와 친구에게 보이는 닉네임 설정
- ID로 친구 요청, 수락·거절, 친구 목록 검색
- 내 화면과 같은 검색·카테고리 구성을 갖춘 친구 옷장·코디북과 마이핏 보기
- 옷, 코디, 마이핏별 클라우드 동기화 상태 표시
- 로컬 JSON 백업 내보내기·가져오기와 원격 이미지 복원
- 클라우드 계정 및 연결 데이터 탈퇴

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 앱 | React Native 0.86, React 19, Expo SDK 57, TypeScript |
| 로컬 데이터 | Expo SQLite, Expo FileSystem, AsyncStorage |
| 이미지 | Expo Image Picker, Expo Image Manipulator, React Native SVG |
| 백엔드 | Supabase Auth, Postgres, Storage, Edge Functions |
| 인증 | Google Credential Manager / Google Sign-In, Kakao Native SDK |
| UI | Lucide React Native, React Native Safe Area Context |
| 빌드 | Expo Prebuild, Gradle, EAS Build |

## 데이터 흐름

```mermaid
flowchart LR
  UI[옷장·마이핏·코디북 UI] --> DB[(기기 SQLite)]
  UI --> FILES[기기 이미지 저장소]
  DB --> SYNC[동기화 서비스]
  FILES --> SYNC
  SYNC --> AUTH[Supabase Auth]
  SYNC --> PG[(Supabase Postgres)]
  SYNC --> STORAGE[Supabase Storage]
  PG --> FRIENDS[친구 옷장·마이핏·코디북]
```

개인 데이터의 기준은 기기 로컬 저장소입니다. 저장과 조회는 로컬에서 먼저 처리하고, 로그인 및 네트워크 연결이 가능할 때 Supabase에 동기화합니다. 친구 데이터 조회와 클라우드 계정 기능에는 네트워크가 필요합니다.

동기화 아이콘은 다음 상태를 나타냅니다.

- `CloudCheck`: Supabase 레코드가 확인된 동기화 완료 상태
- `CloudAlert`: 로컬 전용, 업로드 대기 또는 동기화 실패 상태

## 시작하기

### 준비 사항

- Node.js `22.13.0` 이상 권장
- npm
- Android Studio와 Android SDK
- Android 네이티브 빌드용 JDK 21
- iOS 빌드 시 macOS와 Xcode
- 클라우드 기능 사용 시 Supabase 프로젝트

Expo Go에는 Google·Kakao 네이티브 모듈이 포함되지 않으므로 실제 인증 테스트는 개발 빌드 또는 APK에서 진행해야 합니다.

### 설치

```bash
git clone https://github.com/0xseo/LookBookie.git
cd LookBookie
npm ci
cp .env.example .env
```

`.env`에 사용할 서비스의 공개 클라이언트 값을 입력합니다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=clothes
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=
```

`EXPO_PUBLIC_*` 값은 앱 번들에서 확인할 수 있습니다. Supabase `service_role` 키, Google/Kakao Client Secret, keystore 비밀번호 같은 비밀값은 여기에 넣지 않습니다.

### 실행

```bash
# Metro 개발 서버
npm start

# Android 개발 앱 생성 및 실행
# 룩부기 배포 앱과 데이터가 분리된 com.lookboogie.app.debug를 사용합니다.
npm run android

# iOS 네이티브 개발 앱
npm run ios

# TypeScript 검사
npm run typecheck
```

`npm run android:prebuild`는 Android 개발 패키지만 미리 생성할 때 사용합니다. 웹 스크립트도 제공하지만 네이티브 로그인과 일부 이미지 기능은 모바일 빌드를 기준으로 개발되어 있습니다.

### 실기기 개발 서버 연결

Android 기기를 USB로 연결한 뒤 개발 앱과 Metro를 연결할 수 있습니다.

```bash
npx expo start --dev-client --localhost --port 8081
adb reverse tcp:8081 tcp:8081
```

USB를 다시 연결한 경우 `adb reverse`를 다시 실행합니다. 교체한 이미지가 갱신되지 않으면 Metro를 종료한 뒤 같은 명령에 `--clear`를 추가해 캐시를 초기화합니다.

### 마스코트와 아이콘 조정

- 화면별 헤더·빈 화면 마스코트는 [`assets/mascots/README.md`](./assets/mascots/README.md)의 이름으로 PNG를 교체합니다.
- [`constants/mascots.ts`](./constants/mascots.ts)에서 그림의 실제 범위와 `displayScale`을 조절합니다. PNG의 크기나 투명 여백이 바뀌면 범위도 갱신합니다.
- 마이핏 자의 흰 테두리 두께는 [`MyFitIcon.tsx`](./src/components/MyFitIcon.tsx)의 `RULER_OUTLINE_EXTRA_WIDTH`에서 조절합니다.
- 프로필·친구·알림창의 단순 거북이 위치는 [`TurtleIcon.tsx`](./src/components/TurtleIcon.tsx)의 `HORIZONTAL_OFFSET`으로 함께 조절합니다.

## Supabase 설정

데이터베이스, RLS 정책, Storage 버킷, 친구 관계와 태그 스키마는 [`supabase/migrations`](./supabase/migrations)에 있습니다. 원격 프로젝트에 처음 연결할 때 다음 순서로 적용합니다.

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy delete-account
```

마이그레이션은 `public.clothes`, `public.fits`, `public.outfits`, `public.profiles`, `public.friendships`와 `clothes` Storage 버킷을 구성합니다. 모든 사용자 데이터 테이블의 RLS를 유지하고, 새 Supabase 프로젝트에서 Data API 자동 노출이 꺼져 있다면 `authenticated` 역할에 필요한 테이블 권한이 부여됐는지도 확인합니다.

Google·Kakao 콘솔의 패키지, 인증서 지문, nonce 및 Supabase provider 설정은 [`docs/social-auth-setup.md`](./docs/social-auth-setup.md)를 참고하세요. Apple 로그인 구현은 보관되어 있지만 현재 앱 UI에서는 비활성화되어 있습니다.

## 빌드

### EAS Android 빌드

```bash
# 내부 배포용 APK
npx eas build --platform android --profile preview

# 스토어 배포용 AAB
npx eas build --platform android --profile production
```

### 로컬 Android release APK

릴리스 빌드 전 `app.json`의 `expo.version`과 `expo.android.versionCode`, `package.json`과 `package-lock.json`의 버전을 함께 올린 뒤 production 패키지로 native project를 생성합니다. release 빌드에는 `LOOKBOOGIE_DEBUG_BUILD=0`을 사용합니다.

```bash
LOOKBOOGIE_DEBUG_BUILD=0 npx expo prebuild --platform android --no-install
```

새로 생성된 `android/app/build.gradle`에는 기본 debug 서명이 들어갑니다. 기존 `android.signingConfigs`에 다음 `release` 설정을 추가하고, `buildTypes.release`의 서명을 `signingConfig signingConfigs.release`로 바꿉니다.

```groovy
release {
    def releaseStoreFile = System.getenv('LOOKBOOGIE_RELEASE_STORE_FILE')
    if (releaseStoreFile) {
        storeFile file(releaseStoreFile)
    }
    storePassword System.getenv('LOOKBOOGIE_RELEASE_STORE_PASSWORD')
    keyAlias System.getenv('LOOKBOOGIE_RELEASE_KEY_ALIAS')
    keyPassword System.getenv('LOOKBOOGIE_RELEASE_KEY_PASSWORD')
}
```

JDK 21과 Android SDK 경로를 설정하고 기존 배포 keystore로 빌드합니다.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21) # macOS
export ANDROID_HOME="$HOME/Library/Android/sdk" # macOS 기본 SDK 경로
export LOOKBOOGIE_RELEASE_STORE_FILE=/absolute/path/to/release.jks
export LOOKBOOGIE_RELEASE_STORE_PASSWORD=<STORE_PASSWORD>
export LOOKBOOGIE_RELEASE_KEY_ALIAS=<KEY_ALIAS>
export LOOKBOOGIE_RELEASE_KEY_PASSWORD=<KEY_PASSWORD>

./android/gradlew -p android app:assembleRelease
cp android/app/build/outputs/apk/release/app-release.apk LookBoogie-1.3.0.apk
```

완성된 APK는 `android/app/build/outputs/apk/release/app-release.apk`에 생성됩니다. 기존 설치를 업데이트하려면 같은 release 서명키를 사용해야 합니다. APK, keystore, `credentials.json`, `.env`는 Git에 커밋하지 않습니다.

## 프로젝트 구조

```text
LookBookie/
├── App.tsx                    # 앱 상태, 화면 전환, 로컬·클라우드 흐름 조정
├── constants/                # 디자인 토큰
├── assets/mascots/           # 화면별 헤더·빈 화면 거북이 PNG
├── src/
│   ├── components/           # 공통 UI, 다이얼로그, 입력·관리 컴포넌트
│   ├── hooks/                # 카테고리·색상·핏/사이즈·키보드 상태 훅
│   ├── screens/              # 옷장, 마이핏, 코디북, 친구, 마이페이지, 이미지 편집 화면
│   ├── services/             # 인증, Supabase 동기화, 친구, 백업 로직
│   ├── storage/              # SQLite와 로컬 이미지 저장
│   └── types/                # 옷, 마이핏, 코디, 친구, 동기화 타입
├── supabase/
│   ├── migrations/           # 원격 Postgres 스키마와 RLS 정책
│   └── functions/            # 계정 탈퇴 Edge Function
├── docs/                     # 운영 및 인증 설정 문서
├── AGENTS.md                 # 개발 순서와 에이전트 작업 규칙
├── DESIGN.md                 # 룩부기 디자인 시스템
└── CHANGELOG.md              # 작업 이력
```

## 개발 규칙

작업 전 [`AGENTS.md`](./AGENTS.md)와 [`DESIGN.md`](./DESIGN.md)를 먼저 확인합니다.

- 개인 옷장 기능은 네트워크가 끊겨도 사용할 수 있어야 합니다.
- UI와 데이터·동기화 로직의 책임을 분리합니다.
- 새 라이브러리나 구조 변경 전에 기존 구현과 오류 원인을 먼저 확인합니다.
- 코드 또는 주요 동작을 변경하면 `CHANGELOG.md`와 `execution_log.csv` 최상단에 기록합니다.
- 자동 배경 제거는 아직 제공하지 않으며, 현재는 온디바이스 수동 지우개를 사용합니다.

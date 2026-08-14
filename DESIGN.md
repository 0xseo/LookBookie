# Design System & UI Specification: LookBoogie (룩부기)

이 문서는 '룩부기(LookBoogie)' 앱의 시각적 정체성, 대표 캐릭터 콘셉트, 그리고 UI 컴포넌트 구조를 정의합니다.
Codex는 모든 UI 작성 및 React Native StyleSheet 구현 시 본 문서의 디자인 토큰과 규칙을 엄격히 준수해야 합니다.

---

## 1. Brand Identity & Character Concept

- **App Name:** 룩부기 (LookBoogie)
- **Mascot Character:** 느긋하게 나만의 룩북을 차곡차곡 쌓아가는 거북이 캐릭터 '룩부기'
- **Design Philosophy:**
  - **Friendly & Cozy:** 거북이 캐릭터의 느긋함과 따뜻함이 느껴지는 소프트 그린/어스 톤을 가미합니다.
  - **Minimal & Focus:** 캐릭터 요소는 주요 안내/빈 상태(Empty State)에 포인트로 사용하며, 옷 목록과 캔버스는 옷 본연의 색상이 돋보이도록 깔끔한 미니멀리즘을 유지합니다.
  - **Playful Canvas:** 스티커를 붙이듯 자유롭고 아기자기한 코디 조합 경험을 제공합니다.

---

## 2. Color System

```javascript
// constants/colors.ts
export const COLORS = {
  // Brand & Character Colors (거북이 콘셉트)
  primary: '#3A5A40',       // 딥 세이지 그린 (메인 브랜드 컬러 / 거북이 등껍질 톤)
  primaryLight: '#A3B18A',  // 소프트 포레스트 그린 (선택 상태, 하이라이트)
  secondary: '#E9EDC9',     // 파스텔 버터 그린 (포인트 배경 / 칩 선택)
  accent: '#D4A373',        // 따뜻한 등껍질 우드 톤 (아이콘 / 스티커 핸들)

  // System Background & Surface
  background: '#F8F9FA',   // 매우 연한 쿨그레이 (전체 앱 배경)
  surface: '#FFFFFF',      // 카드 및 모달 배경
  canvasBg: '#FFFFFF',     // 코디 캔버스 영역 (순백색)

  // Typography & Neutral
  textPrimary: '#1A1D1E',  // 메인 텍스트
  textSecondary: '#6C757D',// 설명 / 서브 텍스트 / 비활성화 텍스트
  border: '#E9ECEF',       // 테두리 및 경계선
  danger: '#E63946',       // 삭제 / 경고

  // Toast & Character Message Box
  bubbleBg: '#F1F5F9',     // 룩부기 대화상자 배경
};


## 3. Typography & Spacing Guidelines

- Typography
  - Header Large (화면 타이틀): fontSize: 22, fontWeight: '700', color: COLORS.textPrimary

  - Header Medium (섹션/카테고리): fontSize: 16, fontWeight: '600', color: COLORS.textPrimary

  - Body Text (내용/메타데이터): fontSize: 14, fontWeight: '400', color: COLORS.textPrimary

  - Caption Text (태그/날짜): fontSize: 12, fontWeight: '400', color: COLORS.textSecondary

- Spacing & Border Radius
  - Spacing Units: 기본 8px 단위 사용 (8, 16, 24, 32)

  - Border Radius:

    - Standard Card / Container: 16px

    - Button / Input Field: 12px

    - Chip / Tag: 20px (둥근 조약돌 형태)

    - Character Speech Bubble: 16px (우상단 4px로 대화창 느낌 연출)

## 4. Key Screen Layouts & Component Design
- A. 공통 컴포넌트: 룩부기 캐릭터 가이드 (Empty & Loading State)
  - Empty State (옷장/코디가 비어있을 때):

    - 화면 중앙에 룩부기 일러스트/아이콘 배치.

    - 말풍선(Bubble Container) 내 메시지: "아직 옷장이 비어있어북! 첫 옷을 등록해봐북 🐢"

  - Loading State:

    - 누끼(배경 제거) 처리 중 등 작업 진행 시 거북이가 천천히 고개를 끄덕이는 형태의 로딩 인디케이터/문구 제공.

- B. 메인 옷장 화면 (Wardrobe Screen)
  - Header: Top Bar 좌측에 '룩부기' 앱 로고 및 마스코트 아이콘 배치.

  - Category Filter: [전체 | 상의 | 하의 | 아우터 | 신발 | 악세사리] 둥근 칩 형태의 수평 스크롤.

  - Body (3-Column Grid):

    - Aspect Ratio 1:1 정사각형 아이템 카드.

    - 카드는 은은한 테두리(border: COLORS.border)와 borderRadius: 16 적용.

    - 투명화된 PNG 이미지가 잘 드러나도록 surface 배경 유지.

  - FAB (Floating Action Button): 화면 우측 하단 둥근 버튼 (#3A5A40 컬러) [ + 옷 추가 ].

- C. 옷 등록 및 누끼/지우개 화면 (Edit & Remove Background)
  - Preview Area: 누끼 처리된 이미지를 중앙 대형 뷰어로 노출.

  - Eraser Controls:

슬라이더 형태의 브러시 크기 조절기.

[Undo(되돌리기)], [Reset(초기화)] 버튼을 우측 하단에 미니멀하게 배치.

  - Metadata Form: 브랜드, 계절(봄/여름/가을/겨울), 색상 태그 선택 버튼 그룹.

- D. 코디 캔버스 화면 (Styling Canvas)
  - Canvas Area (상단 65%):

    - 백색 캔버스 영역. 선택된 옷 스티커를 자유롭게 위치/회전/크기 조절.

    - Sticker Control Handles: 선택된 스티커 우측 상단 삭제([X]), 우측 하단 조절 핸들 노출.

  - Bottom Drawer (하단 35%):

    - 내 옷장의 옷들을 수평 스크롤로 보여주는 Drawer.

    - 옷 카드를 터치하거나 캔버스로 올려서 스티커 추가.

## 5. Codex UI Development Rules
- 1. 상수 활용 강제: 모든 StyleSheet 작성 시 색상은 COLORS 상수를, 여백은 8의 배수를 참조하여 작성할 것 (하드코딩 금지).

- 2. 반응성 및 터치 영역 확보: 스티커 조작 버튼 및 브러시 컨트롤은 손가락 터치가 용이하도록 최소 44x44px 이상의 터치 영역(hitSlop 포함)을 확보할 것.

- 3. 네트워크 예외 처리: 오프라인 상태일 경우 네트워크 에러 팝업 대신 로컬 저장소 이미지를 우선 노출하며, 룩부기 캐릭터 안내 문구("지금은 오프라인 모드야북!")로 자연스럽게 상기시킬 것.
```

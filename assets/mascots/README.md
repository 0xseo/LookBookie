# 화면별 거북이 이미지

아래 파일을 원하는 PNG로 덮어쓰면 화면별로 교체됩니다. 파일 이름은 그대로 유지하세요.

| 화면 | 헤더 옆 버튼 | 빈 화면 거북이 |
| --- | --- | --- |
| 옷장 | wardrobe-header.png | wardrobe-empty.png |
| 마이핏 | myfit-header.png | myfit-empty.png |
| 코디북 | codibook-header.png | codibook-empty.png |
| 친구 | friends-header.png | friends-empty.png |
| 마이 | mypage-header.png | mypage-empty.png (옷 추가 화면 랜덤 이미지용) |

- PNG의 가로세로 비율은 유지합니다. 투명 배경도 가능합니다.
- 헤더 버튼은 60×60이며, 실제 그림은 안쪽 48×48을 기준으로 맞춥니다.
- 빈 화면은 실제 그림의 96×96 영역을 기준으로 맞춥니다.
- 현재 파일마다 투명 여백의 크기가 다르므로 constants/mascots.ts의 MASCOT_FRAMES에 실제 그림 범위를 지정했습니다. 이 범위를 기준으로 비율과 중심을 맞춥니다.
- x/y는 그림 범위의 왼쪽/위 위치, width/height는 범위의 크기입니다. imageWidth/imageHeight는 PNG 전체 크기입니다.
- displayScale로 화면별 그림 크기를 조절합니다. 1은 기준 크기, 0.95는 5% 축소, 1.05는 5% 확대입니다. 옷장은 0.95, 친구는 1.05를 적용했고 헤더와 빈 화면에 함께 반영됩니다. 헤더 버튼 크기는 유지됩니다.
- 지금은 같은 화면의 헤더/빈 화면 사진이 동일해서 범위 설정도 공유합니다. 서로 다른 사진으로 교체할 때는 범위를 다시 맞춰야 합니다.
- 새 PNG의 크기가 기존 범위 설정과 다르면 사진 전체를 표시합니다. 여백을 보정하려면 새 파일에 맞게 MASCOT_FRAMES를 갱신하세요.
- 마이는 빈 목록 안내 화면이 없으며, mypage-empty.png는 옷 추가 화면의 랜덤 후보로 사용합니다.
- 옷 추가 화면의 사진 선택 안내에서는 다섯 empty 이미지 중 하나를 골라 표시합니다. 화면이 열려 있는 동안에는 같은 이미지를 유지합니다.
- 교체한 이미지가 바로 바뀌지 않으면 개발 서버를 캐시 초기화 옵션으로 다시 시작하세요.

이미지 연결과 사진별 범위는 constants/mascots.ts, 헤더 크기와 여백은 src/components/BrandMascotButton.tsx, 빈 화면 크기·말풍선·기본 문구는 src/components/MascotEmptyState.tsx에서 수정할 수 있습니다. 실제 비율 계산은 src/components/MascotImage.tsx에서 공통으로 처리합니다.

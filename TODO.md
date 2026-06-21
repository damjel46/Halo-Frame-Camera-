# Halo 앱 — 이어서 할 일

## 프로젝트 위치
C:\Users\shdlr\Desktop\Halo

## 스택
Expo SDK 54 / React Native 0.81.5 / TypeScript / React Navigation 7
expo-camera 17 / expo-media-library / react-native-gesture-handler / react-native-reanimated
AsyncStorage (로컬 저장)

## 앱 개요
원형 물체를 기준점으로 삼아 여행 사진을 정렬하고 슬라이드쇼 영상으로 만드는 앱.
화면: Trips → CreateTrip → Camera → TripDetail → AlignPhoto / VideoEdit

## 현재 완성도: 72%
UI 리디자인(라이트 테마, 라벤더/피치/민트 팔레트) 완료.
네비게이션, CRUD, 사진 관리, SafeArea/키보드 반응형 처리 완료.

---

## 해야 할 일 (우선순위 순)

### 1순위 — 영상 인코더 네이티브 모듈 확인 및 수정
파일: `src/utils/videoExport.ts`
문제: `import { encode } from '../../modules/my-module/src/MyModule'`
커스텀 네이티브 모듈에 의존. expo run:android 빌드 없이는 크래시.
할 일:
- `modules/my-module` 디렉토리 구조 확인
- 모듈이 정상 빌드되는지 확인
- 안 되면 expo-av 또는 @ffmpeg-kit-react-native 등으로 대체 구현
- `onProgress` 콜백이 0.9→1.0 두 번만 호출됨 → 인코딩 중 실시간 진행률 반영되도록 수정

### 2순위 — CircleSetupScreen 정리
파일: `src/screens/CircleSetupScreen.tsx`, `src/types/index.ts`
문제: 현재 Camera 화면이 원 설정 후 TripDetail로 바로 이동 → CircleSetupScreen은 데드코드.
다크 테마(#0d0d1a, #ffc850)로 리디자인도 안 됨.
할 일 (둘 중 선택):
- **A)** CircleSetupScreen 완전 제거 + types에서 CircleSetup 라우트 삭제
- **B)** Camera setup 모드 후 CircleSetupScreen 거쳐서 원 확정하도록 플로우 복구
  → 복구 시 라이트 테마로 리디자인 필요 (다른 화면과 동일: BG `#F5F3FC`, Primary `#7460DC`)

### 3순위 — 패닝 좌표 기기 독립성
파일: `src/types/index.ts` (PhotoAdjustment), `src/screens/AlignScreen.tsx`, `VideoEditScreen.tsx`
문제: `adjustment.panX/panY`가 픽셀값으로 저장됨.
기기 해상도가 달라지면 보정값 어긋남.
할 일:
- panX/panY를 비율값(ratio)으로 변환해 저장
- AlignScreen, VideoEditScreen에서 비율 → 픽셀 변환 적용
- 기존 저장 데이터 마이그레이션 고려

### 4순위 — 오디오 선택 UI
파일: `src/screens/VideoEditScreen.tsx`, `src/utils/videoExport.ts`
문제: videoExport에 `audioPath` 파라미터 있지만 선택 UI 없음.
할 일:
- VideoEditScreen 익스포트 바에 BGM 선택 버튼 추가
- expo-document-picker 또는 expo-image-picker(audio)로 파일 선택
- 선택된 파일명 표시, 제거 버튼

### 5순위 — 소소한 개선
- VideoEditScreen: `` width: `${n}%` as any `` TypeScript 핵 제거
  → 인라인 `style={{ width: \`${n}%\` }}` 사용
- TripsScreen: 빈 상태일 때 `emptyWrap`이 `flex:1`인데 SafeAreaView 안에서 높이 계산 확인
- CircleSetupScreen 제거 시 `App.tsx`에서 해당 `Stack.Screen`도 함께 제거

---

## 디자인 토큰 (참고)

| 토큰 | 값 |
|---|---|
| BG | `#F5F3FC` |
| Primary | `#7460DC` |
| Text | `#1A1430` |
| Subtext | `#9891C0` |
| Card | `#FFFFFF` |
| Border | `#E8E5F5` |
| Peach (줌 인디케이터) | `#C89645` |

---

## 실행

```bash
npx expo start        # Expo Go로 QR 스캔 (네이티브 모듈 제외 기능 확인)
npx expo run:android  # 전체 빌드 (네이티브 모듈 포함)
```

---

## 주의사항
- Expo v54 docs: https://docs.expo.dev/versions/v54.0.0/
- 카메라 뷰파인더 높이: `SCREEN.height × 0.65` (Camera / Align / VideoEdit 동일하게 유지)
- 원 좌표는 ratio로 저장 (`xRatio`, `yRatio`, `radiusRatio`) — 이 방식 유지

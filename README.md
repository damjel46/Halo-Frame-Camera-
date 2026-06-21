# Halo

원형 물체를 기준으로 여행 사진을 정렬하고 영상으로 만드는 앱.

---

## 버전 스택

| 패키지 | 버전 |
|---|---|
| Expo SDK | ~54.0.34 |
| React | 19.1.0 |
| React Native | 0.81.5 |
| TypeScript | ~5.9.2 |
| expo-camera | ~17.0.10 |
| expo-av | ~16.0.8 |
| expo-file-system | ~19.0.23 |
| expo-image-picker | ~17.0.11 |
| expo-media-library | ~18.2.1 |
| expo-status-bar | ~3.0.9 |
| @react-navigation/native | ^7.3.3 |
| @react-navigation/native-stack | ^7.17.5 |
| react-native-gesture-handler | ~2.28.0 |
| react-native-reanimated | ~4.1.1 |
| react-native-safe-area-context | ~5.6.0 |
| react-native-screens | ~4.16.0 |
| react-native-svg | 15.12.1 |
| @shopify/react-native-skia | 2.2.12 |
| @react-native-async-storage/async-storage | 2.2.0 |

> Expo docs 참조: https://docs.expo.dev/versions/v54.0.0/

---

## 실행

```bash
# 개발 서버 (Expo Go 앱으로 QR 스캔)
npx expo start

# Android 빌드 (에뮬레이터 또는 USB 기기 필요)
npx expo run:android

# iOS 빌드 (Mac + Xcode 필요)
npx expo run:ios
```

---

## 화면 구조

```
Trips           → 여행 목록 (홈)
CreateTrip      → 새 여행 만들기 (modal)
Camera          → 카메라 (setup: 원 설정 / shoot: 촬영)
CircleSetup     → 가이드 원 조정
TripDetail      → 여행 상세 (사진 그리드)
AlignPhoto      → 사진 위치 보정 (드래그/핀치)
VideoEdit       → 영상 편집 및 내보내기
```

---

## 디자인

**테마:** Light (라벤더 · 피치 · 민트)

| 토큰 | 값 |
|---|---|
| BG | `#F5F3FC` |
| Primary | `#7460DC` |
| Text | `#1A1430` |
| Subtext | `#9891C0` |
| Card | `#FFFFFF` |
| Border | `#E8E5F5` |
| Peach (줌 인디케이터) | `#C89645` |

디자인 레퍼런스: `로고에 맞는 디자인.zip` → `Halo Redesign.dc.html`

---

## 데이터

AsyncStorage에 저장. 키 구조:

- `trips` — `Trip[]` (id, name, albumName, createdAt, circle)
- `photos:{tripId}` — `TripPhoto[]` (id, tripId, uri, order, adjustment)

---

## 주의사항

- `expo-linear-gradient` 미설치 → 그라디언트는 단색 `#7460DC`로 대체
- 카메라 뷰파인더 영역 높이: `SCREEN.height × 0.65` (Camera / AlignPhoto / VideoEdit 동일)
- 원 좌표는 비율값(ratio)으로 저장 → 화면 크기 변해도 유지

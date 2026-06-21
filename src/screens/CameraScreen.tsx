import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { RootStackParamList, TripPhoto } from '../types';
import { getTrip, savePhoto, saveTrip } from '../utils/storage';
import { saveToTripAlbum } from '../utils/mediaLibrary';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

const SCREEN = Dimensions.get('window');

export const PHOTO_W = SCREEN.width;
export const PHOTO_H = Math.round(SCREEN.height * 0.65);

// Dial ruler constants
const TICK_SPACING = 10;
const TICK_COUNT = 50;                                          // zoom range ticks
const EXTRA_TICKS = Math.ceil(PHOTO_W / 2 / TICK_SPACING) + 2; // padding each side
const TOTAL_TICKS = TICK_COUNT + 2 * EXTRA_TICKS;
const RULER_SLIDE = TICK_COUNT * TICK_SPACING;                  // max dialOffset
const RULER_INIT_X = PHOTO_W / 2 - EXTRA_TICKS * TICK_SPACING; // translateX at zoom=0

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId, mode } = route.params;

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [zoom, setZoom] = useState(0);

  // Circle shared values
  const cx = useSharedValue(PHOTO_W * 0.5);
  const cy = useSharedValue(PHOTO_H * 0.5);
  const radius = useSharedValue(PHOTO_W * 0.28);
  const startCx = useSharedValue(0);
  const startCy = useSharedValue(0);
  const startRadius = useSharedValue(0);

  // Dial zoom shared values
  const dialOffset = useSharedValue(0);
  const startDialOffset = useSharedValue(0);

  useEffect(() => {
    getTrip(tripId).then(trip => {
      if (trip) {
        cx.value = trip.circle.xRatio * PHOTO_W;
        cy.value = trip.circle.yRatio * PHOTO_H;
        radius.value = trip.circle.radiusRatio * PHOTO_W;
      }
    });
  }, [tripId]);

  // Circle gestures
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startCx.value = cx.value;
      startCy.value = cy.value;
    })
    .onUpdate(e => {
      cx.value = Math.max(0, Math.min(startCx.value + e.translationX, PHOTO_W));
      cy.value = Math.max(0, Math.min(startCy.value + e.translationY, PHOTO_H));
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { startRadius.value = radius.value; })
    .onUpdate(e => {
      radius.value = Math.max(40, Math.min(startRadius.value * e.scale, PHOTO_W * 0.48));
    });

  const setupGesture = Gesture.Simultaneous(dragGesture, pinchGesture);

  // Dial zoom gesture
  const zoomPan = Gesture.Pan()
    .onStart(() => { startDialOffset.value = dialOffset.value; })
    .onUpdate(e => {
      const next = Math.max(0, Math.min(RULER_SLIDE, startDialOffset.value - e.translationX));
      dialOffset.value = next;
      runOnJS(setZoom)(next / RULER_SLIDE);
    });

  const circleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - radius.value,
    top: cy.value - radius.value,
    width: radius.value * 2,
    height: radius.value * 2,
    borderRadius: radius.value,
    borderWidth: 2.5,
    borderColor: mode === 'setup' ? '#ffc850' : 'rgba(124,111,247,0.9)',
    borderStyle: 'dashed',
  }));

  const dotStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - 4,
    top: cy.value - 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: mode === 'setup' ? '#ffc850' : 'rgba(124,111,247,0.8)',
  }));

  const rulerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: RULER_INIT_X - dialOffset.value }],
  }));

  async function handlePhoto(uri: string) {
    const trip = await getTrip(tripId);
    if (!trip) return;

    if (mode === 'setup') {
      await saveTrip({
        ...trip,
        circle: {
          xRatio: cx.value / PHOTO_W,
          yRatio: cy.value / PHOTO_H,
          radiusRatio: radius.value / PHOTO_W,
        },
      });
    }

    const photo: TripPhoto = {
      id: Date.now().toString(),
      tripId,
      uri,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      adjustment: { panX: 0, panY: 0, scale: 1 },
    };
    await savePhoto(photo);
    saveToTripAlbum(uri, trip.albumName).catch(() => {});

    if (mode === 'setup') {
      navigation.replace('TripDetail', { tripId });
    } else {
      navigation.goBack();
    }
  }

  async function takePicture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (photo?.uri) await handlePhoto(photo.uri);
    } catch {
      Alert.alert('촬영 실패', '다시 시도해주세요.');
    } finally {
      setCapturing(false);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.92,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePhoto(result.assets[0].uri);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>카메라 권한이 필요해요</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>권한 허용</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryLink} onPress={pickFromGallery}>
          <Text style={styles.galleryLinkText}>갤러리에서 선택하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSetup = mode === 'setup';
  const zoomLabel = `${(1 + zoom * 7).toFixed(1)}×`;

  return (
    <View style={styles.container}>
      {/* Camera + overlay — PHOTO_W × PHOTO_H, same as AlignScreen/VideoEditScreen */}
      <View style={styles.cameraArea}>
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back" zoom={zoom} />

        {isSetup ? (
          <GestureDetector gesture={setupGesture}>
            <Animated.View style={StyleSheet.absoluteFill}>
              <Animated.View style={circleStyle} />
              <Animated.View style={dotStyle} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={circleStyle} />
            <Animated.View style={dotStyle} />
          </View>
        )}

        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>
            {isSetup
              ? '점선 영역 안에 원을 맞춰주세요 · 드래그/핀치로 조정'
              : '원형 물체를 가이드에 맞춰 찍어주세요'}
          </Text>
        </View>
      </View>

      {/* Dial zoom */}
      <GestureDetector gesture={zoomPan}>
        <View style={styles.dialWrap}>
          {/* Ruler — slides left/right */}
          <View style={styles.dialTrack}>
            <Animated.View style={[styles.ruler, rulerStyle]}>
              {Array.from({ length: TOTAL_TICKS }, (_, i) => {
                const isMajor = (i - EXTRA_TICKS) % 5 === 0;
                return (
                  <View
                    key={i}
                    style={[
                      styles.tick,
                      isMajor ? styles.tickMajor : styles.tickMinor,
                    ]}
                  />
                );
              })}
            </Animated.View>
            {/* Fixed center indicator */}
            <View style={styles.dialIndicator} pointerEvents="none" />
          </View>
          {/* Zoom label */}
          <Text style={styles.zoomLabel}>{zoomLabel}</Text>
        </View>
      </GestureDetector>

      {/* Shutter controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={styles.galleryBtnText}>갤러리</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, capturing && styles.shutterActive]}
          onPress={takePicture}
          disabled={capturing}
        >
          <View style={[
            styles.shutterInner,
            { backgroundColor: isSetup ? '#ffc850' : '#fff' },
          ]} />
        </TouchableOpacity>

        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraArea: {
    width: PHOTO_W,
    height: PHOTO_H,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraView: {
    width: PHOTO_W,
    height: PHOTO_H,
  },
  hint: {
    position: 'absolute',
    top: 8, left: 0, right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13, fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    textAlign: 'center',
  },

  // Dial zoom
  dialWrap: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  dialTrack: {
    width: PHOTO_W,
    height: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  ruler: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: TICK_SPACING - 1,
  },
  tick: {
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tickMinor: { height: 8 },
  tickMajor: { height: 16, backgroundColor: 'rgba(255,255,255,0.75)' },
  dialIndicator: {
    position: 'absolute',
    bottom: 0,
    left: PHOTO_W / 2 - 1,
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: '#ffc850',
  },
  zoomLabel: {
    color: '#ffc850',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Shutter controls
  controls: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  shutter: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterActive: { opacity: 0.5 },
  shutterInner: {
    width: 58, height: 58, borderRadius: 29,
  },
  galleryBtn: { width: 60, alignItems: 'center' },
  galleryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  permContainer: {
    flex: 1, backgroundColor: '#0d0d1a',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  permText: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 24 },
  permBtn: {
    backgroundColor: '#7c6ff7', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 14, marginBottom: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  galleryLink: { paddingVertical: 12 },
  galleryLinkText: { color: '#666', fontSize: 15 },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const TICK_COUNT = 50;
const EXTRA_TICKS = Math.ceil(PHOTO_W / 2 / TICK_SPACING) + 2;
const TOTAL_TICKS = TICK_COUNT + 2 * EXTRA_TICKS;
const RULER_SLIDE = TICK_COUNT * TICK_SPACING;
const RULER_INIT_X = PHOTO_W / 2 - EXTRA_TICKS * TICK_SPACING;

export default function CameraScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId, mode } = route.params;

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const insets = useSafeAreaInsets();

  const cx = useSharedValue(PHOTO_W * 0.5);
  const cy = useSharedValue(PHOTO_H * 0.5);
  const radius = useSharedValue(PHOTO_W * 0.28);
  const startCx = useSharedValue(0);
  const startCy = useSharedValue(0);
  const startRadius = useSharedValue(0);

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

  const dragGesture = Gesture.Pan()
    .onStart(() => { startCx.value = cx.value; startCy.value = cy.value; })
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
    borderColor: mode === 'setup' ? 'rgba(255,200,80,0.9)' : 'rgba(160,140,255,0.85)',
    borderStyle: 'dashed',
  }));

  const dotStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - 4,
    top: cy.value - 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: mode === 'setup' ? 'rgba(255,200,80,0.9)' : 'rgba(160,140,255,0.9)',
  }));

  const crossH = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - 16,
    top: cy.value - 0.75,
    width: 32, height: 1.5,
    backgroundColor: mode === 'setup' ? 'rgba(255,200,80,0.4)' : 'rgba(160,140,255,0.4)',
  }));

  const crossV = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - 0.75,
    top: cy.value - 16,
    width: 1.5, height: 32,
    backgroundColor: mode === 'setup' ? 'rgba(255,200,80,0.4)' : 'rgba(160,140,255,0.4)',
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

  const zoomLabel = `${(1 + zoom * 7).toFixed(1)}×`;

  return (
    <View style={styles.container}>
      {/* Camera viewfinder */}
      <View style={styles.cameraArea}>
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back" zoom={zoom} animateShutter={false} />

        {mode === 'setup' ? (
          <GestureDetector gesture={setupGesture}>
            <Animated.View style={StyleSheet.absoluteFill}>
              <Animated.View style={circleStyle} />
              <Animated.View style={crossH} />
              <Animated.View style={crossV} />
              <Animated.View style={dotStyle} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={circleStyle} />
            <Animated.View style={crossH} />
            <Animated.View style={crossV} />
            <Animated.View style={dotStyle} />
          </View>
        )}

        {/* Hint pill */}
        <View style={styles.hintWrap} pointerEvents="none">
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              {mode === 'setup'
                ? '점선 영역 안에 원을 맞춰주세요 · 드래그/핀치로 조정'
                : '가이드에 맞춰 찍어주세요'}
            </Text>
          </View>
        </View>
      </View>

      {/* Dial zoom */}
      <GestureDetector gesture={zoomPan}>
        <View style={styles.dialWrap}>
          <View style={styles.dialTrack}>
            <Animated.View style={[styles.ruler, rulerStyle]}>
              {Array.from({ length: TOTAL_TICKS }, (_, i) => {
                const isMajor = (i - EXTRA_TICKS) % 5 === 0;
                return (
                  <View
                    key={i}
                    style={[styles.tick, isMajor ? styles.tickMajor : styles.tickMinor]}
                  />
                );
              })}
            </Animated.View>
            <View style={styles.dialIndicator} pointerEvents="none" />
          </View>
          <Text style={styles.zoomLabel}>{zoomLabel}</Text>
        </View>
      </GestureDetector>

      {/* Controls area — light theme, nav bar 위에 배치 */}
      <View style={[styles.controls, { paddingBottom: Math.max(20, insets.bottom) }]}>
        {/* Gallery */}
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <View style={styles.galleryIcon}>
            <View style={[styles.gallerySquare, { top: 0, left: 0, backgroundColor: '#C8BEF0' }]} />
            <View style={[styles.gallerySquare, { top: 0, right: 0, backgroundColor: '#FBD9AB' }]} />
            <View style={[styles.gallerySquare, { bottom: 0, left: 0, backgroundColor: '#A8DFC8' }]} />
            <View style={[styles.gallerySquare, { bottom: 0, right: 0, backgroundColor: '#E8C0E8' }]} />
          </View>
          <Text style={styles.galleryLabel}>갤러리</Text>
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableOpacity
          style={[styles.shutter, capturing && styles.shutterActive]}
          onPress={takePicture}
          disabled={capturing}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0814' },
  cameraArea: {
    width: PHOTO_W,
    height: PHOTO_H,
    overflow: 'hidden',
    backgroundColor: '#111020',
  },
  cameraView: { width: PHOTO_W, height: PHOTO_H },

  hintWrap: {
    position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500',
  },

  // Dial
  dialWrap: {
    backgroundColor: 'rgba(15,12,28,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(160,140,255,0.12)',
    paddingTop: 6, paddingBottom: 6, alignItems: 'center',
  },
  dialTrack: {
    width: PHOTO_W, height: 28, overflow: 'hidden', justifyContent: 'flex-end',
  },
  ruler: {
    position: 'absolute', bottom: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: TICK_SPACING - 1,
  },
  tick: { width: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  tickMinor: { height: 8 },
  tickMajor: { height: 16, backgroundColor: 'rgba(255,255,255,0.55)' },
  dialIndicator: {
    position: 'absolute', bottom: 0,
    left: PHOTO_W / 2 - 1,
    width: 2, height: 22, borderRadius: 1,
    backgroundColor: '#C89645', // peach indicator
  },
  zoomLabel: {
    color: '#C89645', fontSize: 11, fontWeight: '700',
    marginTop: 4, letterSpacing: 0.5,
  },

  // Controls — LIGHT theme
  controls: {
    flex: 1,
    backgroundColor: '#F5F3FC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  galleryBtn: { width: 60, alignItems: 'center', gap: 6 },
  galleryIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E8E5F5',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  gallerySquare: {
    position: 'absolute', width: 22, height: 22, borderRadius: 4,
  },
  galleryLabel: { fontSize: 11, fontWeight: '600', color: '#9891C0' },
  shutter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 4, borderColor: '#E8E5F5',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  shutterActive: { opacity: 0.5 },
  shutterInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F5F3FC',
  },

  permContainer: {
    flex: 1, backgroundColor: '#F5F3FC',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  permText: { color: '#1A1430', fontSize: 18, fontWeight: '600', marginBottom: 24 },
  permBtn: {
    backgroundColor: '#7460DC', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 14, marginBottom: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  galleryLink: { paddingVertical: 12 },
  galleryLinkText: { color: '#9891C0', fontSize: 15 },
});

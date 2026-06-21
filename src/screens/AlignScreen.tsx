import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Trip, TripPhoto } from '../types';
import { getPhotos, getTrip, savePhoto } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'AlignPhoto'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'AlignPhoto'>;

const SCREEN = Dimensions.get('window');

// Must match CameraScreen.PHOTO_W / PHOTO_H exactly.
const PHOTO_W = SCREEN.width;
const PHOTO_H = Math.round(SCREEN.height * 0.65);

export default function AlignScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId, photoId } = route.params;
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [photo, setPhoto] = useState<TripPhoto | null>(null);

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);
  const startScale = useSharedValue(1);

  useEffect(() => {
    Promise.all([getTrip(tripId), getPhotos(tripId)]).then(([t, photos]) => {
      setTrip(t);
      const p = photos.find(ph => ph.id === photoId);
      if (p) {
        setPhoto(p);
        panX.value = p.adjustment.panX;
        panY.value = p.adjustment.panY;
        scale.value = p.adjustment.scale;
      }
    });
  }, [tripId, photoId]);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startPanX.value = panX.value;
      startPanY.value = panY.value;
    })
    .onUpdate(e => {
      panX.value = startPanX.value + e.translationX;
      panY.value = startPanY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate(e => {
      scale.value = Math.max(0.5, Math.min(startScale.value * e.scale, 4));
    });

  const composed = Gesture.Simultaneous(dragGesture, pinchGesture);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  async function handleSave() {
    if (!photo) return;
    await savePhoto({
      ...photo,
      adjustment: { panX: panX.value, panY: panY.value, scale: scale.value },
    });
    navigation.goBack();
  }

  function handleReset() {
    panX.value = 0;
    panY.value = 0;
    scale.value = 1;
  }

  if (!trip || !photo) return <View style={styles.container} />;

  // Circle overlay — same coordinate space as CameraScreen & VideoEditScreen
  const cx = trip.circle.xRatio * PHOTO_W;
  const cy = trip.circle.yRatio * PHOTO_H;
  const r  = trip.circle.radiusRatio * PHOTO_W;

  return (
    <View style={styles.container}>
      {/* Photo edit area — fixed square so adjustments match the video preview exactly */}
      <View style={styles.photoArea}>
        <GestureDetector gesture={composed}>
          <Animated.View style={StyleSheet.absoluteFill}>
            <Animated.Image
              source={{ uri: photo.uri }}
              style={[styles.photo, photoStyle]}
              resizeMode="cover"
            />
          </Animated.View>
        </GestureDetector>

        {/* Fixed circle guide overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View
            style={{
              position: 'absolute',
              left: cx - r, top: cy - r,
              width: r * 2, height: r * 2,
              borderRadius: r,
              borderWidth: 2.5,
              borderColor: 'rgba(124,111,247,0.9)',
            }}
          />
          <View style={{ position: 'absolute', left: cx - 20, top: cy - 1, width: 40, height: 2, backgroundColor: 'rgba(124,111,247,0.4)' }} />
          <View style={{ position: 'absolute', left: cx - 1, top: cy - 20, width: 2, height: 40, backgroundColor: 'rgba(124,111,247,0.4)' }} />
        </View>
      </View>

      {/* Floating header — sits on top of photoArea, same y=0 as CameraScreen */}
      <View style={[styles.floatingHeader, { top: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ 위치 보정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          사진을 드래그/핀치해서 원형 물체를 가이드에 맞춰주세요
        </Text>
        <View style={styles.footerBtns}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>초기화</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  photoArea: {
    width: PHOTO_W,
    height: PHOTO_H,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    padding: 20, gap: 14,
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    left: 0, right: 0,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  footerHint: { color: '#888', fontSize: 13, textAlign: 'center' },
  footerBtns: { flexDirection: 'row', gap: 12 },
  resetBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#161625',
    alignItems: 'center',
    borderWidth: 1, borderColor: '#252540',
  },
  resetBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#7c6ff7',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

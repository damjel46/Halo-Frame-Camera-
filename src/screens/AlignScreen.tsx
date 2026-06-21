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
    .onStart(() => { startPanX.value = panX.value; startPanY.value = panY.value; })
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

  const cx = trip.circle.xRatio * PHOTO_W;
  const cy = trip.circle.yRatio * PHOTO_H;
  const r  = trip.circle.radiusRatio * PHOTO_W;

  return (
    <View style={styles.container}>
      {/* Photo edit area — dark */}
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

        {/* Circle guide overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View
            style={{
              position: 'absolute',
              left: cx - r, top: cy - r,
              width: r * 2, height: r * 2,
              borderRadius: r,
              borderWidth: 2.5,
              borderColor: 'rgba(160,140,255,0.85)',
            }}
          />
          <View style={{ position: 'absolute', left: cx - 20, top: cy - 0.75, width: 40, height: 1.5, backgroundColor: 'rgba(160,140,255,0.4)' }} />
          <View style={{ position: 'absolute', left: cx - 0.75, top: cy - 20, width: 1.5, height: 40, backgroundColor: 'rgba(160,140,255,0.4)' }} />
          <View style={{ position: 'absolute', left: cx - 3, top: cy - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(160,140,255,0.9)' }} />
        </View>
      </View>

      {/* Floating header */}
      <View style={[styles.floatingHeader, { top: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ 위치 보정</Text>
        </TouchableOpacity>
      </View>

      {/* Footer — light, nav bar 위에 배치 */}
      <View style={[styles.footer, { paddingBottom: Math.max(48, insets.bottom) }]}>
        <View style={styles.hintCard}>
          <Text style={styles.footerHint}>
            사진을 드래그 / 핀치해서{'\n'}원형 물체를 가이드에 맞춰주세요
          </Text>
        </View>
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
  container: { flex: 1, backgroundColor: '#08060e' },

  photoArea: {
    width: PHOTO_W, height: PHOTO_H,
    overflow: 'hidden', backgroundColor: '#08060e',
  },
  photo: { width: '100%', height: '100%' },

  floatingHeader: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Footer — light theme
  footer: {
    flex: 1,
    backgroundColor: '#F5F3FC',
    paddingHorizontal: 24, paddingTop: 24,
    gap: 20,
    justifyContent: 'center',
  },
  hintCard: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E8E5F5',
  },
  footerHint: { fontSize: 13, color: '#9891C0', textAlign: 'center', lineHeight: 20 },
  footerBtns: { flexDirection: 'row', gap: 12 },
  resetBtn: {
    flex: 1, paddingVertical: 18,
    borderRadius: 18, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#E8E5F5',
    alignItems: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  resetBtnText: { color: '#9891C0', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, paddingVertical: 18,
    borderRadius: 18, backgroundColor: '#7460DC',
    alignItems: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

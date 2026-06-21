import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, TripPhoto } from '../types';
import { getTrip, savePhoto, saveTrip } from '../utils/storage';
import { saveToTripAlbum } from '../utils/mediaLibrary';

type Props = NativeStackScreenProps<RootStackParamList, 'CircleSetup'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'CircleSetup'>;

const SCREEN = Dimensions.get('window');

export default function CircleSetupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId, photoUri } = route.params;

  // Circle in screen pixels, start at center
  const cx = useSharedValue(SCREEN.width * 0.5);
  const cy = useSharedValue(SCREEN.height * 0.45);
  const radius = useSharedValue(SCREEN.width * 0.28);

  const startCx = useSharedValue(0);
  const startCy = useSharedValue(0);
  const startRadius = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startCx.value = cx.value;
      startCy.value = cy.value;
    })
    .onUpdate(e => {
      cx.value = startCx.value + e.translationX;
      cy.value = startCy.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { startRadius.value = radius.value; })
    .onUpdate(e => {
      radius.value = Math.max(40, Math.min(
        startRadius.value * e.scale,
        SCREEN.width * 0.48
      ));
    });

  const composed = Gesture.Simultaneous(dragGesture, pinchGesture);

  const circleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - radius.value,
    top: cy.value - radius.value,
    width: radius.value * 2,
    height: radius.value * 2,
    borderRadius: radius.value,
    borderWidth: 2.5,
    borderColor: '#ffc850',
  }));

  const dotStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cx.value - 4,
    top: cy.value - 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffc850',
  }));

  async function handleConfirm() {
    const trip = await getTrip(tripId);
    if (!trip) return;

    // Convert pixel positions to ratios
    const circle = {
      xRatio: cx.value / SCREEN.width,
      yRatio: cy.value / SCREEN.height,
      radiusRatio: radius.value / SCREEN.width,
    };

    // Save updated trip with circle
    await saveTrip({ ...trip, circle });

    // Save this reference photo as the first trip photo
    const savedUri = await saveToTripAlbum(photoUri, trip.albumName);
    const photo: TripPhoto = {
      id: Date.now().toString(),
      tripId,
      uri: savedUri ?? photoUri,
      order: 0,
      createdAt: new Date().toISOString(),
      adjustment: { panX: 0, panY: 0, scale: 1 },
    };
    await savePhoto(photo);

    navigation.replace('TripDetail', { tripId });
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />

        <GestureDetector gesture={composed}>
          <Animated.View style={StyleSheet.absoluteFill}>
            <Animated.View style={circleStyle} />
            <Animated.View style={dotStyle} />
          </Animated.View>
        </GestureDetector>

        {/* Dim outside circle hint */}
        <View style={styles.hintOverlay} pointerEvents="none">
          <Text style={styles.hintText}>
            원형 물체 위에 원을 맞춰주세요{'\n'}드래그로 이동 · 두 손가락으로 크기 조정
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerDesc}>
          이 위치가 이 여행의 기준이 돼요.{'\n'}앞으로 모든 사진에 이 가이드가 표시됩니다.
        </Text>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>가이드 설정 완료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageWrap: { flex: 1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  hintOverlay: {
    position: 'absolute', bottom: 20, left: 0, right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, overflow: 'hidden',
  },
  footer: {
    backgroundColor: '#0d0d1a',
    padding: 24, gap: 16,
  },
  footerDesc: {
    color: '#888', fontSize: 14, lineHeight: 20, textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: '#ffc850',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  confirmBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});

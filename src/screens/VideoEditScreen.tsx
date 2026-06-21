import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Trip, TripPhoto } from '../types';
import { getPhotos, getTrip, reorderPhotos } from '../utils/storage';
import { exportToVideo } from '../utils/videoExport';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'VideoEdit'>;

const SCREEN = Dimensions.get('window');
const SLIDE_MS = 800;
const PHOTO_W = SCREEN.width;
const PHOTO_H = Math.round(SCREEN.height * 0.65);

export default function VideoEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId } = route.params;

  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [duration, setDuration] = useState(1.0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    Promise.all([getTrip(tripId), getPhotos(tripId)]).then(([t, p]) => {
      setTrip(t);
      setPhotos(p);
    });
  }, [tripId]);

  useEffect(() => {
    if (playing && photos.length > 0) {
      timerRef.current = setInterval(() => {
        setPreviewIndex(prev => (prev + 1) % photos.length);
      }, SLIDE_MS);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, photos.length]);

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...photos];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    next.forEach((p, i) => { p.order = i; });
    setPhotos(next);
    reorderPhotos(tripId, next.map(p => p.id));
  }

  function moveDown(idx: number) {
    if (idx === photos.length - 1) return;
    const next = [...photos];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    next.forEach((p, i) => { p.order = i; });
    setPhotos(next);
    reorderPhotos(tripId, next.map(p => p.id));
  }

  async function handleExport() {
    if (exporting || photos.length === 0) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const result = await exportToVideo({
        photos,
        durationPerPhoto: duration,
        onProgress: setExportProgress,
      });
      if (result.success) {
        Alert.alert('완료', '영상이 Halo 앨범에 저장됐어요!', [{ text: '확인' }]);
      } else {
        Alert.alert('오류', result.error, [{ text: '확인' }]);
      }
    } catch {
      Alert.alert('오류', '인코딩 중 오류가 발생했습니다.', [{ text: '확인' }]);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }

  if (!trip) return <View style={styles.container} />;

  const cx = trip.circle.xRatio * PHOTO_W;
  const cy = trip.circle.yRatio * PHOTO_H;
  const r  = trip.circle.radiusRatio * PHOTO_W;
  const currentPhoto = photos[previewIndex];

  return (
    <View style={styles.container}>
      {/* Preview area — dark */}
      <View style={styles.previewWrap}>
        {currentPhoto && (
          <Animated.Image
            source={{ uri: currentPhoto.uri }}
            style={[
              styles.previewImage,
              {
                transform: [
                  { translateX: currentPhoto.adjustment.panX },
                  { translateY: currentPhoto.adjustment.panY },
                  { scale: currentPhoto.adjustment.scale },
                ],
              },
            ]}
            resizeMode="cover"
          />
        )}
        {/* Circle guide */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{
            position: 'absolute',
            left: cx - r, top: cy - r,
            width: r * 2, height: r * 2,
            borderRadius: r,
            borderWidth: 2,
            borderColor: 'rgba(160,140,255,0.5)',
          }} />
        </View>

        {/* Play/Pause */}
        <TouchableOpacity style={styles.playBtn} onPress={() => setPlaying(p => !p)}>
          <Text style={styles.playBtnText}>{playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Frame counter */}
        <View style={styles.frameCounter}>
          <Text style={styles.frameCounterText}>{previewIndex + 1} / {photos.length}</Text>
        </View>
      </View>

      {/* Floating header */}
      <View style={[styles.floatingHeader, { top: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          disabled={exporting}
        >
          <Text style={styles.backBtnText}>‹ 영상 편집</Text>
        </TouchableOpacity>
      </View>

      {/* Photo order list — light */}
      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isActive = index === previewIndex;
          return (
            <TouchableOpacity
              style={[styles.photoRow, isActive && styles.photoRowActive]}
              onPress={() => { setPreviewIndex(index); setPlaying(false); }}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.uri }} style={styles.rowThumb} />
              <Text style={[styles.rowNum, isActive && styles.rowNumActive]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1 }} />
              <View style={styles.rowArrows}>
                <TouchableOpacity
                  style={[styles.arrowBtn, isActive && styles.arrowBtnActive, index === 0 && styles.arrowOff]}
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <Text style={[styles.arrowText, isActive && styles.arrowTextActive]}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowBtn, isActive && styles.arrowBtnActive, index === photos.length - 1 && styles.arrowOff]}
                  onPress={() => moveDown(index)}
                  disabled={index === photos.length - 1}
                >
                  <Text style={[styles.arrowText, isActive && styles.arrowTextActive]}>↓</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.alignBtn, isActive && styles.alignBtnActive]}
                onPress={() => navigation.navigate('AlignPhoto', { tripId, photoId: item.id })}
              >
                <Text style={[styles.alignBtnText, isActive && styles.alignBtnTextActive]}>보정</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* Export bar — light */}
      <View style={[styles.exportBar, { paddingBottom: Math.max(28, insets.bottom) }]}>
        <View style={styles.durationRow}>
          <Text style={styles.durationLabel}>컷 길이</Text>
          {([0.5, 1, 2, 3]).map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
              onPress={() => setDuration(d)}
              disabled={exporting}
            >
              <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>
                {d}초
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {exporting && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${Math.round(exportProgress * 100)}%` as any }]} />
            <Text style={styles.progressText}>{Math.round(exportProgress * 100)}%</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.exportBtn, (exporting || photos.length === 0) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting || photos.length === 0}
        >
          <Text style={styles.exportBtnIcon}>✓</Text>
          <Text style={styles.exportBtnText}>
            {exporting ? '인코딩 중...' : '영상으로 내보내기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FC' },

  // Preview — dark
  previewWrap: {
    width: PHOTO_W, height: PHOTO_H,
    backgroundColor: '#0A0814', overflow: 'hidden', position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  playBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnText: { color: '#fff', fontSize: 14 },
  frameCounter: {
    position: 'absolute', bottom: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  frameCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
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

  // Photo list — light
  list: { flex: 1 },
  photoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, padding: 10, borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#EDE9FB',
  },
  photoRowActive: {
    borderWidth: 2, borderColor: '#7460DC',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  rowThumb: { width: 48, height: 48, borderRadius: 10 },
  rowNum: { fontSize: 13, fontWeight: '600', color: '#9891C0', width: 24 },
  rowNumActive: { color: '#5E48B8', fontWeight: '700' },
  rowArrows: { flexDirection: 'column', gap: 3 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F0EDF8',
    borderWidth: 1, borderColor: '#E4E0F5',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowBtnActive: { backgroundColor: '#EAE7FA', borderColor: '#C8BEF0' },
  arrowOff: { opacity: 0.3 },
  arrowText: { color: '#C0BDE0', fontSize: 14 },
  arrowTextActive: { color: '#5E48B8' },
  alignBtn: {
    backgroundColor: '#F0EDF8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E4E0F5',
  },
  alignBtnActive: { backgroundColor: '#EAE7FA', borderColor: '#C8BEF0' },
  alignBtnText: { color: '#9891C0', fontSize: 12, fontWeight: '600' },
  alignBtnTextActive: { color: '#5E48B8' },

  // Export bar — light
  exportBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#EDE9FB',
    padding: 14,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 8,
  },
  durationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  durationLabel: { fontSize: 13, fontWeight: '600', color: '#9891C0', marginRight: 2 },
  durationBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#EAE7FA', borderWidth: 1, borderColor: '#D8D4F2',
  },
  durationBtnActive: { backgroundColor: '#7460DC', borderColor: '#7460DC' },
  durationBtnText: { fontSize: 13, fontWeight: '600', color: '#9891C0' },
  durationBtnTextActive: { color: '#fff' },
  progressWrap: {
    height: 6, backgroundColor: '#EAE7FA',
    borderRadius: 3, marginBottom: 10, overflow: 'hidden',
  },
  progressBar: { height: 6, backgroundColor: '#7460DC', borderRadius: 3 },
  progressText: {
    position: 'absolute', right: 0, top: -18,
    color: '#7460DC', fontSize: 11, fontWeight: '700',
  },
  exportBtn: {
    backgroundColor: '#7460DC', borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  exportBtnDisabled: { opacity: 0.45 },
  exportBtnIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

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
// Must match CameraScreen PHOTO_W/PHOTO_H exactly
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
      {/* Preview area */}
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
            borderColor: 'rgba(124,111,247,0.6)',
          }} />
        </View>

        {/* Play/Pause */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => setPlaying(p => !p)}
        >
          <Text style={styles.playBtnText}>{playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Frame counter */}
        <View style={styles.frameCounter}>
          <Text style={styles.frameCounterText}>
            {previewIndex + 1} / {photos.length}
          </Text>
        </View>
      </View>

      {/* Floating header — same y=0 as CameraScreen */}
      <View style={[styles.floatingHeader, { top: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={exporting}>
          <Text style={styles.backBtnText}>‹ 영상 편집</Text>
        </TouchableOpacity>
      </View>

      {/* Photo order list */}
      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <View style={[
            styles.photoRow,
            index === previewIndex && styles.photoRowActive,
          ]}>
            <TouchableOpacity onPress={() => { setPreviewIndex(index); setPlaying(false); }}>
              <Image source={{ uri: item.uri }} style={styles.rowThumb} />
            </TouchableOpacity>
            <Text style={styles.rowNum}>{index + 1}</Text>
            <View style={styles.rowArrows}>
              <TouchableOpacity
                style={[styles.arrowBtn, index === 0 && styles.arrowOff]}
                onPress={() => moveUp(index)}
                disabled={index === 0}
              >
                <Text style={styles.arrowText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.arrowBtn, index === photos.length - 1 && styles.arrowOff]}
                onPress={() => moveDown(index)}
                disabled={index === photos.length - 1}
              >
                <Text style={styles.arrowText}>↓</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.alignBtn}
              onPress={() => navigation.navigate('AlignPhoto', { tripId, photoId: item.id })}
            >
              <Text style={styles.alignBtnText}>보정</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Export button */}
      <View style={styles.exportBar}>
        {/* Duration picker */}
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

        {/* Progress bar */}
        {exporting && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${Math.round(exportProgress * 100)}%` }]} />
            <Text style={styles.progressText}>{Math.round(exportProgress * 100)}%</Text>
          </View>
        )}

        {/* Export button */}
        <TouchableOpacity
          style={[styles.exportBtn, (exporting || photos.length === 0) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting || photos.length === 0}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? '인코딩 중...' : '영상으로 내보내기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  previewWrap: {
    width: PHOTO_W,
    height: PHOTO_H,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  playBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnText: { color: '#fff', fontSize: 16 },
  frameCounter: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  frameCounterText: { color: '#fff', fontSize: 12 },
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
  list: { flex: 1 },
  photoRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 8,
    padding: 8, borderRadius: 12,
    backgroundColor: '#161625',
  },
  photoRowActive: {
    borderWidth: 1.5, borderColor: '#7c6ff7',
  },
  rowThumb: {
    width: 52, height: 52, borderRadius: 8,
  },
  rowNum: {
    color: '#666', fontSize: 14, fontWeight: '600', width: 20,
  },
  rowArrows: { flexDirection: 'column', gap: 4 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#252540',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowOff: { opacity: 0.25 },
  arrowText: { color: '#fff', fontSize: 14 },
  alignBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#252540', borderRadius: 10,
  },
  alignBtnText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  exportBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1, borderTopColor: '#252540',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  durationLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  durationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#252540',
  },
  durationBtnActive: {
    backgroundColor: '#7c6ff7',
  },
  durationBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  durationBtnTextActive: {
    color: '#fff',
  },
  progressWrap: {
    height: 6,
    backgroundColor: '#252540',
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#7c6ff7',
    borderRadius: 3,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: -18,
    color: '#7c6ff7',
    fontSize: 11,
    fontWeight: '700',
  },
  exportBtnDisabled: {
    opacity: 0.45,
  },
  exportBtn: {
    backgroundColor: '#7c6ff7',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

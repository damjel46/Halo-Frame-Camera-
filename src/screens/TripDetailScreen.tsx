import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Dimensions, Alert, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Trip, TripPhoto } from '../types';
import { deletePhoto, getPhotos, getTrip } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TripDetail'>;

const SCREEN = Dimensions.get('window');
const THUMB = (SCREEN.width - 48) / 3;

export default function TripDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<TripPhoto | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => {
    getTrip(tripId).then(t => { setTrip(t); });
    getPhotos(tripId).then(setPhotos);
  }, [tripId]));

  function handleDeletePhoto(photo: TripPhoto) {
    Alert.alert('사진 삭제', '이 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deletePhoto(tripId, photo.id);
          setPhotos(prev => prev.filter(p => p.id !== photo.id));
          if (previewPhoto?.id === photo.id) setPreviewPhoto(null);
        },
      },
    ]);
  }

  if (!trip) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom nav header */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{trip.name}</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <View style={styles.dotsRow}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Circle guide info bar */}
      <View style={styles.infoBar}>
        <View style={styles.circleDotWrap}>
          <View style={styles.circleDot} />
        </View>
        <Text style={styles.infoText}>
          원 위치: ({Math.round(trip.circle.xRatio * 100)}%,{' '}
          {Math.round(trip.circle.yRatio * 100)}%) · 크기: {Math.round(trip.circle.radiusRatio * 100)}%
        </Text>
        <TouchableOpacity style={styles.editChip} onPress={() => navigation.navigate('Camera', { tripId, mode: 'setup' })}>
          <Text style={styles.editChipText}>수정</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={photos.length === 0 ? styles.emptyWrap : [styles.grid, { paddingBottom: 110 + insets.bottom }]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 사진이 없어요</Text>
            <Text style={styles.emptyHint}>
              카메라 버튼을 눌러{'\n'}원형 물체를 찍어주세요
            </Text>
          </View>
        }
        ListFooterComponent={
          photos.length > 0
            ? (
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>사진 {photos.length}장 · 꾹 눌러 삭제</Text>
              </View>
            )
            : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.thumb}
            onPress={() => setPreviewPhoto(item)}
            onLongPress={() => handleDeletePhoto(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbImage} />
            <View style={styles.thumbBadge} />
          </TouchableOpacity>
        )}
      />

      {/* Bottom action bar — inset으로 nav bar 위에 위치 */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => navigation.navigate('Camera', { tripId, mode: 'shoot' })}
        >
          {/* Camera icon in SVG-style using View */}
          <View style={styles.camIconOuter}>
            <View style={styles.camIconInner} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.videoBtn, photos.length < 2 && styles.videoBtnOff]}
          onPress={() => {
            if (photos.length < 2) {
              Alert.alert('사진이 더 필요해요', '최소 2장 이상 찍어주세요.');
              return;
            }
            navigation.navigate('VideoEdit', { tripId });
          }}
        >
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.videoBtnText}>영상 만들기</Text>
        </TouchableOpacity>
      </View>

      {/* Photo preview modal */}
      <Modal
        visible={!!previewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewPhoto(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {previewPhoto && (
            <>
              <Image
                source={{ uri: previewPhoto.uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalAlignBtn}
                  onPress={() => {
                    setPreviewPhoto(null);
                    navigation.navigate('AlignPhoto', { tripId, photoId: previewPhoto.id });
                  }}
                >
                  <Text style={styles.modalAlignBtnText}>위치 보정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeletePhoto(previewPhoto)}
                >
                  <Text style={styles.modalDeleteBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FC' },

  // Nav header
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    flexShrink: 0,
  },
  iconBtnChevron: { fontSize: 22, color: '#7460DC', lineHeight: 26, marginLeft: -2 },
  navTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1A1430', letterSpacing: -0.5 },
  dotsRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9891C0' },

  // Info bar
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#E8E5F5',
  },
  circleDotWrap: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#7460DC',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  circleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#7460DC' },
  infoText: { flex: 1, fontSize: 12, color: '#9891C0', fontWeight: '500' },
  editChip: {
    backgroundColor: '#EAE7FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  editChipText: { fontSize: 11, fontWeight: '600', color: '#5E48B8' },

  // Photo grid
  grid: { paddingHorizontal: 16 },
  emptyWrap: { flex: 1 },
  row: { gap: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, color: '#1A1430', fontWeight: '600', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9891C0', textAlign: 'center' },
  thumb: {
    width: THUMB, height: THUMB,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#EAE7FA', marginBottom: 6,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#7460DC',
    backgroundColor: 'rgba(116,96,220,0.1)',
  },

  countChip: {
    alignSelf: 'center', marginTop: 6,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E8E5F5',
  },
  countChipText: { fontSize: 12, fontWeight: '600', color: '#9891C0' },

  // Action bar
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#EDE9FB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, gap: 12,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 8,
  },
  cameraBtn: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#EAE7FA',
    borderWidth: 1.5, borderColor: '#C8BEF0',
    alignItems: 'center', justifyContent: 'center',
  },
  camIconOuter: {
    width: 22, height: 18, borderRadius: 5,
    borderWidth: 1.8, borderColor: '#5E48B8',
    alignItems: 'center', justifyContent: 'center',
  },
  camIconInner: {
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.8, borderColor: '#5E48B8',
  },
  videoBtn: {
    flex: 1, height: 56, borderRadius: 18,
    backgroundColor: '#7460DC',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  videoBtnOff: { opacity: 0.4 },
  playIcon: { color: '#fff', fontSize: 14 },
  videoBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  modalCloseText: { color: '#fff', fontSize: 18 },
  modalImage: { width: SCREEN.width, height: SCREEN.height * 0.7 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: 24 },
  modalAlignBtn: {
    flex: 1, paddingVertical: 14, backgroundColor: '#7460DC',
    borderRadius: 14, alignItems: 'center',
  },
  modalAlignBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalDeleteBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: '#2a1a1a', borderRadius: 14,
    borderWidth: 1, borderColor: '#5a2020', alignItems: 'center',
  },
  modalDeleteBtnText: { color: '#e05555', fontWeight: '600', fontSize: 15 },
});

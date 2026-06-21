import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Dimensions, Alert, Modal,
} from 'react-native';
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

  useFocusEffect(useCallback(() => {
    getTrip(tripId).then(t => {
      setTrip(t);
      if (t) navigation.setOptions({ title: t.name });
    });
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
    <View style={styles.container}>
      {/* Circle guide info bar */}
      <View style={styles.infoBar}>
        <View style={styles.circleDot} />
        <Text style={styles.infoText}>
          원 위치: ({Math.round(trip.circle.xRatio * 100)}%,{' '}
          {Math.round(trip.circle.yRatio * 100)}%) · 크기: {Math.round(trip.circle.radiusRatio * 100)}%
        </Text>
      </View>

      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={photos.length === 0 ? styles.emptyWrap : styles.grid}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 사진이 없어요</Text>
            <Text style={styles.emptyHint}>
              카메라 버튼을 눌러{'\n'}원형 물체를 찍어주세요
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.thumb}
            onPress={() => setPreviewPhoto(item)}
            onLongPress={() => handleDeletePhoto(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbImage} />
            {/* Small circle badge in corner — full overlay would be misaligned due to aspect ratio diff */}
            <View style={styles.thumbBadge} />
          </TouchableOpacity>
        )}
      />

      {/* Bottom action buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => navigation.navigate('Camera', { tripId, mode: 'shoot' })}
        >
          <Text style={styles.cameraBtnText}>📷</Text>
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
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewPhoto(null)}
          >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#161625',
    borderBottomWidth: 1, borderBottomColor: '#252540',
  },
  circleDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#7c6ff7',
  },
  infoText: { color: '#666', fontSize: 12 },
  grid: { padding: 12, paddingBottom: 110 },
  emptyWrap: { flex: 1 },
  row: { gap: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#666', textAlign: 'center' },
  thumb: {
    width: THUMB, height: THUMB,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#161625',
    marginBottom: 6,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: 'rgba(124,111,247,0.9)',
    backgroundColor: 'rgba(124,111,247,0.2)',
  },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 90,
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1, borderTopColor: '#252540',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  cameraBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#161625',
    borderWidth: 1, borderColor: '#252540',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnText: { fontSize: 22 },
  videoBtn: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: '#7c6ff7',
    alignItems: 'center', justifyContent: 'center',
  },
  videoBtnOff: { opacity: 0.4 },
  videoBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: { color: '#fff', fontSize: 18 },
  modalImage: {
    width: SCREEN.width,
    height: SCREEN.height * 0.7,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  modalAlignBtn: {
    flex: 1, paddingVertical: 14,
    backgroundColor: '#7c6ff7',
    borderRadius: 14,
    alignItems: 'center',
  },
  modalAlignBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalDeleteBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: '#2a1a1a',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#5a2020',
    alignItems: 'center',
  },
  modalDeleteBtnText: { color: '#e05555', fontWeight: '600', fontSize: 15 },
});

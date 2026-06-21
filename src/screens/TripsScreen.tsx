import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Trip } from '../types';
import { deleteTrip, getTrips } from '../utils/storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Trips'>;

export default function TripsScreen() {
  const navigation = useNavigation<Nav>();
  const [trips, setTrips] = useState<Trip[]>([]);

  useFocusEffect(useCallback(() => {
    getTrips().then(setTrips);
  }, []));

  function handleDelete(trip: Trip) {
    Alert.alert('여행 삭제', `"${trip.name}" 여행과 모든 사진을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deleteTrip(trip.id);
          setTrips(prev => prev.filter(t => t.id !== trip.id));
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        contentContainerStyle={trips.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 여행이 없어요</Text>
            <Text style={styles.emptyHint}>+ 버튼을 눌러 첫 여행을 만들어보세요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardInner}>
              <View style={styles.circlePreview}>
                <View style={styles.circleRing} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                </Text>
                <Text style={styles.cardAlbum}>{item.albumName}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTrip')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  list: { padding: 16, paddingBottom: 100 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 140 },
  emptyTitle: { fontSize: 20, color: '#fff', fontWeight: '700', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#666' },
  card: {
    backgroundColor: '#161625',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252540',
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circlePreview: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  circleRing: {
    width: 44, height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#7c6ff7',
    opacity: 0.7,
  },
  cardText: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  cardAlbum: { fontSize: 12, color: '#7c6ff7' },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c6ff7',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#7c6ff7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

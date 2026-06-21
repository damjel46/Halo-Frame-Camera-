import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, Image, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Trip } from '../types';
import { deleteTrip, getTrips } from '../utils/storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Trips'>;

// Cycle: lavender → peach → mint
const ICON_PALETTES = [
  { bg: '#EAE7FA', ring: '#7460DC', dot: '#7460DC', chipBg: '#EAE7FA', chipText: '#5E48B8' },
  { bg: '#FBF0E4', ring: '#C29050', dot: '#C29050', chipBg: '#FBF0E4', chipText: '#8A5E2A' },
  { bg: '#E4F7F0', ring: '#4EAF88', dot: '#4EAF88', chipBg: '#E4F7F0', chipText: '#2A8A65' },
];

export default function TripsScreen() {
  const navigation = useNavigation<Nav>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

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

  const filtered = query.trim()
    ? trips.filter(t => t.name.includes(query.trim()))
    : trips;

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom nav header */}
      <View style={styles.navRow}>
        <View style={styles.navLeft}>
          <Image source={require('../../assets/halo-icon.png')} style={styles.navIcon} />
          <View>
            <Text style={styles.navTitle}>여행</Text>
            <Text style={styles.navSub}>Halo · 내 원형 추억</Text>
          </View>
        </View>
        <View style={styles.navAvatar}>
          {/* Circle avatar icon */}
          <View style={styles.avatarRing} />
          <View style={styles.avatarDot} />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="여행 검색..."
          placeholderTextColor="#C0BDE0"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyWrap : [styles.list, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 여행이 없어요</Text>
            <Text style={styles.emptyHint}>+ 버튼을 눌러 첫 여행을 만들어보세요</Text>
          </View>
        }
        ListFooterComponent={
          filtered.length > 0
            ? <Text style={styles.deleteHint}>꾹 눌러 여행 삭제</Text>
            : null
        }
        renderItem={({ item, index }) => {
          const palette = ICON_PALETTES[index % 3];
          const dateStr = new Date(item.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
          });
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              {/* Colorful circle icon */}
              <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                <View style={[styles.iconRing, { borderColor: palette.ring }]}>
                  <View style={[styles.iconDot, { backgroundColor: palette.dot }]} />
                </View>
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardDate}>{dateStr}</Text>
                <View style={[styles.albumChip, { backgroundColor: palette.chipBg }]}>
                  <Text style={[styles.albumChipText, { color: palette.chipText }]}>
                    {item.albumName}
                  </Text>
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 40 + insets.bottom }]}
        onPress={() => navigation.navigate('CreateTrip')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FC' },

  // Nav header
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 48, height: 48, borderRadius: 12 },
  navTitle: { fontSize: 22, fontWeight: '800', color: '#1A1430', letterSpacing: -0.5 },
  navSub: { fontSize: 13, color: '#9891C0', marginTop: 1 },
  navAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7460DC',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#fff', opacity: 0.9,
  },
  avatarDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff',
  },

  // Search bar
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 24, marginTop: 8, marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E8E5F5',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchIcon: { fontSize: 18, color: '#C0BDE0' },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1430', padding: 0 },

  list: { paddingHorizontal: 24 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 140 },
  emptyTitle: { fontSize: 20, color: '#1A1430', fontWeight: '700', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9891C0' },

  deleteHint: {
    textAlign: 'center', fontSize: 12, color: '#C0BDE0', paddingVertical: 8,
  },

  // Trip cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 22, padding: 20,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE9FB',
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconRing: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  iconDot: { width: 6, height: 6, borderRadius: 3 },
  cardText: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1430', marginBottom: 3 },
  cardDate: { fontSize: 12, color: '#9891C0', marginBottom: 4 },
  albumChip: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  albumChipText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#C0BDE0', fontWeight: '300' },

  // FAB
  fab: {
    position: 'absolute', right: 28,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#7460DC',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

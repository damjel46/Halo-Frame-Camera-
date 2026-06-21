import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { saveTrip } from '../utils/storage';
import { requestMediaPermissions } from '../utils/mediaLibrary';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTrip'>;

export default function CreateTripScreen() {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleNext() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('여행 이름을 입력해주세요'); return; }

    setLoading(true);
    const granted = await requestMediaPermissions();
    if (!granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 권한을 허용해주세요.');
      setLoading(false);
      return;
    }

    const tripId = Date.now().toString();
    await saveTrip({
      id: tripId,
      name: trimmed,
      albumName: `Halo · ${trimmed}`,
      createdAt: new Date().toISOString(),
      circle: { xRatio: 0.5, yRatio: 0.45, radiusRatio: 0.28 },
    });
    setLoading(false);
    navigation.replace('Camera', { tripId, mode: 'setup' });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Decorative blobs */}
      <View style={styles.blobTopRight} pointerEvents="none" />
      <View style={styles.blobTopLeft} pointerEvents="none" />

      {/*
        KeyboardAvoidingView는 SafeAreaView 안에 두고 flex:1.
        behavior="padding" — 안드로이드·iOS 모두 동작.
        keyboardVerticalOffset: 안드로이드는 0, iOS는 상단 inset만큼.
      */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* Back button — KeyboardAvoidingView 바깥쪽으로 빼서 키보드에 밀리지 않게 */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.backLabel}>여행</Text>
        </View>

        {/* ScrollView: 콘텐츠가 키보드 위로 스크롤되도록 */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(32, insets.bottom) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>새 여행</Text>
          <Text style={styles.subtitle}>
            이름을 입력하고{'\n'}원형 물체를 찍어 가이드를 설정할게요
          </Text>

          <View style={[styles.inputCard, name.trim() && styles.inputCardActive]}>
            <Text style={styles.inputLabel}>여행 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="제주도 2026 여름"
              placeholderTextColor="#C0BDE0"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
              maxLength={30}
            />
          </View>

          <View style={styles.albumRow}>
            <Text style={styles.albumIcon}>🗂</Text>
            <Text style={styles.albumHint}>
              앨범명: {name.trim() ? `Halo · ${name.trim()}` : '—'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonOff]}
            onPress={handleNext}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.buttonText}>{loading ? '준비 중...' : '촬영'}</Text>
            {!loading && <Text style={styles.buttonArrow}>→</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F3FC' },
  flex: { flex: 1 },

  blobTopRight: {
    position: 'absolute', top: 80, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#FBE8CF', opacity: 0.35,
  },
  blobTopLeft: {
    position: 'absolute', top: 160, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#C8BEF0', opacity: 0.25,
  },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  backChevron: { fontSize: 22, color: '#7460DC', lineHeight: 26, marginLeft: -1 },
  backLabel: { fontSize: 15, fontWeight: '600', color: '#7460DC' },

  scrollContent: {
    paddingHorizontal: 28, paddingTop: 40,
  },
  title: {
    fontSize: 34, fontWeight: '800', color: '#1A1430',
    letterSpacing: -1.5, lineHeight: 40, marginBottom: 12,
  },
  subtitle: { fontSize: 15, color: '#9891C0', lineHeight: 24, marginBottom: 44 },

  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 16,
    borderWidth: 2, borderColor: '#E8E5F5',
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
    marginBottom: 10,
  },
  inputCardActive: { borderColor: '#7460DC' },
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: '#7460DC',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2,
  },
  input: { fontSize: 17, color: '#1A1430', fontWeight: '500', padding: 0 },

  albumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 52, paddingHorizontal: 4,
  },
  albumIcon: { fontSize: 14 },
  albumHint: { fontSize: 13, color: '#7460DC', fontWeight: '500' },

  button: {
    backgroundColor: '#7460DC',
    borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#7460DC', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  buttonOff: { opacity: 0.35 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

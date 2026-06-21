import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
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

    // Create trip skeleton — circle will be set on CircleSetupScreen
    const tripId = Date.now().toString();
    const trip = {
      id: tripId,
      name: trimmed,
      albumName: `Halo · ${trimmed}`,
      createdAt: new Date().toISOString(),
      // Placeholder circle — will be replaced after CircleSetup
      circle: { xRatio: 0.5, yRatio: 0.45, radiusRatio: 0.28 },
    };
    await saveTrip(trip);
    setLoading(false);

    // Go to camera to take the reference photo for circle setup
    navigation.replace('Camera', { tripId, mode: 'setup' });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>새 여행</Text>
        <Text style={styles.subtitle}>
          이름을 입력하고{'\n'}원형 물체를 찍어 가이드를 설정할게요
        </Text>

        <TextInput
          style={styles.input}
          placeholder="예: 제주도 2026 여름"
          placeholderTextColor="#444"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
          maxLength={30}
        />

        <Text style={styles.albumHint}>앨범명: {name.trim() ? `Halo · ${name.trim()}` : '—'}</Text>

        <TouchableOpacity
          style={[styles.button, (!name.trim() || loading) && styles.buttonOff]}
          onPress={handleNext}
          disabled={!name.trim() || loading}
        >
          <Text style={styles.buttonText}>{loading ? '준비 중...' : '다음 → 원형 물체 촬영'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  inner: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 34, fontWeight: '800', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 40 },
  input: {
    backgroundColor: '#161625',
    borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 17, color: '#fff',
    borderWidth: 1, borderColor: '#252540',
    marginBottom: 10,
  },
  albumHint: { fontSize: 13, color: '#7c6ff7', marginBottom: 48 },
  button: {
    backgroundColor: '#7c6ff7',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  buttonOff: { opacity: 0.35 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

import { RootStackParamList } from './src/types';
import TripsScreen from './src/screens/TripsScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import CameraScreen from './src/screens/CameraScreen';
import CircleSetupScreen from './src/screens/CircleSetupScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import AlignScreen from './src/screens/AlignScreen';
import VideoEditScreen from './src/screens/VideoEditScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      await requestCameraPermission();
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Trips"
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F3FC' } }}
        >
          <Stack.Screen name="Trips" component={TripsScreen} />
          <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen
            name="CircleSetup"
            component={CircleSetupScreen}
            options={{
              headerShown: true,
              title: '가이드 설정',
              headerStyle: { backgroundColor: '#F5F3FC' },
              headerTintColor: '#1A1430',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="AlignPhoto" component={AlignScreen} />
          <Stack.Screen name="VideoEdit" component={VideoEditScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

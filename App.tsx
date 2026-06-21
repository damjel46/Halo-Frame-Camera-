import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

import { RootStackParamList } from './src/types';
import TripsScreen from './src/screens/TripsScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import CameraScreen from './src/screens/CameraScreen';
import CircleSetupScreen from './src/screens/CircleSetupScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import AlignScreen from './src/screens/AlignScreen';
import VideoEditScreen from './src/screens/VideoEditScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NAV_THEME = {
  headerStyle: { backgroundColor: '#0d0d1a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: '#0d0d1a' },
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Trips" screenOptions={NAV_THEME}>
          <Stack.Screen name="Trips" component={TripsScreen} options={{ title: 'Halo' }} />
          <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ title: '새 여행', presentation: 'modal' }} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CircleSetup" component={CircleSetupScreen} options={{ title: '가이드 설정' }} />
          <Stack.Screen
            name="TripDetail"
            component={TripDetailScreen}
            options={({ route }) => ({ title: route.params.tripId })}
          />
          <Stack.Screen name="AlignPhoto" component={AlignScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VideoEdit" component={VideoEditScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

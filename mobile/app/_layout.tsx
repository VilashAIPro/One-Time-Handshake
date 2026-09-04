/**
 * Expo Router Navigation — _layout.tsx (Root)
 * File-based routing for all 20 screens
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = Font.useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="register" />
          <Stack.Screen name="login" />
          <Stack.Screen name="biometric-login" />
          <Stack.Screen name="qr-login" />
          <Stack.Screen name="scan-qr" />
          <Stack.Screen name="success" />
          <Stack.Screen name="failed" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="security-center" />
          <Stack.Screen name="trusted-devices" />
          <Stack.Screen name="history" />
          <Stack.Screen name="offline-mode" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="emergency-qr" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="about" />
          <Stack.Screen name="device-binding" />
          <Stack.Screen name="ai-assistant" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

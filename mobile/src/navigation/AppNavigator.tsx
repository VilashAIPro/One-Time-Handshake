// mobile/src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Screen imports
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { BiometricLoginScreen } from '../screens/BiometricLoginScreen';
import { QRLoginScreen } from '../screens/QRLoginScreen';
import { ScanQRScreen } from '../screens/ScanQRScreen';
import { HandshakeSuccessScreen } from '../screens/HandshakeSuccessScreen';
import { HandshakeFailedScreen } from '../screens/HandshakeFailedScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SecurityCenterScreen } from '../screens/SecurityCenterScreen';
import { TrustedDevicesScreen } from '../screens/TrustedDevicesScreen';
import { AuthHistoryScreen } from '../screens/AuthHistoryScreen';
import { OfflineModeScreen } from '../screens/OfflineModeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { EmergencyQRScreen } from '../screens/EmergencyQRScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { AIAssistantScreen } from '../screens/AIAssistantScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Register: undefined;
  Login: undefined;
  BiometricLogin: undefined;
  QRLogin: undefined;
  ScanQR: undefined;
  HandshakeSuccess: { deviceFingerprint: string; timestamp: number; verified: boolean };
  HandshakeFailed: { reason: string };
  Dashboard: undefined;
  SecurityCenter: undefined;
  TrustedDevices: undefined;
  AuthHistory: undefined;
  OfflineMode: undefined;
  Notifications: undefined;
  EmergencyQR: undefined;
  Profile: undefined;
  Settings: undefined;
  Help: undefined;
  About: undefined;
  AIAssistant: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="BiometricLogin" component={BiometricLoginScreen} />
        <Stack.Screen name="QRLogin" component={QRLoginScreen} />
        <Stack.Screen name="ScanQR" component={ScanQRScreen} />
        <Stack.Screen name="HandshakeSuccess" component={HandshakeSuccessScreen} />
        <Stack.Screen name="HandshakeFailed" component={HandshakeFailedScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="SecurityCenter" component={SecurityCenterScreen} />
        <Stack.Screen name="TrustedDevices" component={TrustedDevicesScreen} />
        <Stack.Screen name="AuthHistory" component={AuthHistoryScreen} />
        <Stack.Screen name="OfflineMode" component={OfflineModeScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="EmergencyQR" component={EmergencyQRScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

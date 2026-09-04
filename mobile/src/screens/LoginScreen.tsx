/**
 * Screen 4: Login
 * OTH Handshake login with biometric + fallback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, StatusBar, Animated, ActivityIndicator, Platform
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient } from '../api/client';
import { OTHEngine } from '../crypto/OTHEngine';

type AuthMode = 'handshake' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated, setDeviceId, deviceId: storedDeviceId, user: storedUser } = useAuthStore();

  const [phone, setPhone] = useState(storedUser?.phone || '');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('handshake');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkBiometric();
    startPulseAnimation();
  }, []);

  const checkBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(compatible && enrolled);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleOTHHandshake = async () => {
    if (!phone) {
      Alert.alert('Phone Required', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = storedDeviceId ||
        Application.androidId ||
        `${Platform.OS}-${Device.modelName?.replace(/\s/g, '_')}`;

      setLoadingStep('Collecting device fingerprint...');
      const deviceInfo = {
        deviceId,
        platform: Platform.OS,
        osVersion: `${Platform.OS} ${Device.osVersion}`,
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        brand: Device.brand,
        model: Device.modelName,
      };

      // Get user UID from phone
      setLoadingStep('Looking up account...');
      const userResp = await OTHApiClient.get(`/auth/lookup?phone=${encodeURIComponent(phone)}`);
      const uid = userResp.data.uid;

      // Generate handshake on device
      setLoadingStep('Generating cryptographic handshake...');
      const { handshakeToken, handshakeId } = await OTHEngine.generateHandshake(uid, phone, deviceInfo);

      // Verify with server
      setLoadingStep('Verifying with server...');
      const verifyResp = await OTHApiClient.post('/handshake/verify', {
        handshakeToken,
        uid,
        deviceId,
      });

      const { accessToken, refreshToken } = verifyResp.data;

      // Get user profile
      setLoadingStep('Loading profile...');
      const profileResp = await OTHApiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setAuthenticated(profileResp.data.user, accessToken, refreshToken, 'handshake');
      setDeviceId(deviceId);

      router.replace('/dashboard');
    } catch (err: unknown) {
      const errMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (errMessage?.includes('DEVICE_NOT_BOUND')) {
        Alert.alert(
          'Device Not Bound',
          'This device is not registered. Would you like to bind it now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Bind Device', onPress: () => router.push('/device-binding') },
          ]
        );
      } else {
        Alert.alert('Authentication Failed', errMessage || 'OTH handshake failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handlePasswordLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Required', 'Please enter phone and password');
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = storedDeviceId || Application.androidId || 'unknown';
      const resp = await OTHApiClient.post('/auth/login', { phone, password, deviceId });
      const { accessToken, refreshToken } = resp.data;

      const profileResp = await OTHApiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setAuthenticated(profileResp.data.user, accessToken, refreshToken, 'handshake');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const errResp = (err as { response?: { data?: { error?: string; attemptsRemaining?: number } } })?.response?.data;
      Alert.alert('Login Failed', `${errResp?.error || 'Invalid credentials'}${errResp?.attemptsRemaining ? ` (${errResp.attemptsRemaining} attempts remaining)` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate with OTH',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Handshake',
    });

    if (result.success) {
      handleOTHHandshake();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🔐</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Authenticate without OTP</Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        {(['handshake', 'password'] as AuthMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeTab, authMode === mode && styles.modeTabActive]}
            onPress={() => setAuthMode(mode)}
          >
            <Text style={[styles.modeTabText, authMode === mode && styles.modeTabTextActive]}>
              {mode === 'handshake' ? '⚡ OTH Handshake' : '🔑 Password Fallback'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputIcon}>📱</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {authMode === 'password' && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        )}

        {/* Loading Steps */}
        {isLoading && loadingStep ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadingStep}>{loadingStep}</Text>
          </View>
        ) : null}

        {/* Main CTA */}
        <TouchableOpacity
          onPress={authMode === 'handshake' ? handleOTHHandshake : handlePasswordLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            style={[styles.authButton, isLoading && { opacity: 0.7 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {authMode === 'handshake' ? '⚡ Authenticate with OTH' : '🔑 Sign In with Password'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Biometric */}
        {isBiometricAvailable && authMode === 'handshake' && (
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
            <Text style={styles.biometricText}>🪪 Use Biometric + OTH</Text>
          </TouchableOpacity>
        )}

        {/* QR Login */}
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => router.push('/qr-login')}
        >
          <Text style={styles.qrButtonText}>📷 Login via QR Code</Text>
        </TouchableOpacity>

        {/* Links */}
        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/offline-mode')}>
            <Text style={styles.linkText}>📡 Offline Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/emergency-qr')}>
            <Text style={styles.linkText}>🆘 Emergency Access</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
          <Text style={styles.registerLinkText}>
            New to OTH? <Text style={{ color: Colors.primary }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityText}>🔒 AES-256 · HMAC-SHA256 · Zero OTP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24 },
  logoContainer: { marginBottom: 16 },
  logoBadge: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: 32, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontFamily: Typography.fontFamily.regular },
  modeToggle: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, marginBottom: 24 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.sm, alignItems: 'center' },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { color: Colors.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.medium },
  modeTabTextActive: { color: '#fff' },
  form: { paddingHorizontal: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 16, paddingVertical: 16, fontFamily: Typography.fontFamily.regular },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 16 },
  loadingStep: { color: Colors.primary, fontSize: 13, fontFamily: Typography.fontFamily.medium },
  authButton: { borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  authButtonText: { color: '#fff', fontSize: 17, fontFamily: Typography.fontFamily.semiBold },
  biometricButton: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  biometricText: { color: Colors.textSecondary, fontSize: 15, fontFamily: Typography.fontFamily.medium },
  qrButton: { backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.glassBorder },
  qrButtonText: { color: Colors.textSecondary, fontSize: 15 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  linkText: { color: Colors.primary, fontSize: 14 },
  registerLink: { alignItems: 'center' },
  registerLinkText: { color: Colors.textSecondary, fontSize: 14 },
  securityBadge: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' },
  securityText: { color: Colors.textMuted, fontSize: 12 },
});

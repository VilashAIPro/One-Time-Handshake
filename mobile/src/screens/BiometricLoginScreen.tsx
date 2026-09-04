/**
 * Screen 5: Biometric Login
 * Face ID / Fingerprint authentication with OTH handshake
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Alert, Platform
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient } from '../api/client';
import { OTHEngine } from '../crypto/OTHEngine';

export default function BiometricLoginScreen() {
  const router = useRouter();
  const { user, deviceId: storedDeviceId, setAuthenticated, setDeviceId } = useAuthStore();
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'none'>('none');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    detectBiometricType();
    startIdleAnimation();
  }, []);

  const detectBiometricType = async () => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('face');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometricType('fingerprint');
    }
  };

  const startIdleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const startScanningAnimation = () => {
    Animated.loop(
      Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true })
    ).start();
  };

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    setStatus('scanning');
    startScanningAnimation();

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with OTH',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Handshake',
      });

      if (!result.success) {
        setStatus('failed');
        setTimeout(() => setStatus('idle'), 2000);
        setIsAuthenticating(false);
        return;
      }

      // Biometric passed — now do OTH handshake
      const deviceId = storedDeviceId || Application.androidId || `${Platform.OS}-device`;
      const deviceInfo = await OTHEngine.getDeviceInfo();

      const userResp = await OTHApiClient.get(`/auth/lookup?phone=${user?.phone}`);
      const uid = userResp.data.uid;

      const { handshakeToken } = await OTHEngine.generateHandshake(uid, user!.phone, deviceInfo);

      const verifyResp = await OTHApiClient.post('/handshake/verify', {
        handshakeToken,
        uid,
        deviceId,
      });

      const { accessToken, refreshToken } = verifyResp.data;

      const profileResp = await OTHApiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setAuthenticated(profileResp.data.user, accessToken, refreshToken, 'handshake');
      setStatus('success');
      setTimeout(() => router.replace('/dashboard'), 1200);
    } catch {
      setStatus('failed');
      Alert.alert('Authentication Failed', 'Biometric + OTH handshake failed. Try manual login.');
      setTimeout(() => setStatus('idle'), 2000);
    }

    setIsAuthenticating(false);
  };

  const statusColor = status === 'success' ? Colors.success
    : status === 'failed' ? Colors.error
    : status === 'scanning' ? Colors.primary
    : Colors.primary;

  const biometricIcon = biometricType === 'face' ? '🪪' : '👆';
  const biometricLabel = biometricType === 'face' ? 'Face Recognition' : 'Fingerprint';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Biometric Login</Text>
        <Text style={styles.subtitle}>{biometricLabel} + OTH Handshake</Text>
      </View>

      {/* Biometric Circle */}
      <View style={styles.biometricSection}>
        {/* Outer glow rings */}
        <Animated.View style={[styles.ring3, { borderColor: statusColor + '15', transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.ring2, { borderColor: statusColor + '30', transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.ring1, { borderColor: statusColor + '60', transform: [{ scale: pulseAnim }] }]} />

        {/* Main button */}
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricAuth}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              status === 'success' ? [Colors.success, '#15803D']
              : status === 'failed' ? [Colors.error, '#991B1B']
              : [Colors.primary, Colors.primaryDark]
            }
            style={styles.biometricGradient}
          >
            <Text style={styles.biometricIcon}>
              {status === 'success' ? '✓' : status === 'failed' ? '✕' : biometricIcon}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {status === 'idle' && `Tap to authenticate with ${biometricLabel}`}
          {status === 'scanning' && '🔄 Verifying biometric + OTH handshake...'}
          {status === 'success' && '✅ Authentication successful!'}
          {status === 'failed' && '❌ Authentication failed'}
        </Text>

        {user?.phone && (
          <View style={styles.userChip}>
            <Text style={styles.userChipIcon}>📱</Text>
            <Text style={styles.userChipText}>{user.phone}</Text>
          </View>
        )}
      </View>

      {/* Security info */}
      <View style={styles.securityInfo}>
        {[
          { icon: '🔐', text: `${biometricLabel} protected by Android Keystore` },
          { icon: '⚡', text: 'OTH Handshake verifies server-side' },
          { icon: '🛡️', text: 'No biometric data leaves your device' },
        ].map((item) => (
          <View key={item.text} style={styles.secInfoRow}>
            <Text style={styles.secInfoIcon}>{item.icon}</Text>
            <Text style={styles.secInfoText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Fallback */}
      <TouchableOpacity style={styles.fallback} onPress={() => router.push('/login')}>
        <Text style={styles.fallbackText}>Use OTH Handshake instead →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 64, paddingHorizontal: 24, alignItems: 'center', marginBottom: 16 },
  backBtn: { position: 'absolute', top: 64, left: 24 },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { fontSize: 26, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  biometricSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring3: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 1 },
  ring2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1.5 },
  ring1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2 },
  biometricButton: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden' },
  biometricGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  biometricIcon: { fontSize: 52 },
  statusSection: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 32 },
  statusText: { fontSize: 15, fontFamily: Typography.fontFamily.medium, textAlign: 'center', marginBottom: 12 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  userChipIcon: { fontSize: 16 },
  userChipText: { color: Colors.textSecondary, fontSize: 14 },
  securityInfo: { marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 24, gap: 10 },
  secInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secInfoIcon: { fontSize: 16 },
  secInfoText: { color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
  fallback: { alignItems: 'center', paddingBottom: 40 },
  fallbackText: { color: Colors.primary, fontSize: 14 },
});

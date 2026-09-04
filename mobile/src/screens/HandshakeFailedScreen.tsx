/**
 * Screen 8: Handshake Failed
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';

export default function HandshakeFailedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ error?: string; code?: string; riskScore?: string }>();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const riskScore = parseInt(params.riskScore || '50');
  const code = params.code || 'HANDSHAKE_FAILED';

  const getThreatExplanation = (): string => {
    switch (code) {
      case 'REPLAY_ATTACK': return '🚨 Replay attack detected. This handshake was already used.';
      case 'TIMESTAMP_MISMATCH': return '⏰ Device clock is out of sync. Check your device time settings.';
      case 'DEVICE_NOT_BOUND': return '📱 This device is not registered. Please bind your device first.';
      case 'FINGERPRINT_MISMATCH': return '⚠️ Device fingerprint has changed. Possible device cloning detected.';
      case 'TOKEN_EXPIRED': return '⏱️ Authentication token expired. Please try again.';
      default: return '🔒 Authentication failed. Please check your credentials and try again.';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#2E0F0F', '#0F172A']} style={StyleSheet.absoluteFill} />

      <Animated.View style={{ transform: [{ translateX: shakeAnim }], opacity: opacityAnim, alignItems: 'center' }}>
        <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.errorCircle}>
          <Text style={styles.errorIcon}>✕</Text>
        </LinearGradient>

        <Text style={styles.title}>Authentication Failed</Text>
        <Text style={styles.subtitle}>{getThreatExplanation()}</Text>

        <View style={styles.errorCard}>
          <View style={styles.errorRow}>
            <Text style={styles.errorLabel}>Error Code</Text>
            <Text style={styles.errorCode}>{code}</Text>
          </View>
          <View style={styles.errorRow}>
            <Text style={styles.errorLabel}>Risk Score</Text>
            <Text style={[styles.errorCode, { color: riskScore >= 80 ? Colors.error : Colors.warning }]}>
              {riskScore}/100
            </Text>
          </View>
        </View>

        {riskScore >= 80 && (
          <View style={styles.threatAlert}>
            <Text style={styles.threatAlertText}>
              🚨 HIGH RISK: Security team has been notified
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.retryButton}>
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.retryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.retryText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/emergency-qr')} style={styles.emergencyButton}>
            <Text style={styles.emergencyText}>🆘 Emergency Access</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/help')} style={styles.helpButton}>
            <Text style={styles.helpText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  errorIcon: { fontSize: 48, color: '#fff', fontWeight: 'bold' },
  title: { fontSize: 26, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 16 },
  errorCard: { width: '100%', backgroundColor: Colors.error + '15', borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: Colors.error + '40', marginBottom: 16, gap: 12 },
  errorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorLabel: { color: Colors.textSecondary, fontSize: 14 },
  errorCode: { color: Colors.error, fontSize: 13, fontFamily: Typography.fontFamily.mono },
  threatAlert: { backgroundColor: Colors.error + '20', borderRadius: BorderRadius.sm, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: Colors.error },
  threatAlertText: { color: Colors.error, fontSize: 13, fontFamily: Typography.fontFamily.semiBold, textAlign: 'center' },
  actions: { width: '100%', gap: 12 },
  retryButton: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  retryGradient: { paddingVertical: 16, alignItems: 'center' },
  retryText: { color: '#fff', fontSize: 16, fontFamily: Typography.fontFamily.semiBold },
  emergencyButton: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emergencyText: { color: Colors.textSecondary, fontSize: 15 },
  helpButton: { alignItems: 'center', paddingVertical: 8 },
  helpText: { color: Colors.primary, fontSize: 14 },
});
